import { Controller, Get, Param, Post, Delete, Body, UseGuards, Req, HttpCode, HttpStatus, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ShiftService } from './shift.service';
import { KeycloakAuthGuard } from '../common/guards/keycloak-auth.guard';
import { RolesGuard, Role } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateShiftDto } from './dto/create-shift.dto';
import { AssignShiftDto } from './dto/assign-shift.dto';

@Controller('shifts')
@UseGuards(KeycloakAuthGuard, RolesGuard)
export class ShiftController {
  constructor(private readonly shiftService: ShiftService) {}

  @Get()
  @Roles(Role.ADMIN, Role.CHEF_SERVICE, Role.RH, Role.EMPLOYE)
  async getAll() {
    return this.shiftService.findAll();
  }

  @Post()
  @Roles(Role.ADMIN, Role.CHEF_SERVICE)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createShiftDto: CreateShiftDto) {
    return this.shiftService.create({
      shiftDate: new Date(createShiftDto.shiftDate),
      period: createShiftDto.period,
      needed: createShiftDto.needed,
    });
  }

  @Post(':shiftId/assign')
  @Roles(Role.ADMIN, Role.CHEF_SERVICE)
  async assign(
    @Param('shiftId') shiftId: string,
    @Body() assignShiftDto: AssignShiftDto,
    @Req() req: any,
  ) {
    const userId = req.user?.sub || req.user?.id;
    return this.shiftService.assign(shiftId, assignShiftDto.employeeId, userId);
  }

  @Get(':shiftId/suggestions')
  @Roles(Role.ADMIN, Role.CHEF_SERVICE)
  async getSuggestions(@Param('shiftId') shiftId: string) {
    return this.shiftService.getSuggestions(shiftId);
  }

  @Delete('assign/:assignmentId')
  @Roles(Role.ADMIN, Role.CHEF_SERVICE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async unassign(@Param('assignmentId') assignmentId: string) {
    await this.shiftService.unassign(assignmentId);
  }

  @Get('export')
  @Roles(Role.ADMIN, Role.CHEF_SERVICE, Role.RH)
  async exportPDF(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.shiftService.exportToPDF(
      new Date(startDate),
      new Date(endDate),
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=planning-${startDate}-${endDate}.pdf`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }
}