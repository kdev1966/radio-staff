import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaveRequest } from '../entities/leave-request.entity';
import { LeaveStatus } from '../common/enums/leave.enum';
import { Employee } from '../entities/employee.entity';
import { CreateLeaveDto } from '../leave/dto/create-leave.dto';
import { UpdateLeaveDto } from '../leave/dto/update-leave.dto';

/**
 * Service Admin Leaves Service
 * Handles leave request management within a specific service
 * Implements RH → ADMIN approval workflow
 */
@Injectable()
export class ServiceAdminLeavesService {
  constructor(
    @InjectRepository(LeaveRequest)
    private readonly leaveRepo: Repository<LeaveRequest>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
  ) {}

  /**
   * Find all leave requests in a service with optional filters
   */
  async findAllByService(
    serviceId: string,
    filters?: { status?: string; employeeId?: string },
  ) {
    const queryBuilder = this.leaveRepo
      .createQueryBuilder('leave')
      .leftJoinAndSelect('leave.employee', 'employee')
      .where('leave.serviceId = :serviceId', { serviceId })
      .orderBy('leave.requestedAt', 'DESC');

    if (filters?.status) {
      queryBuilder.andWhere('leave.status = :status', { status: filters.status });
    }

    if (filters?.employeeId) {
      queryBuilder.andWhere('leave.employeeId = :employeeId', {
        employeeId: filters.employeeId,
      });
    }

    const leaves = await queryBuilder.getMany();

    return leaves.map((leave) => ({
      id: leave.id,
      employeeId: leave.employeeId,
      employeeName: leave.employee
        ? `${leave.employee.firstName} ${leave.employee.lastName}`
        : 'Unknown',
      employeeMatricule: leave.employee?.matricule,
      startDate: leave.startDate,
      endDate: leave.endDate,
      days: leave.days,
      type: leave.type,
      status: leave.status,
      comment: leave.comment,
      rhReviewedAt: leave.rhReviewedAt,
      rhReviewedBy: leave.rhReviewedBy,
      rhComment: leave.rhComment,
      adminReviewedAt: leave.adminReviewedAt,
      adminReviewedBy: leave.adminReviewedBy,
      adminComment: leave.adminComment,
      rejectedAt: leave.rejectedAt,
      rejectedBy: leave.rejectedBy,
      rejectionReason: leave.rejectionReason,
      requestedAt: leave.requestedAt,
    }));
  }

  /**
   * Find one leave request by ID within a service
   */
  async findOne(serviceId: string, leaveId: string) {
    const leave = await this.leaveRepo
      .createQueryBuilder('leave')
      .leftJoinAndSelect('leave.employee', 'employee')
      .where('leave.id = :leaveId', { leaveId })
      .andWhere('leave.serviceId = :serviceId', { serviceId })
      .getOne();

    if (!leave) {
      throw new NotFoundException(
        `Leave request with ID ${leaveId} not found in this service`,
      );
    }

    return {
      id: leave.id,
      employeeId: leave.employeeId,
      employeeName: leave.employee
        ? `${leave.employee.firstName} ${leave.employee.lastName}`
        : 'Unknown',
      employeeMatricule: leave.employee?.matricule,
      startDate: leave.startDate,
      endDate: leave.endDate,
      days: leave.days,
      type: leave.type,
      status: leave.status,
      comment: leave.comment,
      rhReviewedAt: leave.rhReviewedAt,
      rhReviewedBy: leave.rhReviewedBy,
      rhComment: leave.rhComment,
      adminReviewedAt: leave.adminReviewedAt,
      adminReviewedBy: leave.adminReviewedBy,
      adminComment: leave.adminComment,
      rejectedAt: leave.rejectedAt,
      rejectedBy: leave.rejectedBy,
      rejectionReason: leave.rejectionReason,
      requestedAt: leave.requestedAt,
    };
  }

  /**
   * Create a new leave request
   */
  async create(serviceId: string, createDto: CreateLeaveDto) {
    // Verify employee exists and belongs to service
    const employee = await this.employeeRepo.findOne({
      where: { id: createDto.employeeId, serviceId },
    });

    if (!employee) {
      throw new NotFoundException(
        `Employee with ID ${createDto.employeeId} not found in this service`,
      );
    }

    // Validate dates
    const startDate = new Date(createDto.startDate);
    const endDate = new Date(createDto.endDate);

    if (startDate >= endDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Check for overlapping leave requests
    const overlapping = await this.leaveRepo
      .createQueryBuilder('leave')
      .where('leave.employeeId = :employeeId', {
        employeeId: createDto.employeeId,
      })
      .andWhere('leave.status NOT IN (:...statuses)', {
        statuses: [LeaveStatus.REJECTED_BY_RH, LeaveStatus.REJECTED_BY_ADMIN],
      })
      .andWhere(
        '(leave.startDate <= :endDate AND leave.endDate >= :startDate)',
        {
          startDate: createDto.startDate,
          endDate: createDto.endDate,
        },
      )
      .getOne();

    if (overlapping) {
      throw new BadRequestException(
        'This employee already has a leave request during this period',
      );
    }

    const leave = this.leaveRepo.create({
      ...createDto,
      serviceId,
      status: LeaveStatus.PENDING,
    });

    const saved = await this.leaveRepo.save(leave);

    // Return with employee info
    return this.findOne(serviceId, saved.id);
  }

  /**
   * Update a leave request (only if PENDING)
   */
  async update(
    serviceId: string,
    leaveId: string,
    updateDto: UpdateLeaveDto,
  ) {
    const leave = await this.leaveRepo.findOne({
      where: { id: leaveId, serviceId },
    });

    if (!leave) {
      throw new NotFoundException(
        `Leave request with ID ${leaveId} not found in this service`,
      );
    }

    if (leave.status !== LeaveStatus.PENDING) {
      throw new ForbiddenException(
        'Can only update leave requests with PENDING status',
      );
    }

    // Validate dates if provided
    if (updateDto.startDate || updateDto.endDate) {
      const startDate = new Date(updateDto.startDate || leave.startDate);
      const endDate = new Date(updateDto.endDate || leave.endDate);

      if (startDate >= endDate) {
        throw new BadRequestException('End date must be after start date');
      }

      // Check for overlapping leave requests (excluding current)
      const overlapping = await this.leaveRepo
        .createQueryBuilder('leave')
        .where('leave.employeeId = :employeeId', {
          employeeId: leave.employeeId,
        })
        .andWhere('leave.id != :leaveId', { leaveId })
        .andWhere('leave.status NOT IN (:...statuses)', {
          statuses: [LeaveStatus.REJECTED_BY_RH, LeaveStatus.REJECTED_BY_ADMIN],
        })
        .andWhere(
          '(leave.startDate <= :endDate AND leave.endDate >= :startDate)',
          {
            startDate: updateDto.startDate || leave.startDate,
            endDate: updateDto.endDate || leave.endDate,
          },
        )
        .getOne();

      if (overlapping) {
        throw new BadRequestException(
          'This employee already has a leave request during this period',
        );
      }
    }

    await this.leaveRepo.update(leaveId, updateDto);
    return this.findOne(serviceId, leaveId);
  }

  /**
   * RH approves leave request
   * Status: PENDING → APPROVED_BY_RH
   */
  async approveByRH(serviceId: string, leaveId: string) {
    const leave = await this.leaveRepo.findOne({
      where: { id: leaveId, serviceId },
    });

    if (!leave) {
      throw new NotFoundException(
        `Leave request with ID ${leaveId} not found in this service`,
      );
    }

    if (leave.status !== LeaveStatus.PENDING) {
      throw new BadRequestException(
        `Cannot approve: Leave request status is ${leave.status}`,
      );
    }

    await this.leaveRepo.update(leaveId, {
      status: LeaveStatus.APPROVED_BY_RH,
      rhReviewedAt: new Date(),
    });

    return this.findOne(serviceId, leaveId);
  }

  /**
   * RH rejects leave request
   * Status: PENDING → REJECTED_BY_RH
   */
  async rejectByRH(serviceId: string, leaveId: string, reason?: string) {
    const leave = await this.leaveRepo.findOne({
      where: { id: leaveId, serviceId },
    });

    if (!leave) {
      throw new NotFoundException(
        `Leave request with ID ${leaveId} not found in this service`,
      );
    }

    if (leave.status !== LeaveStatus.PENDING) {
      throw new BadRequestException(
        `Cannot reject: Leave request status is ${leave.status}`,
      );
    }

    await this.leaveRepo.update(leaveId, {
      status: LeaveStatus.REJECTED_BY_RH,
      rhReviewedAt: new Date(),
      rejectedAt: new Date(),
      rejectionReason: reason,
    });

    return this.findOne(serviceId, leaveId);
  }

  /**
   * ADMIN approves leave request (final approval)
   * Status: APPROVED_BY_RH → APPROVED
   */
  async approveByAdmin(serviceId: string, leaveId: string) {
    const leave = await this.leaveRepo.findOne({
      where: { id: leaveId, serviceId },
    });

    if (!leave) {
      throw new NotFoundException(
        `Leave request with ID ${leaveId} not found in this service`,
      );
    }

    if (leave.status !== LeaveStatus.APPROVED_BY_RH) {
      throw new BadRequestException(
        `Cannot approve: Leave request must be APPROVED_BY_RH first (current: ${leave.status})`,
      );
    }

    await this.leaveRepo.update(leaveId, {
      status: LeaveStatus.APPROVED,
      adminReviewedAt: new Date(),
    });

    return this.findOne(serviceId, leaveId);
  }

  /**
   * ADMIN rejects leave request
   * Status: APPROVED_BY_RH → REJECTED_BY_ADMIN
   */
  async rejectByAdmin(serviceId: string, leaveId: string, reason?: string) {
    const leave = await this.leaveRepo.findOne({
      where: { id: leaveId, serviceId },
    });

    if (!leave) {
      throw new NotFoundException(
        `Leave request with ID ${leaveId} not found in this service`,
      );
    }

    if (leave.status !== LeaveStatus.APPROVED_BY_RH) {
      throw new BadRequestException(
        `Cannot reject: Leave request must be APPROVED_BY_RH first (current: ${leave.status})`,
      );
    }

    await this.leaveRepo.update(leaveId, {
      status: LeaveStatus.REJECTED_BY_ADMIN,
      adminReviewedAt: new Date(),
      rejectedAt: new Date(),
      rejectionReason: reason,
    });

    return this.findOne(serviceId, leaveId);
  }

  /**
   * Delete a leave request (only if PENDING)
   */
  async remove(serviceId: string, leaveId: string) {
    const leave = await this.leaveRepo.findOne({
      where: { id: leaveId, serviceId },
    });

    if (!leave) {
      throw new NotFoundException(
        `Leave request with ID ${leaveId} not found in this service`,
      );
    }

    if (leave.status !== LeaveStatus.PENDING) {
      throw new ForbiddenException(
        'Can only delete leave requests with PENDING status',
      );
    }

    await this.leaveRepo.delete(leaveId);
  }

  /**
   * Get leave statistics for the service
   */
  async getServiceStats(serviceId: string) {
    // Get all leaves for this service
    const leaves = await this.leaveRepo.find({
      where: { serviceId },
    });

    const total = leaves.length;
    const pending = leaves.filter((l) => l.status === LeaveStatus.PENDING).length;
    const approvedByRH = leaves.filter(
      (l) => l.status === LeaveStatus.APPROVED_BY_RH,
    ).length;
    const approved = leaves.filter((l) => l.status === LeaveStatus.APPROVED).length;
    const rejectedByRH = leaves.filter(
      (l) => l.status === LeaveStatus.REJECTED_BY_RH,
    ).length;
    const rejectedByAdmin = leaves.filter(
      (l) => l.status === LeaveStatus.REJECTED_BY_ADMIN,
    ).length;

    // Group by leave type
    const byType: Record<string, number> = {};
    leaves.forEach((leave) => {
      byType[leave.type] = (byType[leave.type] || 0) + 1;
    });

    return {
      total,
      pending,
      approvedByRH,
      approved,
      rejectedByRH,
      rejectedByAdmin,
      byType: Object.entries(byType).map(([type, count]) => ({ type, count })),
    };
  }

  /**
   * Get pending approvals for RH
   */
  async getPendingForRH(serviceId: string) {
    return this.findAllByService(serviceId, { status: LeaveStatus.PENDING });
  }

  /**
   * Get pending approvals for ADMIN
   */
  async getPendingForAdmin(serviceId: string) {
    return this.findAllByService(serviceId, {
      status: LeaveStatus.APPROVED_BY_RH,
    });
  }
}
