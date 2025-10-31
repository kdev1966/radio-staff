import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { LeaveRequest } from '../entities/leave-request.entity';
import { LeaveStatus } from '../common/enums/leave.enum';
import { Employee, EmployeeRole } from '../entities/employee.entity';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveDto } from './dto/update-leave.dto';

@Injectable()
export class LeaveService {
  constructor(
    @InjectRepository(LeaveRequest)
    private leaveRequestRepository: Repository<LeaveRequest>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
  ) {}

  /**
   * Create a new leave request
   * Validates no overlapping approved leaves and team conflicts
   */
  async create(createLeaveDto: CreateLeaveDto, serviceId: string) {
    const { employeeId, startDate, endDate, days, type } = createLeaveDto;

    // Verify employee exists and belongs to the service
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId, serviceId },
    });

    if (!employee) {
      throw new NotFoundException(
        `Employé ${employeeId} non trouvé dans votre service`,
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      throw new BadRequestException(
        'La date de début doit être avant la date de fin',
      );
    }

    // Check for overlapping approved leaves for this employee
    const overlapping = await this.leaveRequestRepository.find({
      where: {
        employeeId,
        serviceId,
        status: LeaveStatus.APPROVED,
        startDate: LessThanOrEqual(end),
        endDate: MoreThanOrEqual(start),
      },
    });

    if (overlapping.length > 0) {
      throw new BadRequestException(
        'Chevauchement avec un congé déjà approuvé',
      );
    }

    // Check for team conflicts (same role, same service)
    const teamMembers = await this.employeeRepository.find({
      where: {
        serviceId,
        role: employee.role,
        id: Not(employeeId),
        isActive: true,
      },
    });

    for (const member of teamMembers) {
      const memberLeaves = await this.leaveRequestRepository.find({
        where: {
          employeeId: member.id,
          serviceId,
          status: LeaveStatus.APPROVED,
          startDate: LessThanOrEqual(end),
          endDate: MoreThanOrEqual(start),
        },
      });

      if (memberLeaves.length > 0) {
        throw new BadRequestException(
          `Conflit : ${member.firstName} ${member.lastName} a déjà un congé approuvé durant cette période`,
        );
      }
    }

    const leaveRequest = this.leaveRequestRepository.create({
      employeeId,
      serviceId,
      startDate: start,
      endDate: end,
      days,
      type,
      status: LeaveStatus.PENDING,
    });

    return this.leaveRequestRepository.save(leaveRequest);
  }

  /**
   * Find all leave requests within a service
   * Optional filters: employeeId, status
   */
  async findAll(serviceId: string, employeeId?: string, status?: any) {
    const where: any = { serviceId };
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;

    return this.leaveRequestRepository.find({
      where,
      relations: ['employee', 'service'],
      order: { requestedAt: 'DESC' },
    });
  }

  /**
   * Find one leave request by ID within a service
   */
  async findOne(id: string, serviceId: string) {
    const leave = await this.leaveRequestRepository.findOne({
      where: { id, serviceId },
      relations: ['employee', 'service'],
    });

    if (!leave) {
      throw new NotFoundException(
        `Demande de congé ${id} non trouvée dans votre service`,
      );
    }

    return leave;
  }

  /**
   * Update a leave request (employee can update pending requests only)
   */
  async update(id: string, updateLeaveDto: UpdateLeaveDto, serviceId: string) {
    const leave = await this.findOne(id, serviceId);

    if (
      leave.status === LeaveStatus.APPROVED ||
      leave.status === LeaveStatus.REJECTED_BY_RH ||
      leave.status === LeaveStatus.REJECTED_BY_ADMIN
    ) {
      throw new BadRequestException(
        'Impossible de modifier un congé déjà approuvé ou rejeté',
      );
    }

    const updateData: any = {};
    if (updateLeaveDto.startDate) {
      updateData.startDate = new Date(updateLeaveDto.startDate);
    }
    if (updateLeaveDto.endDate) {
      updateData.endDate = new Date(updateLeaveDto.endDate);
    }
    if (updateLeaveDto.days) updateData.days = updateLeaveDto.days;
    if (updateLeaveDto.type) updateData.type = updateLeaveDto.type;

    await this.leaveRequestRepository.update(id, updateData);
    return this.findOne(id, serviceId);
  }

  /**
   * RH approves a leave request (first step)
   * Status: PENDING → APPROVED_BY_RH
   */
  async approveByRH(id: string, rhId: string, serviceId: string) {
    const leave = await this.findOne(id, serviceId);

    if (leave.status !== LeaveStatus.PENDING) {
      throw new BadRequestException(
        'Seules les demandes en attente peuvent être approuvées par RH',
      );
    }

    await this.leaveRequestRepository.update(id, {
      status: LeaveStatus.APPROVED_BY_RH,
      rhReviewedAt: new Date(),
      rhReviewedBy: rhId,
    });

    return this.findOne(id, serviceId);
  }

  /**
   * ADMIN approves a leave request (final step)
   * Status: APPROVED_BY_RH → APPROVED
   */
  async approveByAdmin(id: string, adminId: string, serviceId: string) {
    const leave = await this.findOne(id, serviceId);

    if (leave.status !== LeaveStatus.APPROVED_BY_RH) {
      throw new BadRequestException(
        'La demande doit d\'abord être approuvée par RH',
      );
    }

    const { employeeId, startDate, endDate } = leave;

    // Final check for overlapping approved leaves
    const existingApproved = await this.leaveRequestRepository.find({
      where: {
        employeeId,
        serviceId,
        status: LeaveStatus.APPROVED,
        startDate: LessThanOrEqual(endDate),
        endDate: MoreThanOrEqual(startDate),
      },
    });

    if (existingApproved.length > 0) {
      throw new BadRequestException(
        'L\'employé a déjà un congé approuvé durant cette période',
      );
    }

    await this.leaveRequestRepository.update(id, {
      status: LeaveStatus.APPROVED,
      adminReviewedAt: new Date(),
      adminReviewedBy: adminId,
    });

    return this.findOne(id, serviceId);
  }

  /**
   * RH rejects a leave request (first step)
   * Status: PENDING → REJECTED_BY_RH
   */
  async rejectByRH(
    id: string,
    rhId: string,
    serviceId: string,
    reason?: string,
  ) {
    const leave = await this.findOne(id, serviceId);

    if (leave.status !== LeaveStatus.PENDING) {
      throw new BadRequestException(
        'Seules les demandes en attente peuvent être rejetées par RH',
      );
    }

    await this.leaveRequestRepository.update(id, {
      status: LeaveStatus.REJECTED_BY_RH,
      rhReviewedAt: new Date(),
      rhReviewedBy: rhId,
      rhComment: reason,
    });

    return this.findOne(id, serviceId);
  }

  /**
   * ADMIN rejects a leave request (final step)
   * Status: APPROVED_BY_RH → REJECTED_BY_ADMIN
   */
  async rejectByAdmin(
    id: string,
    adminId: string,
    serviceId: string,
    reason?: string,
  ) {
    const leave = await this.findOne(id, serviceId);

    if (leave.status !== LeaveStatus.APPROVED_BY_RH) {
      throw new BadRequestException(
        'Seules les demandes approuvées par RH peuvent être rejetées par ADMIN',
      );
    }

    await this.leaveRequestRepository.update(id, {
      status: LeaveStatus.REJECTED_BY_ADMIN,
      adminReviewedAt: new Date(),
      adminReviewedBy: adminId,
      adminComment: reason,
    });

    return this.findOne(id, serviceId);
  }

  /**
   * Delete a leave request (ADMIN only)
   */
  async remove(id: string, serviceId: string) {
    await this.findOne(id, serviceId);
    await this.leaveRequestRepository.delete(id);
  }
}
