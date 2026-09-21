import { Module } from '@nestjs/common';
import { AnalyticsModule } from './analytics/analytics.module';
import { CategoriesModule } from './categories/categories.module';
import { EventsModule } from './events/events.module';
import { FocusSessionsModule } from './focus-sessions/focus-sessions.module';
import { NotesModule } from './notes/notes.module';
import { PrismaModule } from './prisma/prisma.module';
import { RemindersModule } from './reminders/reminders.module';
import { SearchModule } from './search/search.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    PrismaModule,
    TasksModule,
    CategoriesModule,
    EventsModule,
    RemindersModule,
    NotesModule,
    SearchModule,
    FocusSessionsModule,
    AnalyticsModule,
  ],
})
export class AppModule {}