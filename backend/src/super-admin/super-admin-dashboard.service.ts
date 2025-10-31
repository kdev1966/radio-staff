import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RadiologyService } from '../entities/radiology-service.entity';
import { Employee } from '../entities/employee.entity';
import { Shift } from '../entities/shift.entity';
import { SuperAdmin } from '../entities/super-admin.entity';

/**
 * SuperAdmin Dashboard Service
 * Provides platform-wide aggregated statistics and insights
 */
@Injectable()
export class SuperAdminDashboardService {
  constructor(
    @InjectRepository(RadiologyService)
    private readonly radiologyServiceRepo: Repository<RadiologyService>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Shift)
    private readonly shiftRepo: Repository<Shift>,
    @InjectRepository(SuperAdmin)
    private readonly superAdminRepo: Repository<SuperAdmin>,
  ) {}

  /**
   * Get platform-wide statistics
   */
  async getPlatformStats() {
    // Get all services with their employees
    const services = await this.radiologyServiceRepo.find({
      relations: ['employees'],
    });

    const totalServices = services.length;
    const activeServices = services.filter((s) => s.status === 'ACTIVE').length;

    // Calculate total employees across all services
    const totalEmployees = services.reduce(
      (sum, service) => sum + (service.employees?.length || 0),
      0,
    );

    // Get total shifts across all services
    const totalShifts = await this.shiftRepo.count();

    // Group services by status
    const servicesByStatus = services.reduce(
      (acc, service) => {
        acc[service.status] = (acc[service.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Group services by tier
    const servicesByTier = services.reduce(
      (acc, service) => {
        acc[service.subscriptionTier] = (acc[service.subscriptionTier] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalServices,
      activeServices,
      totalEmployees,
      totalShifts,
      servicesByStatus,
      servicesByTier,
      platformStatus: 'OPERATIONAL',
    };
  }

  /**
   * Get overview of all radiology services with management capabilities
   */
  async getServicesOverview() {
    const services = await this.radiologyServiceRepo.find({
      relations: ['employees'],
      order: { createdAt: 'DESC' },
    });

    return services.map((service) => ({
      id: service.id,
      name: service.name,
      hospitalName: service.hospitalName,
      status: service.status,
      subscriptionTier: service.subscriptionTier,
      subscriptionEndsAt: service.subscriptionEndsAt,
      employeeCount: service.employees?.length || 0,
      createdAt: service.createdAt,
      canManage: true, // SuperAdmin can manage all services
    }));
  }

  /**
   * Get recent platform activity
   */
  async getRecentActivity() {
    // Get recent super admin logins
    const recentLogins = await this.superAdminRepo.find({
      select: ['id', 'email', 'fullName', 'lastLoginAt'],
      where: { isActive: true },
      order: { lastLoginAt: 'DESC' },
      take: 10,
    });

    // Get recently created services
    const recentServiceCreations = await this.radiologyServiceRepo.find({
      select: ['id', 'name', 'hospitalName', 'status', 'subscriptionTier', 'createdAt'],
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return {
      recentLogins: recentLogins.map((admin) => ({
        adminEmail: admin.email,
        adminName: admin.fullName,
        loginAt: admin.lastLoginAt,
      })),
      recentServiceCreations: recentServiceCreations.map((service) => ({
        serviceName: service.name,
        hospitalName: service.hospitalName,
        subscriptionTier: service.subscriptionTier,
        createdAt: service.createdAt,
      })),
      systemEvents: [], // To be implemented: audit logs
    };
  }

  /**
   * Get platform health metrics
   */
  async getPlatformHealth() {
    const services = await this.radiologyServiceRepo.find();

    const activeServices = services.filter((s) => s.status === 'ACTIVE').length;
    const expiredServices = services.filter((s) => s.status === 'EXPIRED').length;
    const suspendedServices = services.filter((s) => s.status === 'SUSPENDED').length;

    // Simple health calculation
    let systemStatus: 'OPERATIONAL' | 'DEGRADED' | 'DOWN' = 'OPERATIONAL';
    const alerts: string[] = [];

    if (expiredServices > 0) {
      alerts.push(`${expiredServices} service(s) have expired subscriptions`);
      systemStatus = 'DEGRADED';
    }

    if (suspendedServices > 0) {
      alerts.push(`${suspendedServices} service(s) are currently suspended`);
    }

    if (activeServices === 0 && services.length > 0) {
      systemStatus = 'DOWN';
      alerts.push('No active services on the platform');
    }

    return {
      systemStatus,
      alerts,
      metrics: {
        totalServices: services.length,
        activeServices,
        healthScore: activeServices / Math.max(services.length, 1),
      },
    };
  }
}
