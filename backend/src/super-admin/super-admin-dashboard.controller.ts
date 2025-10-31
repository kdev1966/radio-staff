import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { SuperAdminDashboardService } from './super-admin-dashboard.service';

/**
 * SuperAdmin Dashboard Controller
 * Provides platform-wide statistics and management views
 * All routes are restricted to SUPER_ADMIN only
 */
@Controller('super-admin/dashboard')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class SuperAdminDashboardController {
  constructor(
    private readonly dashboardService: SuperAdminDashboardService,
  ) {}

  /**
   * Get platform-wide statistics
   * Returns aggregated data across all radiology services
   *
   * Response:
   * {
   *   totalServices: number,
   *   activeServices: number,
   *   totalEmployees: number,
   *   totalShifts: number,
   *   servicesByStatus: { ACTIVE: n, SUSPENDED: n, TRIAL: n, EXPIRED: n },
   *   servicesByTier: { TRIAL: n, BASIC: n, PRO: n, ENTERPRISE: n }
   * }
   */
  @Get('stats')
  async getPlatformStats() {
    return this.dashboardService.getPlatformStats();
  }

  /**
   * Get overview of all radiology services with admin controls
   * Includes status, tier, employee count, and admin actions
   *
   * Response: Array of services with:
   * {
   *   id, name, hospital, status, tier, subscriptionEnd,
   *   employeeCount, canManage: true
   * }
   */
  @Get('services')
  async getServicesOverview() {
    return this.dashboardService.getServicesOverview();
  }

  /**
   * Get recent platform activity
   * Returns recent logins, service creations, and system events
   *
   * Response:
   * {
   *   recentLogins: [...],
   *   recentServiceCreations: [...],
   *   systemEvents: [...]
   * }
   */
  @Get('activity')
  async getRecentActivity() {
    return this.dashboardService.getRecentActivity();
  }

  /**
   * Get platform health metrics
   * Returns system health indicators and alerts
   *
   * Response:
   * {
   *   systemStatus: 'OPERATIONAL' | 'DEGRADED' | 'DOWN',
   *   alerts: [...],
   *   metrics: { uptime, responseTime, errorRate }
   * }
   */
  @Get('health')
  async getPlatformHealth() {
    return this.dashboardService.getPlatformHealth();
  }
}
