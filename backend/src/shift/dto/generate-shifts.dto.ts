import { IsNotEmpty, IsString, IsBoolean, IsOptional } from 'class-validator';

/**
 * DTO pour la génération automatique de shifts sur une période donnée
 * Génère tous les shifts (MORNING, AFTERNOON, NIGHT) pour chaque jour de la période
 */
export class GenerateShiftsDto {
  @IsNotEmpty()
  @IsString()
  startDate!: string; // Format ISO: YYYY-MM-DD

  @IsNotEmpty()
  @IsString()
  endDate!: string; // Format ISO: YYYY-MM-DD

  @IsOptional()
  @IsBoolean()
  skipExisting?: boolean; // Si true, ignore les shifts déjà existants au lieu de lever une erreur

  @IsOptional()
  @IsBoolean()
  includeWeekends?: boolean; // Si true, inclut les dimanches (par défaut: true)

  @IsOptional()
  @IsBoolean()
  includeMorningShift?: boolean; // Par défaut: true

  @IsOptional()
  @IsBoolean()
  includeAfternoonShift?: boolean; // Par défaut: true

  @IsOptional()
  @IsBoolean()
  includeNightShift?: boolean; // Par défaut: true
}
