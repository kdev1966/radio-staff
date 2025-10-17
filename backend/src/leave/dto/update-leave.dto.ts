import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateLeaveDto {
  @IsEnum(['PENDING', 'APPROVED', 'REJECTED'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  decidedBy?: string;
}
