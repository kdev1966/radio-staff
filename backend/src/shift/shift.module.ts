import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShiftService } from './shift.service';
import { ShiftController } from './shift.controller';
import { Shift } from '../entities/shift.entity';
import { ShiftAssignment } from '../entities/shift-assignment.entity';
import { ShiftPosition } from '../entities/shift-position.entity';
import { Employee } from '../entities/employee.entity';
import { HolidaysService } from '../common/services/holidays.service';

@Module({
  imports: [TypeOrmModule.forFeature([Shift, ShiftAssignment, ShiftPosition, Employee])],
  controllers: [ShiftController],
  providers: [ShiftService, HolidaysService],
})
export class ShiftModule {}
