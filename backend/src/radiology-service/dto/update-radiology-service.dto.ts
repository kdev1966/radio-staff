import { PartialType } from '@nestjs/mapped-types';
import { CreateRadiologyServiceDto } from './create-radiology-service.dto';

export class UpdateRadiologyServiceDto extends PartialType(
  CreateRadiologyServiceDto,
) {}
