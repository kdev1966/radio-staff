import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsDateString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export enum EmployeeRole {
  TECHNICIEN = 'TECHNICIEN',
  ADMINISTRATIF = 'ADMINISTRATIF',
}

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
  @Matches(/^(\+\d{1,3}[- ]?)?\d{9,10}$/, {
    message: 'Numéro de téléphone invalide',
  })
  phone!: string;

  @IsEnum(EmployeeRole)
  @IsNotEmpty()
  role!: EmployeeRole;

  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(200)
  address!: string;
}
