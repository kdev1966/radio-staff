import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeeModule } from './employee/employee.module';
import { ShiftModule } from './shift/shift.module';
import { LeaveModule } from './leave/leave.module';
import { KeycloakModule } from './keycloak/keycloak.module';
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
        entities: [Employee, LeaveRequest, Shift, ShiftAssignment, ShiftPosition, AuditLog],
        synchronize: false,
        logging: configService.get<string>('NODE_ENV') === 'development',
      }),
    }),
    TypeOrmModule.forFeature([AuditLog]),
    EmployeeModule,
    ShiftModule,
    LeaveModule,
    KeycloakModule,
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
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
  ],
})
export class AppModule {}