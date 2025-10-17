import { Module } from '@nestjs/common';
import { ShiftService } from './shift.service';
import { ShiftController } from './shift.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [ShiftController],
  providers: [ShiftService, PrismaService],
})
export class ShiftModule {}
