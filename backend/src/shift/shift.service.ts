import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Shift, ShiftPeriod, DayType } from '../entities/shift.entity';
import { ShiftAssignment } from '../entities/shift-assignment.entity';
import { ShiftPosition, PositionName, RequiredRole } from '../entities/shift-position.entity';
import { Employee } from '../entities/employee.entity';
import { HolidaysService } from '../common/services/holidays.service';

@Injectable()
export class ShiftService {
  constructor(
    @InjectRepository(Shift)
    private shiftRepository: Repository<Shift>,
    @InjectRepository(ShiftAssignment)
    private shiftAssignmentRepository: Repository<ShiftAssignment>,
    @InjectRepository(ShiftPosition)
    private shiftPositionRepository: Repository<ShiftPosition>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    private holidaysService: HolidaysService,
  ) {}

  async findAll() {
    return this.shiftRepository.find({
      relations: ['assignments', 'assignments.employee', 'positions'],
      order: { shiftDate: 'ASC', startTime: 'ASC' },
    });
  }

  async create(data: {
    shiftDate: Date;
    period: ShiftPeriod;
    dayType?: DayType;
    needed?: number;
  }) {
    const { shiftDate, period, dayType: providedDayType, needed } = data;

    // Vérifier si un shift existe déjà
    const existing = await this.shiftRepository.findOne({
      where: { shiftDate, period },
    });

    if (existing) {
      throw new BadRequestException(
        `Un shift ${period} existe déjà pour le ${shiftDate.toISOString().split('T')[0]}`,
      );
    }

    // Déterminer automatiquement le type de jour si non fourni
    const dayType = providedDayType ?? this.determineDayType(shiftDate);

    const times = this.getShiftTimes(period);

    // Créer le shift
    const shift = this.shiftRepository.create({
      shiftDate,
      period,
      startTime: times.start,
      endTime: times.end,
      dayType,
      needed: needed ?? 1, // Garde la compatibilité avec l'ancien système
    });

    const savedShift = await this.shiftRepository.save(shift);

    // Générer et créer automatiquement les positions
    const positionDefinitions = this.generatePositionDefinitions(dayType, period);

    const positions = positionDefinitions.map((def) =>
      this.shiftPositionRepository.create({
        shiftId: savedShift.id,
        positionName: def.positionName,
        needed: def.needed,
        requiredRole: def.requiredRole,
      }),
    );

    await this.shiftPositionRepository.save(positions);

    // Retourner le shift complet avec positions et assignments
    return this.shiftRepository.findOne({
      where: { id: savedShift.id },
      relations: ['assignments', 'assignments.employee', 'positions'],
    });
  }

  async assign(shiftId: string, employeeId: string, assignedBy?: string) {
    const shift = await this.shiftRepository.findOne({
      where: { id: shiftId },
      relations: ['assignments', 'assignments.employee'],
    });

    if (!shift) {
      throw new NotFoundException(`Shift ${shiftId} non trouvé`);
    }

    const weekStart = new Date(shift.shiftDate);
    weekStart.setDate(weekStart.getDate() - 7);
    const weekEnd = new Date(shift.shiftDate);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
      relations: ['assignments', 'assignments.shift'],
    });

    if (!employee) {
      throw new NotFoundException(`Employé ${employeeId} non trouvé`);
    }

    // Filter assignments within the date range
    const relevantAssignments = (employee.assignments || []).filter((assignment) => {
      const assignmentDate = new Date(assignment.shift.shiftDate);
      return assignmentDate >= weekStart && assignmentDate <= weekEnd;
    });

    const employeeWithFilteredAssignments = {
      ...employee,
      assignments: relevantAssignments,
    };

    await this.validateShiftRules(employeeWithFilteredAssignments, shift);

    const assignment = this.shiftAssignmentRepository.create({
      shiftId,
      employeeId,
      assignedBy,
    });

    const savedAssignment = await this.shiftAssignmentRepository.save(assignment);

    return this.shiftAssignmentRepository.findOne({
      where: { id: savedAssignment.id },
      relations: ['employee', 'shift'],
    });
  }

  async unassign(assignmentId: string) {
    return this.shiftAssignmentRepository.delete(assignmentId);
  }

  async getSuggestions(shiftId: string) {
    const shift = await this.shiftRepository.findOne({
      where: { id: shiftId },
      relations: ['assignments'],
    });

    if (!shift) {
      throw new NotFoundException(`Shift ${shiftId} non trouvé`);
    }

    const weekStart = new Date(shift.shiftDate);
    weekStart.setDate(weekStart.getDate() - 7);
    const weekEnd = new Date(shift.shiftDate);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const allEmployees = await this.employeeRepository.find({
      relations: ['assignments', 'assignments.shift'],
    });

    const suggestions: Array<{
      employee: { id: string; firstName: string; lastName: string };
      weeklyHours: number;
      nightShiftsThisWeek: number;
    }> = [];

    for (const employee of allEmployees) {
      if (shift.assignments?.some((a) => a.employeeId === employee.id)) {
        continue;
      }

      // Filter assignments within the date range
      const relevantAssignments = (employee.assignments || []).filter((assignment) => {
        const assignmentDate = new Date(assignment.shift.shiftDate);
        return assignmentDate >= weekStart && assignmentDate <= weekEnd;
      });

      const employeeWithFilteredAssignments = {
        ...employee,
        assignments: relevantAssignments,
      };

      try {
        await this.validateShiftRules(employeeWithFilteredAssignments, shift);
        suggestions.push({
          employee: {
            id: employee.id,
            firstName: employee.firstName,
            lastName: employee.lastName,
          },
          weeklyHours: this.calculateWeeklyHours(employeeWithFilteredAssignments, shift.shiftDate),
          nightShiftsThisWeek: this.countNightShifts(employeeWithFilteredAssignments, shift.shiftDate),
        });
      } catch {
        // Employé non éligible
      }
    }

    return suggestions.sort((a, b) => a.weeklyHours - b.weeklyHours);
  }

  private async validateShiftRules(employee: any, shift: any) {
    const shiftDate = new Date(shift.shiftDate);
    const assignments = employee.assignments || [];

    for (const assignment of assignments) {
      const prevShift = assignment.shift;
      const prevDate = new Date(prevShift.shiftDate);
      const timeDiff = Math.abs(shiftDate.getTime() - prevDate.getTime());
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      if (hoursDiff < 11 && timeDiff !== 0) {
        throw new BadRequestException(
          `L'employé ${employee.firstName} ${employee.lastName} doit avoir au moins 11h de repos entre deux quarts`,
        );
      }
    }

    const weeklyHours = this.calculateWeeklyHours(employee, shiftDate);
    const shiftDuration = this.getShiftDuration(shift.period);

    if (weeklyHours + shiftDuration > 48) {
      throw new BadRequestException(
        `L'employé ${employee.firstName} ${employee.lastName} dépasserait 48h/semaine (actuellement: ${weeklyHours}h)`,
      );
    }

    if (shift.period === ShiftPeriod.NIGHT) {
      const nightShifts = this.countNightShifts(employee, shiftDate);
      if (nightShifts >= 2) {
        throw new BadRequestException(
          `L'employé ${employee.firstName} ${employee.lastName} a déjà ${nightShifts} quarts de nuit cette semaine (max: 2)`,
        );
      }
    }
  }

  private calculateWeeklyHours(employee: any, targetDate: Date): number {
    const startOfWeek = new Date(targetDate);
    startOfWeek.setDate(targetDate.getDate() - targetDate.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    let totalHours = 0;

    for (const assignment of employee.assignments || []) {
      const shiftDate = new Date(assignment.shift.shiftDate);
      if (shiftDate >= startOfWeek && shiftDate < endOfWeek) {
        totalHours += this.getShiftDuration(assignment.shift.period);
      }
    }

    return totalHours;
  }

  private countNightShifts(employee: any, targetDate: Date): number {
    const startOfWeek = new Date(targetDate);
    startOfWeek.setDate(targetDate.getDate() - targetDate.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    let count = 0;

    for (const assignment of employee.assignments || []) {
      const shiftDate = new Date(assignment.shift.shiftDate);
      if (
        shiftDate >= startOfWeek &&
        shiftDate < endOfWeek &&
        assignment.shift.period === ShiftPeriod.NIGHT
      ) {
        count++;
      }
    }

    return count;
  }

  private getShiftDuration(period: ShiftPeriod): number {
    switch (period) {
      case ShiftPeriod.MORNING:
        return 6.5; // 7:00 - 13:30
      case ShiftPeriod.AFTERNOON:
        return 6.5; // 12:30 - 19:00
      case ShiftPeriod.NIGHT:
        return 12; // 19:00 - 7:00
      default:
        return 8;
    }
  }

  private getShiftTimes(period: ShiftPeriod): { start: Date; end: Date } {
    const start = new Date('1970-01-01');
    const end = new Date('1970-01-01');

    switch (period) {
      case ShiftPeriod.MORNING:
        start.setHours(7, 0, 0, 0); // 07:00
        end.setHours(13, 30, 0, 0); // 13:30
        break;
      case ShiftPeriod.AFTERNOON:
        start.setHours(12, 30, 0, 0); // 12:30
        end.setHours(19, 0, 0, 0); // 19:00
        break;
      case ShiftPeriod.NIGHT:
        start.setHours(19, 0, 0, 0); // 19:00
        end.setHours(7, 0, 0, 0); // 07:00 (next day)
        break;
    }

    return { start, end };
  }

  /**
   * Détermine automatiquement le type de jour (NORMAL ou WEEKEND_HOLIDAY)
   * basé sur la date fournie en utilisant le service des jours fériés tunisiens
   */
  private determineDayType(date: Date): DayType {
    return this.holidaysService.isWeekendOrHoliday(date)
      ? DayType.WEEKEND_HOLIDAY
      : DayType.NORMAL;
  }

  /**
   * Génère les définitions de positions selon le type de jour et la période
   *
   * Règles:
   * - Jours NORMAL MATIN: 2 RX, 2 Scanner, 1 Mobile, 2 Réception (admin)
   * - Jours NORMAL APRÈS-MIDI/SOIR: 2 techniciens flexibles (GENERAL)
   * - Jours WEEKEND_HOLIDAY: 2 techniciens flexibles (GENERAL) pour toutes périodes
   */
  private generatePositionDefinitions(
    dayType: DayType,
    period: ShiftPeriod,
  ): Array<{ positionName: PositionName; needed: number; requiredRole: RequiredRole }> {
    // Week-end et jours fériés: uniquement techniciens flexibles
    if (dayType === DayType.WEEKEND_HOLIDAY) {
      return [
        {
          positionName: PositionName.GENERAL,
          needed: 2,
          requiredRole: RequiredRole.TECHNICIEN,
        },
      ];
    }

    // Jours normaux
    if (period === ShiftPeriod.MORNING) {
      // Matin: postes spécifiques
      return [
        {
          positionName: PositionName.RX,
          needed: 2,
          requiredRole: RequiredRole.TECHNICIEN,
        },
        {
          positionName: PositionName.SCANNER,
          needed: 2,
          requiredRole: RequiredRole.TECHNICIEN,
        },
        {
          positionName: PositionName.MOBILE,
          needed: 1,
          requiredRole: RequiredRole.TECHNICIEN,
        },
        {
          positionName: PositionName.RECEPTION,
          needed: 2,
          requiredRole: RequiredRole.ADMINISTRATIF,
        },
      ];
    }

    // Après-midi et soir: postes flexibles
    return [
      {
        positionName: PositionName.GENERAL,
        needed: 2,
        requiredRole: RequiredRole.TECHNICIEN,
      },
    ];
  }

  /**
   * Génère automatiquement tous les shifts pour une période donnée
   * Crée les 3 shifts (MORNING, AFTERNOON, NIGHT) pour chaque jour
   * Génère automatiquement les positions appropriées selon le type de jour
   */
  async generateShiftsForPeriod(options: {
    startDate: Date;
    endDate: Date;
    skipExisting?: boolean;
    includeWeekends?: boolean;
    includeMorningShift?: boolean;
    includeAfternoonShift?: boolean;
    includeNightShift?: boolean;
  }): Promise<{
    created: number;
    skipped: number;
    errors: Array<{ date: string; period: string; error: string }>;
  }> {
    const {
      startDate,
      endDate,
      skipExisting = true,
      includeWeekends = true,
      includeMorningShift = true,
      includeAfternoonShift = true,
      includeNightShift = true,
    } = options;

    // Validation des dates
    if (startDate >= endDate) {
      throw new BadRequestException('La date de début doit être avant la date de fin');
    }

    // Limiter la génération à 1 an maximum
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) {
      throw new BadRequestException('La période ne peut pas dépasser 365 jours');
    }

    let created = 0;
    let skipped = 0;
    const errors: Array<{ date: string; period: string; error: string }> = [];

    // Périodes à générer selon les options
    const periodsToGenerate: ShiftPeriod[] = [];
    if (includeMorningShift) periodsToGenerate.push(ShiftPeriod.MORNING);
    if (includeAfternoonShift) periodsToGenerate.push(ShiftPeriod.AFTERNOON);
    if (includeNightShift) periodsToGenerate.push(ShiftPeriod.NIGHT);

    if (periodsToGenerate.length === 0) {
      throw new BadRequestException('Au moins une période de shift doit être sélectionnée');
    }

    // Itérer sur chaque jour de la période
    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);

    while (currentDate <= endDate) {
      // Vérifier si on doit inclure les dimanches
      const isSunday = this.holidaysService.isSunday(currentDate);
      if (!includeWeekends && isSunday) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Déterminer le type de jour
      const dayType = this.determineDayType(currentDate);

      // Générer les shifts pour chaque période
      for (const period of periodsToGenerate) {
        const shiftDate = new Date(currentDate);
        const dateStr = shiftDate.toISOString().split('T')[0];

        try {
          // Vérifier si le shift existe déjà
          const existing = await this.shiftRepository.findOne({
            where: { shiftDate, period },
          });

          if (existing) {
            if (skipExisting) {
              skipped++;
              continue;
            } else {
              throw new BadRequestException(`Shift ${period} existe déjà pour ${dateStr}`);
            }
          }

          // Créer le shift
          const times = this.getShiftTimes(period);
          const shift = this.shiftRepository.create({
            shiftDate,
            period,
            startTime: times.start,
            endTime: times.end,
            dayType,
            needed: 1,
          });

          const savedShift = await this.shiftRepository.save(shift);

          // Générer et créer les positions
          const positionDefinitions = this.generatePositionDefinitions(dayType, period);
          const positions = positionDefinitions.map((def) =>
            this.shiftPositionRepository.create({
              shiftId: savedShift.id,
              positionName: def.positionName,
              needed: def.needed,
              requiredRole: def.requiredRole,
            }),
          );

          await this.shiftPositionRepository.save(positions);
          created++;
        } catch (error: any) {
          errors.push({
            date: dateStr,
            period,
            error: error.message || 'Erreur inconnue',
          });
        }
      }

      // Passer au jour suivant
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return { created, skipped, errors };
  }

  async exportToPDF(startDate: Date, endDate: Date): Promise<Buffer> {
    const shifts = await this.shiftRepository.find({
      where: {
        shiftDate: Between(startDate, endDate),
      },
      relations: ['assignments', 'assignments.employee'],
      order: { shiftDate: 'ASC', period: 'ASC' },
    });

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    doc.fontSize(20).text('Planning du Service Radiologie', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(
      `Période: ${startDate.toLocaleDateString('fr-FR')} - ${endDate.toLocaleDateString('fr-FR')}`,
      { align: 'center' },
    );
    doc.moveDown(2);

    const periodLabels: Record<string, string> = {
      MORNING: 'Matin (07h-13h)',
      AFTERNOON: 'Après-midi (13h-19h)',
      NIGHT: 'Nuit (19h-07h)',
    };

    let currentDate = '';

    for (const shift of shifts) {
      const shiftDateStr = new Date(shift.shiftDate).toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      if (currentDate !== shiftDateStr) {
        if (currentDate !== '') {
          doc.moveDown();
        }
        currentDate = shiftDateStr;
        doc.fontSize(14).fillColor('blue').text(shiftDateStr, { underline: true });
        doc.moveDown(0.5);
      }

      doc.fontSize(12).fillColor('black').text(`  ${periodLabels[shift.period]}:`, {
        continued: false,
      });

      if (!shift.assignments || shift.assignments.length === 0) {
        doc.fontSize(10).fillColor('red').text('    ⚠ Aucun employé assigné', {
          indent: 20,
        });
      } else {
        shift.assignments.forEach((assignment: any) => {
          doc.fontSize(10).fillColor('black').text(
            `    • ${assignment.employee.firstName} ${assignment.employee.lastName}`,
            { indent: 20 },
          );
        });
      }

      doc.moveDown(0.5);
    }

    doc.moveDown(2);
    doc.fontSize(10).fillColor('gray').text(
      `Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`,
      { align: 'center' },
    );

    doc.end();

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });
  }
}
