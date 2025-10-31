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
import { ServiceAdminLeavesService } from './service-admin-leaves.service';
import { CreateLeaveDto } from '../leave/dto/create-leave.dto';
import { UpdateLeaveDto } from '../leave/dto/update-leave.dto';

/**
 * Service Admin Leaves Controller
 * Manages leave requests within a specific radiology service
 * Handles the complete approval workflow: RH → ADMIN
 */
@Controller('service-admin/leaves')
@UseGuards(JwtAuthGuard, ServiceContextGuard, RolesGuard)
export class ServiceAdminLeavesController {
  constructor(private readonly leavesService: ServiceAdminLeavesService) {}

  /**
   * Get all leave requests in the service
   * Supports filtering by status and employee
   */
  @Get()
  @Roles(Role.ADMIN, Role.RH)
  findAll(
    @ServiceId() serviceId: string,
    @Query('status') status?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.leavesService.findAllByService(serviceId, { status, employeeId });
  }

  /**
   * Get one leave request by ID
   */
  @Get(':id')
  @Roles(Role.ADMIN, Role.RH, Role.EMPLOYE)
  findOne(@ServiceId() serviceId: string, @Param('id') id: string) {
    return this.leavesService.findOne(serviceId, id);
  }

  /**
   * Create a leave request
   * Any employee can create
   */
  @Post()
  @Roles(Role.ADMIN, Role.RH, Role.EMPLOYE)
  @HttpCode(HttpStatus.CREATED)
  create(
    @ServiceId() serviceId: string,
    @Body() createDto: CreateLeaveDto,
  ) {
    return this.leavesService.create(serviceId, createDto);
  }

  /**
   * Update a leave request
   * Only creator can update if still PENDING
   */
  @Patch(':id')
  @Roles(Role.ADMIN, Role.RH, Role.EMPLOYE)
  update(
    @ServiceId() serviceId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateLeaveDto,
  ) {
    return this.leavesService.update(serviceId, id, updateDto);
  }

  /**
   * RH approves leave request
   * Status: PENDING → APPROVED_BY_RH
   */
  @Post(':id/approve-rh')
  @Roles(Role.ADMIN, Role.RH)
  @HttpCode(HttpStatus.OK)
  approveByRH(@ServiceId() serviceId: string, @Param('id') id: string) {
    return this.leavesService.approveByRH(serviceId, id);
  }

  /**
   * RH rejects leave request
   * Status: PENDING → REJECTED_BY_RH
   */
  @Post(':id/reject-rh')
  @Roles(Role.ADMIN, Role.RH)
  @HttpCode(HttpStatus.OK)
  rejectByRH(
    @ServiceId() serviceId: string,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.leavesService.rejectByRH(serviceId, id, body.reason);
  }

  /**
   * ADMIN approves leave request (final approval)
   * Status: APPROVED_BY_RH → APPROVED
   */
  @Post(':id/approve-admin')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  approveByAdmin(@ServiceId() serviceId: string, @Param('id') id: string) {
    return this.leavesService.approveByAdmin(serviceId, id);
  }

  /**
   * ADMIN rejects leave request
   * Status: APPROVED_BY_RH → REJECTED_BY_ADMIN
   */
  @Post(':id/reject-admin')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  rejectByAdmin(
    @ServiceId() serviceId: string,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.leavesService.rejectByAdmin(serviceId, id, body.reason);
  }

  /**
   * Delete a leave request
   * Only creator can delete if still PENDING
   */
  @Delete(':id')
  @Roles(Role.ADMIN, Role.RH, Role.EMPLOYE)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@ServiceId() serviceId: string, @Param('id') id: string) {
    return this.leavesService.remove(serviceId, id);
  }

  /**
   * Get leave statistics for the service
   */
  @Get('stats/overview')
  @Roles(Role.ADMIN, Role.RH)
  getStats(@ServiceId() serviceId: string) {
    return this.leavesService.getServiceStats(serviceId);
  }

  /**
   * Get pending approvals for RH
   */
  @Get('pending/rh')
  @Roles(Role.ADMIN, Role.RH)
  getPendingForRH(@ServiceId() serviceId: string) {
    return this.leavesService.getPendingForRH(serviceId);
  }

  /**
   * Get pending approvals for ADMIN
   */
  @Get('pending/admin')
  @Roles(Role.ADMIN)
  getPendingForAdmin(@ServiceId() serviceId: string) {
    return this.leavesService.getPendingForAdmin(serviceId);
  }
}
