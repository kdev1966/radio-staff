import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LeaveService } from './leave.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveDto } from './dto/update-leave.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Role } from '../common/guards/roles.guard';
import { ServiceScopeGuard } from '../common/guards/service-scope.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permission } from '../common/enums/permission.enum';

/**
 * Leave Controller - Manages leave requests within radiology services
 * Implements 2-step approval workflow: EMPLOYE → RH → ADMIN
 */
@Controller('leaves')
@UseGuards(JwtAuthGuard, RolesGuard, ServiceScopeGuard)
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  /**
   * Create a new leave request
   * Accessible by: EMPLOYE, ADMIN
   */
  @Post()
  @Roles(Role.EMPLOYE, Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createLeaveDto: CreateLeaveDto,
    @CurrentUser('serviceId') serviceId: string,
  ) {
    return this.leaveService.create(createLeaveDto, serviceId);
  }

  /**
   * Get all leave requests (filtered by service)
   * Accessible by: EMPLOYE (own requests), RH, ADMIN (all requests)
   */
  @Get()
  @Roles(Role.EMPLOYE, Role.RH, Role.ADMIN)
  findAll(
    @CurrentUser('serviceId') serviceId: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
  ) {
    return this.leaveService.findAll(serviceId, employeeId, status);
  }

  /**
   * Get one leave request by ID
   * Accessible by: EMPLOYE (own request), RH, ADMIN
   */
  @Get(':id')
  @Roles(Role.EMPLOYE, Role.RH, Role.ADMIN)
  findOne(
    @Param('id') id: string,
    @CurrentUser('serviceId') serviceId: string,
  ) {
    return this.leaveService.findOne(id, serviceId);
  }

  /**
   * Update a leave request (only pending requests)
   * Accessible by: EMPLOYE (own request), ADMIN
   */
  @Patch(':id')
  @Roles(Role.EMPLOYE, Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateLeaveDto: UpdateLeaveDto,
    @CurrentUser('serviceId') serviceId: string,
  ) {
    return this.leaveService.update(id, updateLeaveDto, serviceId);
  }

  /**
   * RH approves a leave request (first step)
   * Status: PENDING → APPROVED_BY_RH
   * Accessible by: RH (with approve_leaves permission), ADMIN
   */
  @Post(':id/approve-rh')
  @Roles(Role.RH, Role.ADMIN)
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.APPROVE_LEAVES)
  @HttpCode(HttpStatus.OK)
  approveByRH(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('serviceId') serviceId: string,
  ) {
    return this.leaveService.approveByRH(id, userId, serviceId);
  }

  /**
   * ADMIN approves a leave request (final step)
   * Status: APPROVED_BY_RH → APPROVED
   * Accessible by: ADMIN only
   */
  @Post(':id/approve-admin')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  approveByAdmin(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('serviceId') serviceId: string,
  ) {
    return this.leaveService.approveByAdmin(id, userId, serviceId);
  }

  /**
   * RH rejects a leave request (first step)
   * Status: PENDING → REJECTED_BY_RH
   * Accessible by: RH (with approve_leaves permission), ADMIN
   */
  @Post(':id/reject-rh')
  @Roles(Role.RH, Role.ADMIN)
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.APPROVE_LEAVES)
  @HttpCode(HttpStatus.OK)
  rejectByRH(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('serviceId') serviceId: string,
  ) {
    return this.leaveService.rejectByRH(id, userId, serviceId, reason);
  }

  /**
   * ADMIN rejects a leave request (final step)
   * Status: APPROVED_BY_RH → REJECTED_BY_ADMIN
   * Accessible by: ADMIN only
   */
  @Post(':id/reject-admin')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  rejectByAdmin(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('serviceId') serviceId: string,
  ) {
    return this.leaveService.rejectByAdmin(id, userId, serviceId, reason);
  }

  /**
   * Delete a leave request
   * Accessible by: ADMIN only
   */
  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id') id: string,
    @CurrentUser('serviceId') serviceId: string,
  ) {
    return this.leaveService.remove(id, serviceId);
  }
}
