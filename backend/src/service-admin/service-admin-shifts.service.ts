import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Shift, ShiftPeriod, DayType } from '../entities/shift.entity';
import { ShiftAssignment } from '../entities/shift-assignment.entity';
import { Employee } from '../entities/employee.entity';
import { CreateShiftDto } from '../shift/dto/create-shift.dto';
import { UpdateShiftDto } from '../shift/dto/update-shift.dto';

/**
 * Service Admin Shifts Service
 * Handles shift planning and employee assignment within a specific service
 */
@Injectable()
export class ServiceAdminShiftsService {
  constructor(
    @InjectRepository(Shift)
    private readonly shiftRepo: Repository<Shift>,
    @InjectRepository(ShiftAssignment)
    private readonly assignmentRepo: Repository<ShiftAssignment>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
  ) {}

  /**
   * Find all shifts in a service with optional filters
   */
  async findAllByService(
    serviceId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      type?: string;
      employeeId?: string;
    },
  ) {
    const queryBuilder = this.shiftRepo
      .createQueryBuilder('shift')
      .leftJoin('shift.assignments', 'assignment')
      .leftJoin('assignment.employee', 'employee')
      .addSelect([
        'assignment.id',
        'assignment.shiftId',
        'assignment.employeeId',
        'assignment.assignedAt',
        'assignment.assignedBy',
      ])
      .addSelect([
        'employee.id',
        'employee.firstName',
        'employee.lastName',
        'employee.matricule',
      ])
      .where('shift.serviceId = :serviceId', { serviceId })
      .orderBy('shift.shiftDate', 'ASC')
      .addOrderBy('shift.period', 'ASC');

    if (filters?.startDate) {
      queryBuilder.andWhere('shift.shiftDate >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters?.endDate) {
      queryBuilder.andWhere('shift.shiftDate <= :endDate', {
        endDate: filters.endDate,
      });
    }

    if (filters?.type) {
      queryBuilder.andWhere('shift.period = :type', { type: filters.type });
    }

    if (filters?.employeeId) {
      queryBuilder.andWhere('assignment.employeeId = :employeeId', {
        employeeId: filters.employeeId,
      });
    }

    const shifts = await queryBuilder.getMany();

    return shifts.map((shift) => this.formatShift(shift));
  }

  /**
   * Find one shift by ID within a service
   */
  async findOne(serviceId: string, shiftId: string) {
    const shift = await this.shiftRepo
      .createQueryBuilder('shift')
      .leftJoin('shift.assignments', 'assignment')
      .leftJoin('assignment.employee', 'employee')
      .addSelect([
        'assignment.id',
        'assignment.shiftId',
        'assignment.employeeId',
        'assignment.assignedAt',
        'assignment.assignedBy',
      ])
      .addSelect([
        'employee.id',
        'employee.firstName',
        'employee.lastName',
        'employee.matricule',
      ])
      .where('shift.id = :shiftId', { shiftId })
      .andWhere('shift.serviceId = :serviceId', { serviceId })
      .getOne();

    if (!shift) {
      throw new NotFoundException(
        `Shift with ID ${shiftId} not found in this service`,
      );
    }

    return this.formatShift(shift);
  }

  /**
   * Create a new shift
   */
  async create(serviceId: string, createDto: CreateShiftDto) {
    // Check if shift already exists for this date and period
    const shiftDate = new Date(createDto.shiftDate);
    const existing = await this.shiftRepo
      .createQueryBuilder('shift')
      .where('shift.serviceId = :serviceId', { serviceId })
      .andWhere('shift.shiftDate = :shiftDate', { shiftDate })
      .andWhere('shift.period = :period', { period: createDto.period })
      .getOne();

    if (existing) {
      throw new ConflictException(
        `A shift for ${createDto.period} on ${createDto.shiftDate} already exists`,
      );
    }

    const shift = this.shiftRepo.create({
      ...createDto,
      serviceId,
    });

    const saved = await this.shiftRepo.save(shift);
    return this.findOne(serviceId, saved.id);
  }

  /**
   * Update a shift
   */
  async update(serviceId: string, shiftId: string, updateDto: UpdateShiftDto) {
    const shift = await this.shiftRepo.findOne({
      where: { id: shiftId, serviceId },
    });

    if (!shift) {
      throw new NotFoundException(
        `Shift with ID ${shiftId} not found in this service`,
      );
    }

    // If updating date or period, check for conflicts
    if (updateDto.shiftDate || updateDto.period) {
      const newDate = updateDto.shiftDate
        ? new Date(updateDto.shiftDate)
        : shift.shiftDate;
      const newPeriod = updateDto.period || shift.period;

      const existing = await this.shiftRepo
        .createQueryBuilder('shift')
        .where('shift.serviceId = :serviceId', { serviceId })
        .andWhere('shift.shiftDate = :shiftDate', { shiftDate: newDate })
        .andWhere('shift.period = :period', { period: newPeriod })
        .getOne();

      if (existing && existing.id !== shiftId) {
        throw new ConflictException(
          `A shift for ${newPeriod} on ${newDate} already exists`,
        );
      }
    }

    await this.shiftRepo.update(shiftId, updateDto);
    return this.findOne(serviceId, shiftId);
  }

  /**
   * Assign employee to a shift
   */
  async assignEmployee(serviceId: string, shiftId: string, employeeId: string) {
    const shift = await this.shiftRepo
      .createQueryBuilder('shift')
      .leftJoin('shift.assignments', 'assignment')
      .addSelect(['assignment.id', 'assignment.employeeId'])
      .where('shift.id = :shiftId', { shiftId })
      .andWhere('shift.serviceId = :serviceId', { serviceId })
      .getOne();

    if (!shift) {
      throw new NotFoundException(
        `Shift with ID ${shiftId} not found in this service`,
      );
    }

    // Verify employee exists and belongs to service
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId, serviceId },
    });

    if (!employee) {
      throw new NotFoundException(
        `Employee with ID ${employeeId} not found in this service`,
      );
    }

    // Check if employee is already assigned to this shift
    const existingAssignment = await this.assignmentRepo
      .createQueryBuilder('assignment')
      .select(['assignment.id'])
      .where('assignment.shiftId = :shiftId', { shiftId })
      .andWhere('assignment.employeeId = :employeeId', { employeeId })
      .getOne();

    if (existingAssignment) {
      throw new ConflictException(
        'Employee is already assigned to this shift',
      );
    }

    // Check for time conflicts
    // Convert dates from query builder results (strings) to Date objects
    const shiftDate =
      typeof shift.shiftDate === 'string'
        ? new Date(shift.shiftDate)
        : shift.shiftDate;
    const startTime =
      typeof shift.startTime === 'string'
        ? new Date(shift.startTime)
        : shift.startTime;
    const endTime =
      typeof shift.endTime === 'string'
        ? new Date(shift.endTime)
        : shift.endTime;

    const hasConflict = await this.hasTimeConflict(
      employeeId,
      shiftDate,
      startTime,
      endTime,
    );

    if (hasConflict) {
      throw new ConflictException(
        'Employee has a conflicting shift at this time',
      );
    }

    // Create assignment using raw query to avoid position_id column
    await this.assignmentRepo.query(
      `INSERT INTO shift_assignments (shift_id, employee_id, assigned_at)
       VALUES ($1, $2, NOW())`,
      [shiftId, employeeId],
    );

    return this.findOne(serviceId, shiftId);
  }

  /**
   * Unassign employee from a shift
   */
  async unassignEmployee(serviceId: string, shiftId: string) {
    const shift = await this.shiftRepo
      .createQueryBuilder('shift')
      .leftJoin('shift.assignments', 'assignment')
      .addSelect(['assignment.id'])
      .where('shift.id = :shiftId', { shiftId })
      .andWhere('shift.serviceId = :serviceId', { serviceId })
      .getOne();

    if (!shift) {
      throw new NotFoundException(
        `Shift with ID ${shiftId} not found in this service`,
      );
    }

    if (!shift.assignments || shift.assignments.length === 0) {
      throw new BadRequestException('No employee assigned to this shift');
    }

    // Delete all assignments for this shift
    await this.assignmentRepo.delete({ shiftId });
    return this.findOne(serviceId, shiftId);
  }

  /**
   * Delete a shift
   */
  async remove(serviceId: string, shiftId: string) {
    const shift = await this.shiftRepo.findOne({
      where: { id: shiftId, serviceId },
    });

    if (!shift) {
      throw new NotFoundException(
        `Shift with ID ${shiftId} not found in this service`,
      );
    }

    await this.shiftRepo.delete(shiftId);
  }

  /**
   * Get shift statistics for the service
   */
  async getServiceStats(serviceId: string) {
    // Get total shifts count
    const total = await this.shiftRepo.count({ where: { serviceId } });

    // Count assigned shifts (shifts with at least one assignment)
    const assignedCount = await this.shiftRepo
      .createQueryBuilder('shift')
      .innerJoin('shift.assignments', 'assignment')
      .where('shift.serviceId = :serviceId', { serviceId })
      .groupBy('shift.id')
      .getCount();

    const unassigned = total - assignedCount;

    // Get shifts without loading any relations for period and day type counts
    const shifts = await this.shiftRepo.find({
      where: { serviceId },
      select: ['id', 'period', 'dayType'],
    });

    // Count by period
    const byPeriod: Record<string, number> = {};
    shifts.forEach((shift) => {
      byPeriod[shift.period] = (byPeriod[shift.period] || 0) + 1;
    });

    // Count by day type
    const byDayType: Record<string, number> = {};
    shifts.forEach((shift) => {
      byDayType[shift.dayType] = (byDayType[shift.dayType] || 0) + 1;
    });

    return {
      total,
      assigned: assignedCount,
      unassigned,
      byPeriod: Object.entries(byPeriod).map(([period, count]) => ({
        period,
        count,
      })),
      byDayType: Object.entries(byDayType).map(([dayType, count]) => ({
        dayType,
        count,
      })),
    };
  }

  /**
   * Get unassigned shifts
   */
  async getUnassignedShifts(serviceId: string) {
    const shifts = await this.shiftRepo
      .createQueryBuilder('shift')
      .leftJoin('shift.assignments', 'assignment')
      .where('shift.serviceId = :serviceId', { serviceId })
      .andWhere('assignment.id IS NULL')
      .orderBy('shift.shiftDate', 'ASC')
      .addOrderBy('shift.period', 'ASC')
      .getMany();

    return shifts.map((shift) => this.formatShift(shift));
  }

  /**
   * Get shifts for a specific employee
   */
  async getEmployeeShifts(
    serviceId: string,
    employeeId: string,
    filters?: { startDate?: string; endDate?: string },
  ) {
    const queryBuilder = this.shiftRepo
      .createQueryBuilder('shift')
      .innerJoin('shift.assignments', 'assignment')
      .innerJoin('assignment.employee', 'employee')
      .addSelect([
        'assignment.id',
        'assignment.shiftId',
        'assignment.employeeId',
        'assignment.assignedAt',
        'assignment.assignedBy',
      ])
      .addSelect([
        'employee.id',
        'employee.firstName',
        'employee.lastName',
        'employee.matricule',
      ])
      .where('shift.serviceId = :serviceId', { serviceId })
      .andWhere('assignment.employeeId = :employeeId', { employeeId })
      .orderBy('shift.shiftDate', 'ASC')
      .addOrderBy('shift.period', 'ASC');

    if (filters?.startDate) {
      queryBuilder.andWhere('shift.shiftDate >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters?.endDate) {
      queryBuilder.andWhere('shift.shiftDate <= :endDate', {
        endDate: filters.endDate,
      });
    }

    const shifts = await queryBuilder.getMany();
    return shifts.map((shift) => this.formatShift(shift));
  }

  /**
   * Check for time conflicts for an employee
   */
  async checkConflicts(
    serviceId: string,
    data: {
      employeeId: string;
      shiftDate: string;
      startTime: string;
      endTime: string;
    },
  ) {
    const hasConflict = await this.hasTimeConflict(
      data.employeeId,
      new Date(data.shiftDate),
      data.startTime as any,
      data.endTime as any,
    );

    return {
      hasConflict,
      message: hasConflict
        ? 'Employee has a conflicting shift at this time'
        : 'No conflicts found',
    };
  }

  /**
   * Get weekly schedule
   */
  async getWeeklySchedule(serviceId: string, weekStart: string) {
    const startDate = new Date(weekStart);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    const shifts = await this.shiftRepo
      .createQueryBuilder('shift')
      .leftJoin('shift.assignments', 'assignment')
      .leftJoin('assignment.employee', 'employee')
      .addSelect([
        'assignment.id',
        'assignment.shiftId',
        'assignment.employeeId',
        'assignment.assignedAt',
        'assignment.assignedBy',
      ])
      .addSelect([
        'employee.id',
        'employee.firstName',
        'employee.lastName',
        'employee.matricule',
      ])
      .where('shift.serviceId = :serviceId', { serviceId })
      .andWhere('shift.shiftDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .orderBy('shift.shiftDate', 'ASC')
      .addOrderBy('shift.period', 'ASC')
      .getMany();

    return shifts.map((shift) => this.formatShift(shift));
  }

  /**
   * Get monthly schedule
   */
  async getMonthlySchedule(serviceId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const shifts = await this.shiftRepo
      .createQueryBuilder('shift')
      .leftJoin('shift.assignments', 'assignment')
      .leftJoin('assignment.employee', 'employee')
      .addSelect([
        'assignment.id',
        'assignment.shiftId',
        'assignment.employeeId',
        'assignment.assignedAt',
        'assignment.assignedBy',
      ])
      .addSelect([
        'employee.id',
        'employee.firstName',
        'employee.lastName',
        'employee.matricule',
      ])
      .where('shift.serviceId = :serviceId', { serviceId })
      .andWhere('shift.shiftDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .orderBy('shift.shiftDate', 'ASC')
      .addOrderBy('shift.period', 'ASC')
      .getMany();

    return shifts.map((shift) => this.formatShift(shift));
  }

  /**
   * Check if employee has a time conflict
   */
  private async hasTimeConflict(
    employeeId: string,
    shiftDate: Date,
    startTime: Date,
    endTime: Date,
  ): Promise<boolean> {
    const existingAssignments = await this.assignmentRepo
      .createQueryBuilder('assignment')
      .select(['assignment.id', 'assignment.employeeId', 'assignment.shiftId'])
      .leftJoin('assignment.shift', 'shift')
      .addSelect([
        'shift.id',
        'shift.shiftDate',
        'shift.startTime',
        'shift.endTime',
      ])
      .where('assignment.employeeId = :employeeId', { employeeId })
      .getMany();

    for (const assignment of existingAssignments) {
      const shift = assignment.shift;
      if (!shift) continue;

      // Convert shift date to Date object if it's a string
      const existingDate =
        typeof shift.shiftDate === 'string'
          ? new Date(shift.shiftDate)
          : shift.shiftDate;

      // Check if same date
      const existingDateStr = existingDate.toISOString().split('T')[0];
      const newDateStr = shiftDate.toISOString().split('T')[0];

      if (existingDateStr === newDateStr) {
        // Convert times to Date objects for comparison
        const existingStart =
          typeof shift.startTime === 'string'
            ? new Date(shift.startTime)
            : shift.startTime;
        const existingEnd =
          typeof shift.endTime === 'string'
            ? new Date(shift.endTime)
            : shift.endTime;

        // Check if times overlap
        if (
          (startTime >= existingStart && startTime < existingEnd) ||
          (endTime > existingStart && endTime <= existingEnd) ||
          (startTime <= existingStart && endTime >= existingEnd)
        ) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Format shift response
   */
  private formatShift(shift: Shift) {
    const assignments = shift.assignments || [];

    return {
      id: shift.id,
      serviceId: shift.serviceId,
      shiftDate: shift.shiftDate,
      period: shift.period,
      startTime: shift.startTime,
      endTime: shift.endTime,
      dayType: shift.dayType,
      needed: shift.needed,
      assigned: assignments.length,
      assignments: assignments.map((a) => ({
        id: a.id,
        employeeId: a.employeeId,
        employeeName: a.employee
          ? `${a.employee.firstName} ${a.employee.lastName}`
          : 'Unknown',
        employeeMatricule: a.employee?.matricule,
        assignedAt: a.assignedAt,
      })),
    };
  }
}
