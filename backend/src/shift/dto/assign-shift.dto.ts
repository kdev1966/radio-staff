import { IsNotEmpty, IsString } from 'class-validator';

export class AssignShiftDto {
  @IsNotEmpty()
  @IsString()
  employeeId!: string;
}
