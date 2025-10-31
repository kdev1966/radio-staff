import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { RadiologyService } from './entities/radiology-service.entity';
import { SuperAdmin } from './entities/super-admin.entity';
import { Employee } from './entities/employee.entity';
import { LeaveRequest } from './entities/leave-request.entity';
import { Shift } from './entities/shift.entity';
import { ShiftAssignment } from './entities/shift-assignment.entity';
import { ShiftPosition } from './entities/shift-position.entity';
import { AuditLog } from './entities/audit-log.entity';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    RadiologyService,
    SuperAdmin,
    Employee,
    LeaveRequest,
    Shift,
    ShiftAssignment,
    ShiftPosition,
    AuditLog,
  ],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
