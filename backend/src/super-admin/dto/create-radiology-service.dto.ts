import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { SubscriptionTier } from '../../common/enums/permission.enum';

export class CreateRadiologyServiceDto {
  @IsString()
  name!: string;

  @IsString()
  hospitalName!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsEnum(SubscriptionTier)
  subscriptionTier?: SubscriptionTier;

  @IsOptional()
  @IsDateString()
  trialEndsAt?: Date;
}
