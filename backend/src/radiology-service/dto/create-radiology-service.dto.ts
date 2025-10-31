import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';
import { SubscriptionTier, ServiceStatus } from '../../common/enums/permission.enum';

export class CreateRadiologyServiceDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  hospitalName!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string;

  @IsEnum(SubscriptionTier)
  @IsOptional()
  subscriptionTier?: SubscriptionTier;

  @IsEnum(ServiceStatus)
  @IsOptional()
  status?: ServiceStatus;
}
