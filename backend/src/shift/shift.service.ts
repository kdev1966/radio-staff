import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ShiftPeriod } from './dto/create-shift.dto';

@Injectable()
export class ShiftService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.shift.findMany({
      include: { assignments: { include: { employee: true } } },
      orderBy: [{ shiftDate: 'asc' }, { startTime: 'asc' }],
    });
  }

  async create(data: { shiftDate: Date; period: ShiftPeriod; needed?: number }) {
    const { shiftDate, period, needed = 1 } = data;

    const existing = await this.prisma.shift.findUnique({
      where: {
        shiftDate_period: {
          shiftDate,
          period,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Un shift ${period} existe déjà pour le ${shiftDate.toISOString().split('T')[0]}`,
      );
    }

    const times = this.getShiftTimes(period);

    return this.prisma.shift.create({
      data: {
        shiftDate,
        period,
        startTime: times.start,
        endTime: times.end,
        needed,
      },
      include: { assignments: { include: { employee: true } } },
    });
  }

  async assign(shiftId: string, employeeId: string, assignedBy?: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: { assignments: { include: { employee: true } } },
    });

    if (!shift) {
      throw new NotFoundException(`Shift ${shiftId} non trouvé`);
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        assignments: {
          include: { shift: true },
          where: {
            shift: {
              shiftDate: {
                gte: new Date(new Date(shift.shiftDate).getTime() - 7 * 24 * 60 * 60 * 1000),
                lte: new Date(new Date(shift.shiftDate).getTime() + 7 * 24 * 60 * 60 * 1000),
              },
            },
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException(`Employé ${employeeId} non trouvé`);
    }

    await this.validateShiftRules(employee, shift);

    return this.prisma.shiftAssignment.create({
      data: { shiftId, employeeId, assignedBy },
      include: { employee: true, shift: true },
    });
  }

  async unassign(assignmentId: string) {
    return this.prisma.shiftAssignment.delete({ where: { id: assignmentId } });
  }

  async getSuggestions(shiftId: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: { assignments: true },
    });

    if (!shift) {
      throw new NotFoundException(`Shift ${shiftId} non trouvé`);
    }

    const allEmployees = await this.prisma.employee.findMany({
      include: {
        assignments: {
          include: { shift: true },
          where: {
            shift: {
              shiftDate: {
                gte: new Date(new Date(shift.shiftDate).getTime() - 7 * 24 * 60 * 60 * 1000),
                lte: new Date(new Date(shift.shiftDate).getTime() + 7 * 24 * 60 * 60 * 1000),
              },
            },
          },
        },
      },
    });

    const suggestions: Array<{
      employee: { id: string; firstName: string; lastName: string };
      weeklyHours: number;
      nightShiftsThisWeek: number;
    }> = [];

    for (const employee of allEmployees) {
      if (shift.assignments.some((a: any) => a.employeeId === employee.id)) {
        continue;
      }

      try {
        await this.validateShiftRules(employee, shift);
        suggestions.push({
          employee: {
            id: employee.id,
            firstName: employee.firstName,
            lastName: employee.lastName,
          },
          weeklyHours: this.calculateWeeklyHours(employee, shift.shiftDate),
          nightShiftsThisWeek: this.countNightShifts(employee, shift.shiftDate),
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

    if (shift.period === 'NIGHT') {
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
        assignment.shift.period === 'NIGHT'
      ) {
        count++;
      }
    }

    return count;
  }

  private getShiftDuration(period: ShiftPeriod): number {
    switch (period) {
      case 'MORNING':
        return 6;
      case 'AFTERNOON':
        return 6;
      case 'NIGHT':
        return 12;
      default:
        return 8;
    }
  }

  private getShiftTimes(period: ShiftPeriod): { start: Date; end: Date } {
    const start = new Date('1970-01-01');
    const end = new Date('1970-01-01');

    switch (period) {
      case 'MORNING':
        start.setHours(7, 0, 0, 0);
        end.setHours(13, 0, 0, 0);
        break;
      case 'AFTERNOON':
        start.setHours(13, 0, 0, 0);
        end.setHours(19, 0, 0, 0);
        break;
      case 'NIGHT':
        start.setHours(19, 0, 0, 0);
        end.setHours(7, 0, 0, 0);
        break;
    }

    return { start, end };
  }

  async exportToPDF(startDate: Date, endDate: Date): Promise<Buffer> {
    const shifts = await this.prisma.shift.findMany({
      where: {
        shiftDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        assignments: {
          include: {
            employee: true,
          },
        },
      },
      orderBy: [{ shiftDate: 'asc' }, { period: 'asc' }],
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

      if (shift.assignments.length === 0) {
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