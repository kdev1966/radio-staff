import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaveService } from './leave.service';
import { LeaveController } from './leave.controller';
import { LeaveRequest } from '../entities/leave-request.entity';
import { Employee } from '../entities/employee.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LeaveRequest, Employee])],
  controllers: [LeaveController],
  providers: [LeaveService],
})
export class LeaveModule {}
