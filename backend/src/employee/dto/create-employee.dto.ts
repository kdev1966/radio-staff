import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsDateString,
  MinLength,
  MaxLength,
  Matches,
  IsEmail,
  IsOptional,
  IsArray,
} from 'class-validator';
import { EmployeeRole } from '../../entities/employee.entity';
import { EmployeeType, Permission } from '../../common/enums/permission.enum';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{8,10}$/, {
    message: 'Le matricule doit contenir entre 8 et 10 chiffres',
  })
  matricule!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  lastName!: string;

  @IsDateString()
  @IsNotEmpty()
  birthDate!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{8}$/, {
    message: 'Le numéro de téléphone doit contenir exactement 8 chiffres',
  })
  phone!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @IsEnum(EmployeeRole)
  @IsNotEmpty()
  role!: EmployeeRole;

  @IsEnum(EmployeeType)
  @IsOptional()
  employeeType?: EmployeeType;

  @IsArray()
  @IsEnum(Permission, { each: true })
  @IsOptional()
  permissions?: Permission[];

  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(200)
  address!: string;
}
