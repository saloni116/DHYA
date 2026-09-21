import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { CreateFocusSessionDto } from './dto/create-focus-session.dto';
import { FocusSessionsService } from './focus-sessions.service';

@Controller('focus-sessions')
export class FocusSessionsController {
  constructor(private readonly focusSessionsService: FocusSessionsService) {}

  @Post()
  create(@Body() body: CreateFocusSessionDto) {
    return this.focusSessionsService.create(body);
  }

  @Get('stats')
  getStats() {
    return this.focusSessionsService.getStats();
  }

  @Get()
  findAll() {
    return this.focusSessionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.focusSessionsService.findOne(id);
  }
}
