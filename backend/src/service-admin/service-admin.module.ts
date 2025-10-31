import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../entities/employee.entity';
import { Shift } from '../entities/shift.entity';
import { ShiftAssignment } from '../entities/shift-assignment.entity';
import { LeaveRequest } from '../entities/leave-request.entity';
import { RadiologyService } from '../entities/radiology-service.entity';
import { ServiceAdminEmployeesController } from './service-admin-employees.controller';
import { ServiceAdminEmployeesService } from './service-admin-employees.service';
import { ServiceAdminLeavesController } from './service-admin-leaves.controller';
import { ServiceAdminLeavesService } from './service-admin-leaves.service';
import { ServiceAdminShiftsController } from './service-admin-shifts.controller';
import { ServiceAdminShiftsService } from './service-admin-shifts.service';
import { ServiceAdminDashboardController } from './service-admin-dashboard.controller';
import { ServiceAdminDashboardService } from './service-admin-dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Employee,
      Shift,
      ShiftAssignment,
      LeaveRequest,
      RadiologyService,
    ]),
  ],
  controllers: [
    ServiceAdminEmployeesController,
    ServiceAdminLeavesController,
    ServiceAdminShiftsController,
    ServiceAdminDashboardController,
  ],
  providers: [
    ServiceAdminEmployeesService,
    ServiceAdminLeavesService,
    ServiceAdminShiftsService,
    ServiceAdminDashboardService,
  ],
  exports: [
    ServiceAdminEmployeesService,
    ServiceAdminLeavesService,
    ServiceAdminShiftsService,
    ServiceAdminDashboardService,
  ],
})
export class ServiceAdminModule {}
