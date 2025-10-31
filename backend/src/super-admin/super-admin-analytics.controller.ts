import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { SuperAdminAnalyticsService } from './super-admin-analytics.service';

/**
 * SuperAdmin Analytics Controller
 * Provides platform-wide analytics and insights
 */
@Controller('super-admin/analytics')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class SuperAdminAnalyticsController {
  constructor(
    private readonly analyticsService: SuperAdminAnalyticsService,
  ) {}

  /**
   * Get platform overview analytics
   */
  @Get('overview')
  async getOverview() {
    return this.analyticsService.getOverview();
  }

  /**
   * Get service growth trends
   */
  @Get('service-growth')
  async getServiceGrowth(@Query('period') period?: string) {
    return this.analyticsService.getServiceGrowth(period || '30d');
  }

  /**
   * Get employee distribution by service
   */
  @Get('employee-distribution')
  async getEmployeeDistribution() {
    return this.analyticsService.getEmployeeDistribution();
  }

  /**
   * Get subscription tier distribution
   */
  @Get('subscription-tiers')
  async getSubscriptionTiers() {
    return this.analyticsService.getSubscriptionTiers();
  }

  /**
   * Get leave request trends
   */
  @Get('leave-trends')
  async getLeaveTrends(@Query('period') period?: string) {
    return this.analyticsService.getLeaveTrends(period || '30d');
  }

  /**
   * Get shift statistics
   */
  @Get('shift-stats')
  async getShiftStats() {
    return this.analyticsService.getShiftStats();
  }

  /**
   * Get top performing services
   */
  @Get('top-services')
  async getTopServices(@Query('limit') limit?: string) {
    return this.analyticsService.getTopServices(parseInt(limit || '10'));
  }
}
