import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

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

  @IsEnum(['CP', 'RTT', 'MALADIE', 'FORMATION', 'SPECIAL'])
  type!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
