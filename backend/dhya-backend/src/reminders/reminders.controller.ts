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
import { CreateReminderDto, UpdateReminderDto } from './dto/reminder.dto';
import { RemindersService } from './reminders.service';

@Controller('reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('today') today?: string,
    @Query('upcoming') upcoming?: string,
  ) {
    return this.remindersService.findAll({
      status,
      today: today === 'true',
      upcoming: upcoming === 'true',
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.remindersService.findOne(id);
  }

  @Post()
  create(@Body() body: CreateReminderDto) {
    return this.remindersService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateReminderDto,
  ) {
    return this.remindersService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.remindersService.remove(id);
  }
}
