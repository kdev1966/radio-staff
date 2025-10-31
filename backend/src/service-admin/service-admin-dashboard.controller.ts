import {
  Controller,
  Get,
  UseGuards,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ServiceContextGuard } from '../common/guards/service-context.guard';
import { RolesGuard, Role } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ServiceId } from '../common/decorators/service-id.decorator';
import { ServiceAdminDashboardService } from './service-admin-dashboard.service';

/**
 * Service Admin Dashboard Controller
 * Provides aggregated statistics and overview for a radiology service
 */
@Controller('service-admin/dashboard')
@UseGuards(JwtAuthGuard, ServiceContextGuard, RolesGuard)
@Roles(Role.ADMIN, Role.RH)
export class ServiceAdminDashboardController {
  constructor(
    private readonly dashboardService: ServiceAdminDashboardService,
  ) {}

  /**
   * Get complete dashboard overview
   */
  @Get('overview')
  getOverview(@ServiceId() serviceId: string) {
    return this.dashboardService.getOverview(serviceId);
  }

  /**
   * Get employee statistics
   */
  @Get('employees/stats')
  getEmployeeStats(@ServiceId() serviceId: string) {
    return this.dashboardService.getEmployeeStats(serviceId);
  }

  /**
   * Get leave request statistics
   */
  @Get('leaves/stats')
  getLeaveStats(@ServiceId() serviceId: string) {
    return this.dashboardService.getLeaveStats(serviceId);
  }

  /**
   * Get shift statistics
   */
  @Get('shifts/stats')
  getShiftStats(@ServiceId() serviceId: string) {
    return this.dashboardService.getShiftStats(serviceId);
  }

  /**
   * Get recent activity
   */
  @Get('activity')
  getRecentActivity(
    @ServiceId() serviceId: string,
    @Query('limit') limit?: string,
  ) {
    return this.dashboardService.getRecentActivity(
      serviceId,
      limit ? parseInt(limit) : 10,
    );
  }

  /**
   * Get pending actions
   */
  @Get('pending')
  getPendingActions(@ServiceId() serviceId: string) {
    return this.dashboardService.getPendingActions(serviceId);
  }

  /**
   * Get weekly summary
   */
  @Get('weekly-summary')
  getWeeklySummary(@ServiceId() serviceId: string) {
    return this.dashboardService.getWeeklySummary(serviceId);
  }

  /**
   * Get monthly summary
   */
  @Get('monthly-summary')
  getMonthlySummary(
    @ServiceId() serviceId: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const now = new Date();
    return this.dashboardService.getMonthlySummary(
      serviceId,
      year ? parseInt(year) : now.getFullYear(),
      month ? parseInt(month) : now.getMonth() + 1,
    );
  }
}
