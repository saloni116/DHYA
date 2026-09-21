import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Priority, TaskStatus } from '@prisma/client';
import {
  CreateSubtaskDto,
  CreateTaskDto,
  RescheduleTaskDto,
  UpdateSubtaskDto,
  UpdateTaskDto,
} from './dto/task.dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(
    @Query('status') status?: TaskStatus,
    @Query('priority') priority?: Priority,
    @Query('categoryId') categoryId?: number,
    @Query('search') search?: string,
    @Query('overdue') overdue?: string,
    @Query('today') today?: string,
    @Query('upcoming') upcoming?: string,
  ) {
    return this.tasksService.findAll({
      status,
      priority,
      categoryId,
      search,
      overdue: overdue === 'true',
      today: today === 'true',
      upcoming: upcoming === 'true',
    });
  }

  @Get('today')
  getTodayTasks() {
    return this.tasksService.getTodayTasks();
  }

  @Get('upcoming')
  getUpcomingTasks() {
    return this.tasksService.getUpcomingTasks();
  }

  @Get('overdue')
  getOverdueTasks() {
    return this.tasksService.getOverdueTasks();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.findOne(id);
  }

  @Post()
  create(@Body() body: CreateTaskDto) {
    return this.tasksService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTaskDto,
  ) {
    return this.tasksService.update(id, body);
  }

  @Patch(':id/reschedule')
  reschedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: RescheduleTaskDto,
  ) {
    return this.tasksService.reschedule(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.remove(id);
  }

  // Subtask endpoints
  @Post(':id/subtasks')
  addSubtask(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateSubtaskDto,
  ) {
    return this.tasksService.addSubtask(id, body);
  }

  @Patch(':id/subtasks/:subtaskId')
  updateSubtask(
    @Param('id', ParseIntPipe) id: number,
    @Param('subtaskId', ParseIntPipe) subtaskId: number,
    @Body() body: UpdateSubtaskDto,
  ) {
    return this.tasksService.updateSubtask(id, subtaskId, body);
  }

  @Delete(':id/subtasks/:subtaskId')
  removeSubtask(
    @Param('id', ParseIntPipe) id: number,
    @Param('subtaskId', ParseIntPipe) subtaskId: number,
  ) {
    return this.tasksService.removeSubtask(id, subtaskId);
  }
}
