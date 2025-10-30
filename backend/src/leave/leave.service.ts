import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { LeaveRequest, LeaveStatus } from '../entities/leave-request.entity';
import { Employee } from '../entities/employee.entity';
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

  async create(createLeaveDto: CreateLeaveDto) {
    const { employeeId, startDate, endDate, days, type } = createLeaveDto;

    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException(`Employee ${employeeId} not found`);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      throw new BadRequestException('Start date must be before end date');
    }

    const overlapping = await this.leaveRequestRepository.find({
      where: {
        employeeId,
        status: LeaveStatus.APPROVED,
        startDate: LessThanOrEqual(end),
        endDate: MoreThanOrEqual(start),
      },
    });

    if (overlapping.length > 0) {
      throw new BadRequestException(
        'Leave request overlaps with an already approved leave',
      );
    }

    const teamMembers = await this.employeeRepository.find({
      where: {
        role: employee.role,
        id: Not(employeeId),
      },
      relations: ['leaveRequests'],
    });

    const conflictingMembers = teamMembers.filter((m) =>
      m.leaveRequests?.some(
        (lr) =>
          lr.status === LeaveStatus.APPROVED &&
          lr.startDate <= end &&
          lr.endDate >= start,
      ),
    );

    if (conflictingMembers.length > 0) {
      throw new BadRequestException(
        `Team member(s) already have approved leave during this period: ${conflictingMembers.map((m) => `${m.firstName} ${m.lastName}`).join(', ')}`,
      );
    }

    const leaveRequest = this.leaveRequestRepository.create({
      employeeId,
      startDate: start,
      endDate: end,
      days,
      type,
      status: LeaveStatus.PENDING,
    });

    return this.leaveRequestRepository.save(leaveRequest);
  }

  async findAll(employeeId?: string, status?: any) {
    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;

    return this.leaveRequestRepository.find({
      where,
      relations: ['employee'],
      order: { requestedAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const leave = await this.leaveRequestRepository.findOne({
      where: { id },
      relations: ['employee'],
    });

    if (!leave) {
      throw new NotFoundException(`Leave request ${id} not found`);
    }

    return leave;
  }

  async update(id: string, updateLeaveDto: UpdateLeaveDto) {
    const leave = await this.findOne(id);

    if (leave.status === LeaveStatus.APPROVED || leave.status === LeaveStatus.REJECTED) {
      throw new BadRequestException(
        'Cannot update an already approved or rejected leave request',
      );
    }

    const updateData: any = {};
    if (updateLeaveDto.status) updateData.status = updateLeaveDto.status;
    if (updateLeaveDto.decidedBy) updateData.decidedBy = updateLeaveDto.decidedBy;

    await this.leaveRequestRepository.update(id, updateData);
    return this.findOne(id);
  }

  async approveByManager(id: string, managerId: string) {
    const leave = await this.findOne(id);

    if (leave.status !== LeaveStatus.PENDING) {
      throw new BadRequestException(
        'Only pending leave requests can be approved by manager',
      );
    }

    await this.leaveRequestRepository.update(id, {
      status: LeaveStatus.APPROVED_BY_MANAGER,
      managerApprovedAt: new Date(),
      managerApprovedBy: managerId,
    });

    return this.findOne(id);
  }

  async approveByHR(id: string, hrId: string) {
    const leave = await this.findOne(id);

    if (leave.status !== LeaveStatus.APPROVED_BY_MANAGER) {
      throw new BadRequestException(
        'Leave request must be approved by manager first',
      );
    }

    const { employeeId, startDate, endDate } = leave;

    const existingApproved = await this.leaveRequestRepository.find({
      where: {
        employeeId,
        status: LeaveStatus.APPROVED,
        startDate: LessThanOrEqual(endDate),
        endDate: MoreThanOrEqual(startDate),
      },
    });

    if (existingApproved.length > 0) {
      throw new BadRequestException(
        'Employee already has an approved leave during this period',
      );
    }

    await this.leaveRequestRepository.update(id, {
      status: LeaveStatus.APPROVED,
      hrApprovedAt: new Date(),
      hrApprovedBy: hrId,
    });

    return this.findOne(id);
  }

  async reject(id: string, rejectedBy: string, reason?: string) {
    const leave = await this.findOne(id);

    if (leave.status === LeaveStatus.APPROVED || leave.status === LeaveStatus.REJECTED) {
      throw new BadRequestException(
        'Cannot reject an already approved or rejected leave request',
      );
    }

    await this.leaveRequestRepository.update(id, {
      status: LeaveStatus.REJECTED,
      rejectedAt: new Date(),
      rejectedBy,
      rejectionReason: reason,
    });

    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.leaveRequestRepository.delete(id);
  }
}
