import {
  Controller,
  Get,
  Param,
  Post,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ShiftService } from './shift.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Role } from '../common/guards/roles.guard';
import { ServiceScopeGuard } from '../common/guards/service-scope.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permission } from '../common/enums/permission.enum';
import { CreateShiftDto } from './dto/create-shift.dto';
import { AssignShiftDto } from './dto/assign-shift.dto';
import { GenerateShiftsDto } from './dto/generate-shifts.dto';

/**
 * Shift Controller - Manages work shifts and assignments within radiology services
 * All routes are scoped to the authenticated user's service (except SUPER_ADMIN)
 */
@Controller('shifts')
@UseGuards(JwtAuthGuard, RolesGuard, ServiceScopeGuard)
export class ShiftController {
  constructor(private readonly shiftService: ShiftService) {}

  /**
   * Get all shifts in the authenticated user's service
   * Accessible by: ADMIN, RH (with manage_shifts), EMPLOYE (read-only)
   */
  @Get()
  @Roles(Role.ADMIN, Role.RH, Role.EMPLOYE)
  async getAll(@CurrentUser('serviceId') serviceId: string) {
    return this.shiftService.findAll(serviceId);
  }

  /**
   * Generate multiple shifts for a period
   * Accessible by: ADMIN only
   */
  @Post('generate')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async generateShifts(
    @Body() generateShiftsDto: GenerateShiftsDto,
    @CurrentUser('serviceId') serviceId: string,
  ) {
    return this.shiftService.generateShiftsForPeriod(
      {
        startDate: new Date(generateShiftsDto.startDate),
        endDate: new Date(generateShiftsDto.endDate),
        skipExisting: generateShiftsDto.skipExisting ?? true,
        includeWeekends: generateShiftsDto.includeWeekends ?? true,
        includeMorningShift: generateShiftsDto.includeMorningShift ?? true,
        includeAfternoonShift: generateShiftsDto.includeAfternoonShift ?? true,
        includeNightShift: generateShiftsDto.includeNightShift ?? true,
      },
      serviceId,
    );
  }

  /**
   * Create a single shift
   * Accessible by: ADMIN, RH (with manage_shifts permission)
   */
  @Post()
  @Roles(Role.ADMIN, Role.RH)
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_SHIFTS)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createShiftDto: CreateShiftDto,
    @CurrentUser('serviceId') serviceId: string,
  ) {
    return this.shiftService.create(
      {
        shiftDate: new Date(createShiftDto.shiftDate),
        period: createShiftDto.period,
        needed: createShiftDto.needed,
      },
      serviceId,
    );
  }

  /**
   * Assign an employee to a shift
   * Accessible by: ADMIN, RH (with manage_shifts permission)
   */
  @Post(':shiftId/assign')
  @Roles(Role.ADMIN, Role.RH)
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_SHIFTS)
  async assign(
    @Param('shiftId') shiftId: string,
    @Body() assignShiftDto: AssignShiftDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('serviceId') serviceId: string,
  ) {
    return this.shiftService.assign(
      shiftId,
      assignShiftDto.employeeId,
      serviceId,
      userId,
    );
  }

  /**
   * Get employee suggestions for a shift
   * Accessible by: ADMIN, RH (with manage_shifts permission)
   */
  @Get(':shiftId/suggestions')
  @Roles(Role.ADMIN, Role.RH)
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_SHIFTS)
  async getSuggestions(
    @Param('shiftId') shiftId: string,
    @CurrentUser('serviceId') serviceId: string,
  ) {
    return this.shiftService.getSuggestions(shiftId, serviceId);
  }

  /**
   * Unassign an employee from a shift
   * Accessible by: ADMIN, RH (with manage_shifts permission)
   */
  @Delete('assign/:assignmentId')
  @Roles(Role.ADMIN, Role.RH)
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_SHIFTS)
  @HttpCode(HttpStatus.NO_CONTENT)
  async unassign(
    @Param('assignmentId') assignmentId: string,
    @CurrentUser('serviceId') serviceId: string,
  ) {
    await this.shiftService.unassign(assignmentId, serviceId);
  }

  /**
   * Export shifts to PDF
   * Accessible by: ADMIN, RH (with export_planning permission)
   */
  @Get('export')
  @Roles(Role.ADMIN, Role.RH)
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.EXPORT_PLANNING)
  async exportPDF(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser('serviceId') serviceId: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.shiftService.exportToPDF(
      new Date(startDate),
      new Date(endDate),
      serviceId,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=planning-${startDate}-${endDate}.pdf`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }
}
