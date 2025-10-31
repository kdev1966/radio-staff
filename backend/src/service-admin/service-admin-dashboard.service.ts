import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { Employee } from '../entities/employee.entity';
import { LeaveRequest } from '../entities/leave-request.entity';
import { LeaveStatus } from '../common/enums/leave.enum';
import { Shift } from '../entities/shift.entity';
import { ServiceAdminEmployeesService } from './service-admin-employees.service';
import { ServiceAdminLeavesService } from './service-admin-leaves.service';
import { ServiceAdminShiftsService } from './service-admin-shifts.service';

/**
 * Service Admin Dashboard Service
 * Aggregates statistics and provides overview for a radiology service
 */
@Injectable()
export class ServiceAdminDashboardService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(LeaveRequest)
    private readonly leaveRepo: Repository<LeaveRequest>,
    @InjectRepository(Shift)
    private readonly shiftRepo: Repository<Shift>,
    private readonly employeesService: ServiceAdminEmployeesService,
    private readonly leavesService: ServiceAdminLeavesService,
    private readonly shiftsService: ServiceAdminShiftsService,
  ) {}

  /**
   * Get complete dashboard overview
   */
  async getOverview(serviceId: string) {
    const [employeeStats, leaveStats, shiftStats, pending] = await Promise.all([
      this.getEmployeeStats(serviceId),
      this.getLeaveStats(serviceId),
      this.getShiftStats(serviceId),
      this.getPendingActions(serviceId),
    ]);

    return {
      employees: employeeStats,
      leaves: leaveStats,
      shifts: shiftStats,
      pending,
    };
  }

  /**
   * Get employee statistics
   */
  async getEmployeeStats(serviceId: string) {
    return this.employeesService.getServiceStats(serviceId);
  }

  /**
   * Get leave request statistics
   */
  async getLeaveStats(serviceId: string) {
    return this.leavesService.getServiceStats(serviceId);
  }

  /**
   * Get shift statistics
   */
  async getShiftStats(serviceId: string) {
    return this.shiftsService.getServiceStats(serviceId);
  }

  /**
   * Get recent activity
   */
  async getRecentActivity(serviceId: string, limit: number = 10) {
    // Get recent leave requests
    const recentLeaves = await this.leaveRepo
      .createQueryBuilder('leave')
      .leftJoinAndSelect('leave.employee', 'employee')
      .where('employee.serviceId = :serviceId', { serviceId })
      .orderBy('leave.requestedAt', 'DESC')
      .limit(limit)
      .getMany();

    // Format activity
    const activity = recentLeaves.map((leave) => ({
      type: 'leave_request',
      description: `${leave.employee?.firstName} ${leave.employee?.lastName} requested ${leave.type} leave`,
      status: leave.status,
      date: leave.requestedAt,
      employeeId: leave.employeeId,
      employeeName: `${leave.employee?.firstName} ${leave.employee?.lastName}`,
    }));

    return activity.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  /**
   * Get pending actions
   */
  async getPendingActions(serviceId: string) {
    const [pendingForRH, pendingForAdmin, unassignedShifts] = await Promise.all(
      [
        this.leavesService.getPendingForRH(serviceId),
        this.leavesService.getPendingForAdmin(serviceId),
        this.shiftsService.getUnassignedShifts(serviceId),
      ],
    );

    return {
      pendingLeaveApprovalsRH: pendingForRH.length,
      pendingLeaveApprovalsAdmin: pendingForAdmin.length,
      unassignedShifts: unassignedShifts.length,
      total:
        pendingForRH.length + pendingForAdmin.length + unassignedShifts.length,
    };
  }

  /**
   * Get weekly summary
   */
  async getWeeklySummary(serviceId: string) {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    // Get shifts for the week
    const shifts = await this.shiftRepo
      .createQueryBuilder('shift')
      .leftJoin('shift.assignments', 'assignment')
      .addSelect(['assignment.id'])
      .where('shift.serviceId = :serviceId', { serviceId })
      .andWhere('shift.shiftDate BETWEEN :weekStart AND :weekEnd', {
        weekStart,
        weekEnd,
      })
      .getMany();

    // Get leaves for the week
    const leaves = await this.leaveRepo
      .createQueryBuilder('leave')
      .leftJoin('leave.employee', 'employee')
      .where('employee.serviceId = :serviceId', { serviceId })
      .andWhere('leave.startDate <= :weekEnd', { weekEnd })
      .andWhere('leave.endDate >= :weekStart', { weekStart })
      .getMany();

    const totalShifts = shifts.length;
    const assignedShifts = shifts.filter(
      (s) => s.assignments && s.assignments.length > 0,
    ).length;
    const approvedLeaves = leaves.filter(
      (l) => l.status === LeaveStatus.APPROVED,
    ).length;

    return {
      weekStart,
      weekEnd,
      totalShifts,
      assignedShifts,
      unassignedShifts: totalShifts - assignedShifts,
      approvedLeaves,
      pendingLeaves: leaves.filter((l) => l.status === LeaveStatus.PENDING)
        .length,
    };
  }

  /**
   * Get monthly summary
   */
  async getMonthlySummary(serviceId: string, year: number, month: number) {
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    // Get shifts for the month
    const shifts = await this.shiftRepo
      .createQueryBuilder('shift')
      .leftJoin('shift.assignments', 'assignment')
      .addSelect(['assignment.id'])
      .where('shift.serviceId = :serviceId', { serviceId })
      .andWhere('shift.shiftDate BETWEEN :monthStart AND :monthEnd', {
        monthStart,
        monthEnd,
      })
      .getMany();

    // Get leaves for the month
    const leaves = await this.leaveRepo
      .createQueryBuilder('leave')
      .leftJoin('leave.employee', 'employee')
      .where('employee.serviceId = :serviceId', { serviceId })
      .andWhere('leave.startDate <= :monthEnd', { monthEnd })
      .andWhere('leave.endDate >= :monthStart', { monthStart })
      .getMany();

    const totalShifts = shifts.length;
    const assignedShifts = shifts.filter(
      (s) => s.assignments && s.assignments.length > 0,
    ).length;

    // Count leaves by status
    const leavesByStatus = {
      pending: leaves.filter((l) => l.status === LeaveStatus.PENDING).length,
      approvedByRH: leaves.filter((l) => l.status === LeaveStatus.APPROVED_BY_RH)
        .length,
      approved: leaves.filter((l) => l.status === LeaveStatus.APPROVED).length,
      rejectedByRH: leaves.filter(
        (l) => l.status === LeaveStatus.REJECTED_BY_RH,
      ).length,
      rejectedByAdmin: leaves.filter(
        (l) => l.status === LeaveStatus.REJECTED_BY_ADMIN,
      ).length,
    };

    return {
      monthStart,
      monthEnd,
      year,
      month,
      totalShifts,
      assignedShifts,
      unassignedShifts: totalShifts - assignedShifts,
      totalLeaves: leaves.length,
      leavesByStatus,
    };
  }
}
