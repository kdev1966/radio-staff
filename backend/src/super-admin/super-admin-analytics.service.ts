import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RadiologyService } from '../entities/radiology-service.entity';
import { Employee } from '../entities/employee.entity';
import { Shift } from '../entities/shift.entity';
import { LeaveRequest } from '../entities/leave-request.entity';
import { ServiceStatus } from '../common/enums/permission.enum';

/**
 * SuperAdmin Analytics Service
 * Provides comprehensive platform analytics and insights
 */
@Injectable()
export class SuperAdminAnalyticsService {
  constructor(
    @InjectRepository(RadiologyService)
    private readonly serviceRepo: Repository<RadiologyService>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Shift)
    private readonly shiftRepo: Repository<Shift>,
    @InjectRepository(LeaveRequest)
    private readonly leaveRepo: Repository<LeaveRequest>,
  ) {}

  /**
   * Get platform overview analytics
   */
  async getOverview() {
    const [
      totalServices,
      totalEmployees,
      totalShifts,
      totalLeaveRequests,
      activeServices,
      suspendedServices,
    ] = await Promise.all([
      this.serviceRepo.count(),
      this.employeeRepo.count(),
      this.shiftRepo.count(),
      this.leaveRepo.count(),
      this.serviceRepo.count({ where: { status: ServiceStatus.ACTIVE } }),
      this.serviceRepo.count({ where: { status: ServiceStatus.SUSPENDED } }),
    ]);

    return {
      totalServices,
      totalEmployees,
      totalShifts,
      totalLeaveRequests,
      activeServices,
      suspendedServices,
      servicesGrowthRate: 0, // Calculate from historical data
      employeesGrowthRate: 0, // Calculate from historical data
    };
  }

  /**
   * Get service growth trends
   */
  async getServiceGrowth(period: string) {
    const days = this.parsePeriod(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const services = await this.serviceRepo
      .createQueryBuilder('service')
      .where('service.createdAt >= :startDate', { startDate })
      .orderBy('service.createdAt', 'ASC')
      .getMany();

    // Group by day
    const growthByDay: Record<string, number> = {};
    services.forEach((service) => {
      const day = service.createdAt.toISOString().split('T')[0];
      growthByDay[day] = (growthByDay[day] || 0) + 1;
    });

    return Object.entries(growthByDay).map(([date, count]) => ({
      date,
      count,
    }));
  }

  /**
   * Get employee distribution by service
   */
  async getEmployeeDistribution() {
    const services = await this.serviceRepo.find({
      relations: ['employees'],
    });

    return services.map((service) => ({
      serviceName: service.name,
      employeeCount: service.employees?.length || 0,
      tier: service.subscriptionTier,
    }));
  }

  /**
   * Get subscription tier distribution
   */
  async getSubscriptionTiers() {
    const services = await this.serviceRepo.find();

    const distribution: Record<string, number> = {
      TRIAL: 0,
      BASIC: 0,
      PRO: 0,
      ENTERPRISE: 0,
    };

    services.forEach((service) => {
      distribution[service.subscriptionTier] =
        (distribution[service.subscriptionTier] || 0) + 1;
    });

    return Object.entries(distribution).map(([tier, count]) => ({
      tier,
      count,
      percentage: (count / services.length) * 100,
    }));
  }

  /**
   * Get leave request trends
   */
  async getLeaveTrends(period: string) {
    const days = this.parsePeriod(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const leaves = await this.leaveRepo
      .createQueryBuilder('leave')
      .where('leave.createdAt >= :startDate', { startDate })
      .orderBy('leave.createdAt', 'ASC')
      .getMany();

    // Group by status
    const statusCounts: Record<string, number> = {};
    leaves.forEach((leave) => {
      statusCounts[leave.status] = (statusCounts[leave.status] || 0) + 1;
    });

    return {
      total: leaves.length,
      byStatus: Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
      })),
    };
  }

  /**
   * Get shift statistics
   */
  async getShiftStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const [totalShifts, todayShifts, upcomingShifts] = await Promise.all([
      this.shiftRepo.count(),
      this.shiftRepo
        .createQueryBuilder('shift')
        .where('shift.shiftDate = :today', { today })
        .getCount(),
      this.shiftRepo
        .createQueryBuilder('shift')
        .where('shift.shiftDate >= :today AND shift.shiftDate < :nextWeek', {
          today,
          nextWeek,
        })
        .getCount(),
    ]);

    return {
      totalShifts,
      todayShifts,
      upcomingShifts,
    };
  }

  /**
   * Get top performing services
   */
  async getTopServices(limit: number) {
    const services = await this.serviceRepo.find({
      relations: ['employees', 'shifts'],
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return services.map((service) => ({
      id: service.id,
      name: service.name,
      hospitalName: service.hospitalName,
      employeeCount: service.employees?.length || 0,
      shiftCount: service.shifts?.length || 0,
      status: service.status,
      tier: service.subscriptionTier,
    }));
  }

  /**
   * Helper to parse period string (e.g., "30d", "7d", "90d")
   */
  private parsePeriod(period: string): number {
    const match = period.match(/^(\d+)d$/);
    return match ? parseInt(match[1]) : 30;
  }
}
