import { IsEmail, IsString, MinLength, IsEnum, IsDateString, IsPhoneNumber } from 'class-validator';
import { EmployeeRole } from '../../entities/employee.entity';

export class RegisterDto {
  @IsString()
  matricule!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsDateString()
  birthDate!: Date;

  @IsString()
  phone!: string;

  @IsEnum(EmployeeRole)
  role!: EmployeeRole;

  @IsString()
  address!: string;

  @IsEmail({}, { message: 'Email invalide' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  password!: string;
}
