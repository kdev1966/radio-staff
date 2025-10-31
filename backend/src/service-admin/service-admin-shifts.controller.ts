import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ServiceContextGuard } from '../common/guards/service-context.guard';
import { RolesGuard, Role } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ServiceId } from '../common/decorators/service-id.decorator';
import { ServiceAdminShiftsService } from './service-admin-shifts.service';
import { CreateShiftDto } from '../shift/dto/create-shift.dto';
import { UpdateShiftDto } from '../shift/dto/update-shift.dto';
import { AssignShiftDto } from '../shift/dto/assign-shift.dto';

/**
 * Service Admin Shifts Controller
 * Manages shift planning and assignments within a specific radiology service
 */
@Controller('service-admin/shifts')
@UseGuards(JwtAuthGuard, ServiceContextGuard, RolesGuard)
export class ServiceAdminShiftsController {
  constructor(private readonly shiftsService: ServiceAdminShiftsService) {}

  /**
   * Get shift statistics for the service
   */
  @Get('stats/overview')
  @Roles(Role.ADMIN, Role.RH)
  getStats(@ServiceId() serviceId: string) {
    return this.shiftsService.getServiceStats(serviceId);
  }

  /**
   * Get unassigned shifts
   */
  @Get('unassigned/list')
  @Roles(Role.ADMIN, Role.RH)
  getUnassigned(@ServiceId() serviceId: string) {
    return this.shiftsService.getUnassignedShifts(serviceId);
  }

  /**
   * Get weekly schedule
   */
  @Get('weekly/:weekStart')
  @Roles(Role.ADMIN, Role.RH)
  getWeeklySchedule(
    @ServiceId() serviceId: string,
    @Param('weekStart') weekStart: string,
  ) {
    return this.shiftsService.getWeeklySchedule(serviceId, weekStart);
  }

  /**
   * Get monthly schedule
   */
  @Get('monthly/:year/:month')
  @Roles(Role.ADMIN, Role.RH)
  getMonthlySchedule(
    @ServiceId() serviceId: string,
    @Param('year') year: string,
    @Param('month') month: string,
  ) {
    return this.shiftsService.getMonthlySchedule(
      serviceId,
      parseInt(year),
      parseInt(month),
    );
  }

  /**
   * Get shifts for a specific employee
   */
  @Get('employee/:employeeId')
  @Roles(Role.ADMIN, Role.RH, Role.EMPLOYE)
  getEmployeeShifts(
    @ServiceId() serviceId: string,
    @Param('employeeId') employeeId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.shiftsService.getEmployeeShifts(serviceId, employeeId, {
      startDate,
      endDate,
    });
  }

  /**
   * Get all shifts in the service
   * Supports filtering by date range, type, and employee
   */
  @Get()
  @Roles(Role.ADMIN, Role.RH)
  findAll(
    @ServiceId() serviceId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.shiftsService.findAllByService(serviceId, {
      startDate,
      endDate,
      type,
      employeeId,
    });
  }

  /**
   * Get one shift by ID
   */
  @Get(':id')
  @Roles(Role.ADMIN, Role.RH, Role.EMPLOYE)
  findOne(@ServiceId() serviceId: string, @Param('id') id: string) {
    return this.shiftsService.findOne(serviceId, id);
  }

  /**
   * Create a new shift
   * Only ADMIN and RH can create shifts
   */
  @Post()
  @Roles(Role.ADMIN, Role.RH)
  @HttpCode(HttpStatus.CREATED)
  create(@ServiceId() serviceId: string, @Body() createDto: CreateShiftDto) {
    return this.shiftsService.create(serviceId, createDto);
  }

  /**
   * Update a shift
   * Only ADMIN and RH can update shifts
   */
  @Patch(':id')
  @Roles(Role.ADMIN, Role.RH)
  update(
    @ServiceId() serviceId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateShiftDto,
  ) {
    return this.shiftsService.update(serviceId, id, updateDto);
  }

  /**
   * Assign employee to a shift
   * Only ADMIN and RH can assign shifts
   */
  @Post(':id/assign')
  @Roles(Role.ADMIN, Role.RH)
  @HttpCode(HttpStatus.OK)
  assign(
    @ServiceId() serviceId: string,
    @Param('id') id: string,
    @Body() assignDto: AssignShiftDto,
  ) {
    return this.shiftsService.assignEmployee(serviceId, id, assignDto.employeeId);
  }

  /**
   * Unassign employee from a shift
   * Only ADMIN and RH can unassign shifts
   */
  @Post(':id/unassign')
  @Roles(Role.ADMIN, Role.RH)
  @HttpCode(HttpStatus.OK)
  unassign(@ServiceId() serviceId: string, @Param('id') id: string) {
    return this.shiftsService.unassignEmployee(serviceId, id);
  }

  /**
   * Delete a shift
   * Only ADMIN can delete shifts
   */
  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@ServiceId() serviceId: string, @Param('id') id: string) {
    return this.shiftsService.remove(serviceId, id);
  }

  /**
   * Check for shift conflicts for an employee
   */
  @Post('check-conflicts')
  @Roles(Role.ADMIN, Role.RH)
  @HttpCode(HttpStatus.OK)
  checkConflicts(
    @ServiceId() serviceId: string,
    @Body()
    body: {
      employeeId: string;
      shiftDate: string;
      startTime: string;
      endTime: string;
    },
  ) {
    return this.shiftsService.checkConflicts(serviceId, body);
  }
}
