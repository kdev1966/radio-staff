import {
  IsString,
  IsNotEmpty,
  IsEmail,
  MinLength,
  MaxLength,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class CreateSuperAdminDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  fullName!: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
