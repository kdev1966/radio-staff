import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { SubscriptionTier, ServiceStatus } from '../../common/enums/permission.enum';

export class UpdateRadiologyServiceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  hospitalName?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsEnum(SubscriptionTier)
  subscriptionTier?: SubscriptionTier;

  @IsOptional()
  @IsEnum(ServiceStatus)
  status?: ServiceStatus;

  @IsOptional()
  @IsDateString()
  subscriptionEndsAt?: Date;

  @IsOptional()
  @IsDateString()
  trialEndsAt?: Date;
}
