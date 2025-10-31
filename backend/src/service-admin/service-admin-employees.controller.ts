import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ServiceContextGuard } from '../common/guards/service-context.guard';
import { RolesGuard, Role } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ServiceId } from '../common/decorators/service-id.decorator';
import { EmployeeRole } from '../entities/employee.entity';
import { ServiceAdminEmployeesService } from './service-admin-employees.service';
import { CreateEmployeeDto } from '../employee/dto/create-employee.dto';
import { UpdateEmployeeDto } from '../employee/dto/update-employee.dto';

/**
 * Service Admin Employees Controller
 * Manages employees within a specific radiology service
 * All operations are scoped to the authenticated user's service
 */
@Controller('service-admin/employees')
@UseGuards(JwtAuthGuard, ServiceContextGuard, RolesGuard)
@Roles(Role.ADMIN, Role.RH)
export class ServiceAdminEmployeesController {
  constructor(
    private readonly employeesService: ServiceAdminEmployeesService,
  ) {}

  /**
   * Get all employees in the service
   */
  @Get()
  findAll(@ServiceId() serviceId: string) {
    return this.employeesService.findAllByService(serviceId);
  }

  /**
   * Get one employee by ID (within service)
   */
  @Get(':id')
  findOne(@ServiceId() serviceId: string, @Param('id') id: string) {
    return this.employeesService.findOne(serviceId, id);
  }

  /**
   * Create a new employee in the service
   * Only ADMIN can create employees
   */
  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(
    @ServiceId() serviceId: string,
    @Body() createDto: CreateEmployeeDto,
  ) {
    return this.employeesService.create(serviceId, createDto);
  }

  /**
   * Update an employee
   */
  @Patch(':id')
  update(
    @ServiceId() serviceId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(serviceId, id, updateDto);
  }

  /**
   * Archive an employee (soft delete)
   */
  @Patch(':id/archive')
  archive(@ServiceId() serviceId: string, @Param('id') id: string) {
    return this.employeesService.archive(serviceId, id);
  }

  /**
   * Restore an archived employee
   */
  @Patch(':id/restore')
  restore(@ServiceId() serviceId: string, @Param('id') id: string) {
    return this.employeesService.restore(serviceId, id);
  }

  /**
   * Update employee permissions
   * Only ADMIN can update permissions
   */
  @Patch(':id/permissions')
  @Roles(Role.ADMIN)
  updatePermissions(
    @ServiceId() serviceId: string,
    @Param('id') id: string,
    @Body() permissionsDto: { role: EmployeeRole },
  ) {
    return this.employeesService.updatePermissions(
      serviceId,
      id,
      permissionsDto.role,
    );
  }

  /**
   * Delete an employee permanently
   * Only ADMIN can delete
   */
  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@ServiceId() serviceId: string, @Param('id') id: string) {
    return this.employeesService.remove(serviceId, id);
  }

  /**
   * Get employee statistics for the service
   */
  @Get('stats/overview')
  getStats(@ServiceId() serviceId: string) {
    return this.employeesService.getServiceStats(serviceId);
  }
}
