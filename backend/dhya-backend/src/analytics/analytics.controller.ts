import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  getDashboard() {
    return this.analyticsService.getDashboard();
  }

  @Get('history')
  getHistory(@Query('range') range?: 'today' | 'week' | 'month') {
    return this.analyticsService.getHistory(range);
  }

  @Get('insights')
  getInsights() {
    return this.analyticsService.getInsights();
  }

  @Get('profile')
  getProfile() {
    return this.analyticsService.getProfile();
  }
}
