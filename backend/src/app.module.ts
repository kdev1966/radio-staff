import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeeModule } from './employee/employee.module';
import { ShiftModule } from './shift/shift.module';
import { LeaveModule } from './leave/leave.module';
import { AuthModule } from './auth/auth.module';
import { RadiologyServiceModule } from './radiology-service/radiology-service.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { ServiceAdminModule } from './service-admin/service-admin.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { CsrfTokenInterceptor } from './common/interceptors/csrf-token.interceptor';
import { CsrfGuard } from './common/guards/csrf.guard';
import { HolidaysService } from './common/services/holidays.service';
import { HealthController } from './health.controller';
import { Employee } from './entities/employee.entity';
import { LeaveRequest } from './entities/leave-request.entity';
import { Shift } from './entities/shift.entity';
import { ShiftAssignment } from './entities/shift-assignment.entity';
import { ShiftPosition } from './entities/shift-position.entity';
import { AuditLog } from './entities/audit-log.entity';
import { RadiologyService } from './entities/radiology-service.entity';
import { SuperAdmin } from './entities/super-admin.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        entities: [
          Employee,
          LeaveRequest,
          Shift,
          ShiftAssignment,
          ShiftPosition,
          AuditLog,
          RadiologyService,
          SuperAdmin,
        ],
        synchronize: false,
        logging: configService.get<string>('NODE_ENV') === 'development',
      }),
    }),
    TypeOrmModule.forFeature([AuditLog]),
    AuthModule,
    EmployeeModule,
    ShiftModule,
    LeaveModule,
    RadiologyServiceModule,
    SuperAdminModule,
    ServiceAdminModule,
  ],
  controllers: [HealthController],
  providers: [
    HolidaysService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CsrfTokenInterceptor,
    },
    // Temporarily disabled for testing - re-enable in production
    // {
    //   provide: APP_GUARD,
    //   useClass: CsrfGuard,
    // },
  ],
})
export class AppModule {}