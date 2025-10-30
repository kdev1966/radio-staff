import { IsNotEmpty, IsString, IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { DayType } from '../../entities/shift.entity';

export enum ShiftPeriod {
  MORNING = 'MORNING',
  AFTERNOON = 'AFTERNOON',
  NIGHT = 'NIGHT',
}

export class CreateShiftDto {
  @IsNotEmpty()
  @IsString()
  shiftDate!: string;

  @IsNotEmpty()
  @IsEnum(ShiftPeriod)
  period!: ShiftPeriod;

  @IsOptional()
  @IsEnum(DayType)
  dayType?: DayType;

  @IsOptional()
  @IsInt()
  @Min(1)
  needed?: number;
}
