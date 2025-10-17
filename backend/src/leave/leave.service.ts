import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveDto } from './dto/update-leave.dto';

@Injectable()
export class LeaveService {
  constructor(private prisma: PrismaService) {}

  async create(createLeaveDto: CreateLeaveDto) {
    const { employeeId, startDate, endDate, days, type } = createLeaveDto;

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { roles: true },
    });

    if (!employee) {
      throw new NotFoundException(`Employee ${employeeId} not found`);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      throw new BadRequestException('Start date must be before end date');
    }

    const overlapping = await this.prisma.leaveRequest.findMany({
      where: {
        employeeId,
        status: 'APPROVED',
        OR: [
          {
            AND: [
              { startDate: { lte: end } },
              { endDate: { gte: start } },
            ],
          },
        ],
      },
    });

    if (overlapping.length > 0) {
      throw new BadRequestException(
        'Leave request overlaps with an already approved leave',
      );
    }

    const teamMembers = await this.prisma.employee.findMany({
      where: {
        roles: {
          some: {
            roleId: {
              in: employee.roles.map((r: any) => r.roleId),
            },
          },
        },
        NOT: { id: employeeId },
      },
      include: {
        leaveRequests: {
          where: {
            status: 'APPROVED',
            OR: [
              {
                AND: [
                  { startDate: { lte: end } },
                  { endDate: { gte: start } },
                ],
              },
            ],
          },
        },
      },
    });

    const conflictingMembers = teamMembers.filter(
      (m: any) => m.leaveRequests.length > 0,
    );

    if (conflictingMembers.length > 0) {
      throw new BadRequestException(
        `Team member(s) already have approved leave during this period: ${conflictingMembers.map((m: any) => `${m.firstName} ${m.lastName}`).join(', ')}`,
      );
    }

    return this.prisma.leaveRequest.create({
      data: {
        employeeId,
        startDate: start,
        endDate: end,
        days,
        type,
        status: 'PENDING',
      },
      include: {
        employee: true,
      },
    });
  }

  async findAll(employeeId?: string, status?: string) {
    return this.prisma.leaveRequest.findMany({
      where: {
        ...(employeeId && { employeeId }),
        ...(status && { status }),
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { requestedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const leave = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        employee: true,
      },
    });

    if (!leave) {
      throw new NotFoundException(`Leave request ${id} not found`);
    }

    return leave;
  }

  async update(id: string, updateLeaveDto: UpdateLeaveDto) {
    const leave = await this.findOne(id);

    if (leave.status === 'APPROVED' || leave.status === 'REJECTED') {
      throw new BadRequestException(
        'Cannot update an already approved or rejected leave request',
      );
    }

    return this.prisma.leaveRequest.update({
      where: { id },
      data: {
        ...updateLeaveDto,
      },
      include: {
        employee: true,
      },
    });
  }

  async approveByManager(id: string, managerId: string) {
    const leave = await this.findOne(id);

    if (leave.status !== 'PENDING') {
      throw new BadRequestException(
        'Only pending leave requests can be approved by manager',
      );
    }

    return this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'APPROVED_BY_MANAGER',
        managerApprovedAt: new Date(),
        managerApprovedBy: managerId,
      },
      include: {
        employee: true,
      },
    });
  }

  async approveByHR(id: string, hrId: string) {
    const leave = await this.findOne(id);

    if (leave.status !== 'APPROVED_BY_MANAGER') {
      throw new BadRequestException(
        'Leave request must be approved by manager first',
      );
    }

    const { employeeId, startDate, endDate } = leave;

    const existingApproved = await this.prisma.leaveRequest.findMany({
      where: {
        employeeId,
        status: 'APPROVED',
        OR: [
          {
            AND: [
              { startDate: { lte: endDate } },
              { endDate: { gte: startDate } },
            ],
          },
        ],
      },
    });

    if (existingApproved.length > 0) {
      throw new BadRequestException(
        'Employee already has an approved leave during this period',
      );
    }

    return this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        hrApprovedAt: new Date(),
        hrApprovedBy: hrId,
      },
      include: {
        employee: true,
      },
    });
  }

  async reject(id: string, rejectedBy: string, reason?: string) {
    const leave = await this.findOne(id);

    if (leave.status === 'APPROVED' || leave.status === 'REJECTED') {
      throw new BadRequestException(
        'Cannot reject an already approved or rejected leave request',
      );
    }

    return this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectedBy,
        rejectionReason: reason,
      },
      include: {
        employee: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.leaveRequest.delete({
      where: { id },
    });
  }
}
