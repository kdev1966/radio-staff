import { PartialType } from '@nestjs/mapped-types';
import { CreateSuperAdminDto } from './create-super-admin.dto';
import { IsString, IsOptional, MinLength } from 'class-validator';

export class UpdateSuperAdminDto extends PartialType(CreateSuperAdminDto) {
  @IsString()
  @IsOptional()
  @MinLength(8)
  password?: string;
}
