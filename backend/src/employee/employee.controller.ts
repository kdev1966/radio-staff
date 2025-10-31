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
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ServiceScopeGuard } from '../common/guards/service-scope.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/guards/roles.guard';
import { Permission } from '../common/enums/permission.enum';

/**
 * Employee Controller - Manages employees within radiology services
 * All routes are scoped to the authenticated user's service (except SUPER_ADMIN)
 */
@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard, ServiceScopeGuard)
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  /**
   * Get all employees in the authenticated user's service
   * Accessible by: ADMIN, RH (with manage_employees), EMPLOYE (read-only)
   */
  @Get()
  @Roles(Role.ADMIN, Role.RH, Role.EMPLOYE)
  async findAll(@CurrentUser('serviceId') serviceId: string) {
    return this.employeeService.findAll(serviceId);
  }

  /**
   * Get one employee by ID within the authenticated user's service
   * Accessible by: ADMIN, RH (with manage_employees), EMPLOYE (read-only)
   */
  @Get(':id')
  @Roles(Role.ADMIN, Role.RH, Role.EMPLOYE)
  async findOne(
    @Param('id') id: string,
    @CurrentUser('serviceId') serviceId: string,
  ) {
    return this.employeeService.findOne(id, serviceId);
  }

  /**
   * Create a new employee
   * Accessible by: ADMIN, RH (with manage_employees permission)
   */
  @Post()
  @Roles(Role.ADMIN, Role.RH)
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_EMPLOYEES)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createEmployeeDto: CreateEmployeeDto,
    @CurrentUser('serviceId') serviceId: string,
  ) {
    return this.employeeService.create(createEmployeeDto, serviceId);
  }

  /**
   * Update an employee
   * Accessible by: ADMIN, RH (with manage_employees permission)
   */
  @Patch(':id')
  @Roles(Role.ADMIN, Role.RH)
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_EMPLOYEES)
  async update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @CurrentUser('serviceId') serviceId: string,
  ) {
    return this.employeeService.update(id, updateEmployeeDto, serviceId);
  }

  /**
   * Archive an employee (soft delete)
   * Accessible by: ADMIN only
   */
  @Patch(':id/archive')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async archive(
    @Param('id') id: string,
    @CurrentUser('serviceId') serviceId: string,
  ) {
    return this.employeeService.archive(id, serviceId);
  }

  /**
   * Assign permissions to an RH employee
   * Accessible by: ADMIN only
   */
  @Patch(':id/permissions')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async assignPermissions(
    @Param('id') id: string,
    @Body('permissions') permissions: Permission[],
    @CurrentUser('serviceId') serviceId: string,
  ) {
    return this.employeeService.assignPermissions(id, permissions, serviceId);
  }

  /**
   * Permanently delete an employee
   * Accessible by: ADMIN only
   */
  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @CurrentUser('serviceId') serviceId: string,
  ) {
    await this.employeeService.remove(id, serviceId);
  }
}