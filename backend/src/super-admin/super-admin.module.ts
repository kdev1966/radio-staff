import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminDashboardController } from './super-admin-dashboard.controller';
import { SuperAdminDashboardService } from './super-admin-dashboard.service';
import { SuperAdminServicesController } from './super-admin-services.controller';
import { SuperAdminServicesService } from './super-admin-services.service';
import { SuperAdminAnalyticsController } from './super-admin-analytics.controller';
import { SuperAdminAnalyticsService } from './super-admin-analytics.service';
import { SuperAdmin } from '../entities/super-admin.entity';
import { RadiologyService } from '../entities/radiology-service.entity';
import { Employee } from '../entities/employee.entity';
import { Shift } from '../entities/shift.entity';
import { LeaveRequest } from '../entities/leave-request.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SuperAdmin,
      RadiologyService,
      Employee,
      Shift,
      LeaveRequest,
    ]),
  ],
  controllers: [
    SuperAdminController,
    SuperAdminDashboardController,
    SuperAdminServicesController,
    SuperAdminAnalyticsController,
  ],
  providers: [
    SuperAdminService,
    SuperAdminDashboardService,
    SuperAdminServicesService,
    SuperAdminAnalyticsService,
  ],
  exports: [
    SuperAdminService,
    SuperAdminDashboardService,
    SuperAdminServicesService,
    SuperAdminAnalyticsService,
  ],
})
export class SuperAdminModule {}
