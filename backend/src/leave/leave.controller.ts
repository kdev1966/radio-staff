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
  Req,
} from '@nestjs/common';
import { LeaveService } from './leave.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveDto } from './dto/update-leave.dto';
import { KeycloakAuthGuard } from '../common/guards/keycloak-auth.guard';
import { RolesGuard, Role } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('leave')
@UseGuards(KeycloakAuthGuard, RolesGuard)
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  @Roles(Role.EMPLOYE, Role.CHEF_SERVICE, Role.ADMIN)
  create(@Body() createLeaveDto: CreateLeaveDto) {
    return this.leaveService.create(createLeaveDto);
  }

  @Get()
  @Roles(Role.EMPLOYE, Role.CHEF_SERVICE, Role.RH, Role.ADMIN)
  findAll(
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
  ) {
    return this.leaveService.findAll(employeeId, status);
  }

  @Get(':id')
  @Roles(Role.EMPLOYE, Role.CHEF_SERVICE, Role.RH, Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.leaveService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.EMPLOYE, Role.CHEF_SERVICE, Role.RH, Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateLeaveDto: UpdateLeaveDto,
  ) {
    return this.leaveService.update(id, updateLeaveDto);
  }

  @Post(':id/approve-manager')
  @Roles(Role.CHEF_SERVICE, Role.ADMIN)
  approveByManager(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    return this.leaveService.approveByManager(id, userId);
  }

  @Post(':id/approve-hr')
  @Roles(Role.RH, Role.ADMIN)
  approveByHR(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    return this.leaveService.approveByHR(id, userId);
  }

  @Post(':id/reject')
  @Roles(Role.CHEF_SERVICE, Role.RH, Role.ADMIN)
  reject(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Req() req: any,
  ) {
    const userId = req.user?.sub || req.user?.id;
    return this.leaveService.reject(id, userId, body.reason);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.CHEF_SERVICE)
  remove(@Param('id') id: string) {
    return this.leaveService.remove(id);
  }
}
