import { IsEnum, IsOptional, IsString } from 'class-validator';
import { LeaveStatus } from '../../common/enums/leave.enum';

export class UpdateLeaveDto {
  @IsEnum(LeaveStatus, {
    message: 'Le statut doit être l\'un des suivants: PENDING, APPROVED_BY_MANAGER, APPROVED, REJECTED',
  })
  @IsOptional()
  status?: LeaveStatus;

  @IsString()
  @IsOptional()
  decidedBy?: string;
}