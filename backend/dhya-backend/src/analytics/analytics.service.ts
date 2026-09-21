import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // Helper to format minutes into human readable text
  private formatMinutes(minutes: number): string {
    if (minutes <= 0) return '0m';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  }

  // Calculate Streak based on unique active days (sessions or completed tasks)
  private async calculateStreakInfo() {
    const [sessions, tasks] = await Promise.all([
      this.prisma.focusSession.findMany({
        select: { createdAt: true, startTime: true },
      }),
      this.prisma.task.findMany({
        where: { completed: true },
        select: { updatedAt: true, createdAt: true },
      }),
    ]);

    const activeDatesSet = new Set<string>();

    for (const s of sessions) {
      const d = s.startTime || s.createdAt;
      activeDatesSet.add(new Date(d).toISOString().split('T')[0]);
    }

    for (const t of tasks) {
      const d = t.updatedAt || t.createdAt;
      activeDatesSet.add(new Date(d).toISOString().split('T')[0]);
    }

    const sortedDates = Array.from(activeDatesSet).sort();
    if (sortedDates.length === 0) {
      return { currentStreak: 0, bestStreak: 0 };
    }

    // Best streak calculation
    let maxStreak = 1;
    let currentRun = 1;

    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1]);
      const curr = new Date(sortedDates[i]);
      const diffTime = Math.abs(curr.getTime() - prev.getTime());
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentRun++;
        if (currentRun > maxStreak) {
          maxStreak = currentRun;
        }
      } else if (diffDays > 1) {
        currentRun = 1;
      }
    }

    // Current streak calculation
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const lastActiveStr = sortedDates[sortedDates.length - 1];
    let currentStreak = 0;

    if (lastActiveStr === todayStr || lastActiveStr === yesterdayStr) {
      currentStreak = 1;
      let checkDate = new Date(lastActiveStr);

      for (let i = sortedDates.length - 2; i >= 0; i--) {
        const prevExpected = new Date(checkDate);
        prevExpected.setDate(prevExpected.getDate() - 1);
        const prevExpectedStr = prevExpected.toISOString().split('T')[0];

        if (sortedDates[i] === prevExpectedStr) {
          currentStreak++;
          checkDate = prevExpected;
        } else {
          break;
        }
      }
    }

    return {
      currentStreak,
      bestStreak: Math.max(maxStreak, currentStreak),
    };
  }

  // GET /analytics/dashboard
  async getDashboard() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [
      allTasks,
      allSessions,
      todaySessions,
      todayEvents,
      upcomingReminders,
      overdueTasks,
      streakInfo,
    ] = await Promise.all([
      this.prisma.task.findMany({
        include: {
          category: true,
          subtasks: true,
        },
      }),
      this.prisma.focusSession.findMany(),
      this.prisma.focusSession.findMany({
        where: {
          createdAt: {
            gte: todayStart,
          },
        },
      }),
      this.prisma.event.findMany({
        where: {
          startDateTime: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
        include: {
          category: true,
        },
        orderBy: {
          startDateTime: 'asc',
        },
      }),
      this.prisma.reminder.findMany({
        where: {
          completed: false,
          dismissed: false,
          scheduledAt: {
            gte: todayStart,
          },
        },
        include: {
          task: true,
          event: true,
        },
        orderBy: {
          scheduledAt: 'asc',
        },
        take: 5,
      }),
      this.prisma.task.findMany({
        where: {
          completed: false,
          dueDate: {
            lt: todayStart,
          },
        },
        include: {
          category: true,
        },
      }),
      this.calculateStreakInfo(),
    ]);

    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter((t) => t.completed).length;
    const pendingTasks = allTasks.filter((t) => !t.completed);
    const pendingTasksCount = pendingTasks.length;

    const totalPlannedMinutes = allTasks.reduce((acc, t) => acc + (t.estimatedMinutes || 0), 0);
    const remainingWorkloadMinutes = pendingTasks.reduce((acc, t) => acc + (t.estimatedMinutes || 0), 0);

    const totalFocusedMinutes = allSessions.reduce((acc, s) => acc + (s.actualMinutes || 0), 0);
    const todayFocusedMinutes = todaySessions.reduce((acc, s) => acc + (s.actualMinutes || 0), 0);

    return {
      totalTasks,
      completedTasks,
      pendingTasks: pendingTasksCount,
      totalPlannedMinutes,
      remainingWorkloadMinutes,
      totalFocusedMinutes,
      todayFocusedMinutes,
      todaySessionsCount: todaySessions.length,
      currentStreak: streakInfo.currentStreak,
      bestStreak: streakInfo.bestStreak,
      todayEvents,
      upcomingReminders,
      overdueTasks,
      overdueCount: overdueTasks.length,
    };
  }

  // GET /analytics/history
  async getHistory(range: 'today' | 'week' | 'month' = 'week') {
    const now = new Date();
    let startDate = new Date();

    if (range === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    } else if (range === 'week') {
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (range === 'month') {
      startDate.setDate(now.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    }

    const sessions = await this.prisma.focusSession.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      include: {
        task: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const completedTasks = await this.prisma.task.findMany({
      where: {
        completed: true,
        updatedAt: {
          gte: startDate,
        },
      },
      include: {
        category: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Group by Date string (YYYY-MM-DD)
    const groupedMap = new Map<
      string,
      {
        date: string;
        dayName: string;
        tasksCompletedCount: number;
        focusSessionsCount: number;
        totalFocusMinutes: number;
        sessions: any[];
        completedTasksList: any[];
      }
    >();

    const getDayName = (d: Date) => {
      return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    };

    for (const session of sessions) {
      const dateKey = new Date(session.createdAt).toISOString().split('T')[0];
      if (!groupedMap.has(dateKey)) {
        groupedMap.set(dateKey, {
          date: dateKey,
          dayName: getDayName(new Date(session.createdAt)),
          tasksCompletedCount: 0,
          focusSessionsCount: 0,
          totalFocusMinutes: 0,
          sessions: [],
          completedTasksList: [],
        });
      }

      const group = groupedMap.get(dateKey)!;
      group.focusSessionsCount++;
      group.totalFocusMinutes += session.actualMinutes || 0;
      group.sessions.push(session);
    }

    for (const task of completedTasks) {
      const dateKey = new Date(task.updatedAt).toISOString().split('T')[0];
      if (!groupedMap.has(dateKey)) {
        groupedMap.set(dateKey, {
          date: dateKey,
          dayName: getDayName(new Date(task.updatedAt)),
          tasksCompletedCount: 0,
          focusSessionsCount: 0,
          totalFocusMinutes: 0,
          sessions: [],
          completedTasksList: [],
        });
      }
      const group = groupedMap.get(dateKey)!;
      group.tasksCompletedCount++;
      group.completedTasksList.push(task);
    }

    const historyList = Array.from(groupedMap.values()).sort((a, b) => b.date.localeCompare(a.date));

    return historyList;
  }

  // GET /analytics/insights
  async getInsights() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const [allTasks, allSessions, streakInfo, overdueCount] = await Promise.all([
      this.prisma.task.findMany(),
      this.prisma.focusSession.findMany(),
      this.calculateStreakInfo(),
      this.prisma.task.count({
        where: {
          completed: false,
          dueDate: {
            lt: todayStart,
          },
        },
      }),
    ]);

    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter((t) => t.completed).length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const highPriorityPending = allTasks.filter((t) => !t.completed && t.priority === 'HIGH').length;

    const totalMinutes = allSessions.reduce((acc, s) => acc + (s.actualMinutes || 0), 0);
    const avgMinutes = allSessions.length > 0 ? Math.round(totalMinutes / allSessions.length) : 0;

    const insights: Array<{ title: string; message: string; type: 'success' | 'warning' | 'info' }> = [];

    // 1. Completion Rate Insight
    if (totalTasks === 0) {
      insights.push({
        title: 'Start Planning',
        message: 'Add your first batch of tasks to begin tracking your productivity performance.',
        type: 'info',
      });
    } else if (completionRate >= 75) {
      insights.push({
        title: 'High Completion Rate',
        message: `You have completed ${completionRate.toFixed(1)}% of your planned tasks. Outstanding focus!`,
        type: 'success',
      });
    } else if (completionRate < 40) {
      insights.push({
        title: 'Workload Balance',
        message: `Your current completion rate is ${completionRate.toFixed(1)}%. Consider breaking larger goals into bite-sized subtasks.`,
        type: 'warning',
      });
    } else {
      insights.push({
        title: 'Steady Progress',
        message: `You have completed ${completedTasks} of ${totalTasks} tasks (${completionRate.toFixed(1)}%). Consistency is key.`,
        type: 'info',
      });
    }

    // 2. Overdue Warning
    if (overdueCount > 0) {
      insights.push({
        title: 'Attention Needed',
        message: `You have ${overdueCount} overdue task${overdueCount > 1 ? 's' : ''}. Use the Reschedule tool to realign your day.`,
        type: 'warning',
      });
    }

    // 3. High Priority Alert
    if (highPriorityPending > 0) {
      insights.push({
        title: 'High-Priority Focus',
        message: `You have ${highPriorityPending} high-priority task${highPriorityPending > 1 ? 's' : ''} waiting. Give them your best focus session next.`,
        type: 'info',
      });
    }

    // 4. Focus Duration Insight
    if (allSessions.length > 0) {
      insights.push({
        title: 'Average Focus Session',
        message: `Your average focus duration is ${avgMinutes} minutes across ${allSessions.length} logged sessions.`,
        type: 'info',
      });
    }

    // 5. Streak Insight
    if (streakInfo.currentStreak > 1) {
      insights.push({
        title: 'Productivity Streak',
        message: `You are on a ${streakInfo.currentStreak}-day active streak! Keep up your intentional momentum.`,
        type: 'success',
      });
    }

    return {
      completionRate: Math.round(completionRate * 10) / 10,
      totalTasks,
      completedTasks,
      totalSessions: allSessions.length,
      insights,
    };
  }

  // GET /analytics/profile
  async getProfile() {
    const [allTasks, allSessions, streakInfo] = await Promise.all([
      this.prisma.task.findMany(),
      this.prisma.focusSession.findMany(),
      this.calculateStreakInfo(),
    ]);

    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter((t) => t.completed).length;
    const totalFocusMinutes = allSessions.reduce((acc, s) => acc + (s.actualMinutes || 0), 0);

    // Find best productivity day of week
    const dayTotals: Record<string, number> = {
      Sunday: 0,
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0,
    };

    for (const session of allSessions) {
      const day = new Date(session.createdAt).toLocaleDateString('en-US', { weekday: 'long' });
      if (dayTotals[day] !== undefined) {
        dayTotals[day] += session.actualMinutes || 0;
      }
    }

    let bestDay = 'None yet';
    let maxDayMinutes = 0;
    for (const [day, mins] of Object.entries(dayTotals)) {
      if (mins > maxDayMinutes) {
        maxDayMinutes = mins;
        bestDay = day;
      }
    }

    return {
      totalTasksCreated: totalTasks,
      totalTasksCompleted: completedTasks,
      totalFocusSessions: allSessions.length,
      totalFocusMinutes,
      formattedFocusTime: this.formatMinutes(totalFocusMinutes),
      currentStreak: streakInfo.currentStreak,
      bestStreak: streakInfo.bestStreak,
      bestProductivityDay: maxDayMinutes > 0 ? `${bestDay} (${this.formatMinutes(maxDayMinutes)})` : 'None yet',
    };
  }
}
