import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { LeaveType } from '../../common/enums/leave.enum';

export class CreateLeaveDto {
  @IsUUID()
  employeeId!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsNumber()
  @Min(0.5)
  days!: number;

  @IsEnum(LeaveType, {
    message: 'Le type doit être l\'un des suivants: CP, RTT, MALADIE, FORMATION, SPECIAL',
  })
  type!: LeaveType;

  @IsOptional()
  @IsString()
  reason?: string;
}