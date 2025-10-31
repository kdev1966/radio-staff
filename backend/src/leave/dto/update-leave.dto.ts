import {
  IsEnum,
  IsOptional,
  IsString,
  IsDateString,
  IsNumber,
  Min,
} from 'class-validator';
import { LeaveType } from '../../common/enums/leave.enum';

export class UpdateLeaveDto {
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  days?: number;

  @IsEnum(LeaveType)
  @IsOptional()
  type?: LeaveType;
}