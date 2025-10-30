import { Injectable } from '@nestjs/common';

interface Holiday {
  name: string;
  date: Date;
  isVariable: boolean; // Pour les fêtes qui changent chaque année (lunaires)
}

@Injectable()
export class HolidaysService {
  // Jours fériés fixes en Tunisie
  private readonly fixedHolidays = [
    { month: 1, day: 1, name: 'Nouvel An' },
    { month: 1, day: 14, name: 'Révolution et de la Jeunesse' },
    { month: 3, day: 20, name: 'Fête de l\'Indépendance' },
    { month: 4, day: 9, name: 'Journée des Martyrs' },
    { month: 5, day: 1, name: 'Fête du Travail' },
    { month: 7, day: 25, name: 'Fête de la République' },
    { month: 8, day: 13, name: 'Journée de la Femme' },
  ];

  // Jours fériés variables (à mettre à jour chaque année selon le calendrier lunaire)
  // Format: YYYY-MM-DD
  private variableHolidays: Map<number, string[]> = new Map([
    // 2025 (estimations - à confirmer)
    [2025, [
      '2025-03-30', // Aid el-Fitr (estimé)
      '2025-03-31', // Aid el-Fitr jour 2
      '2025-06-06', // Aid el-Adha (estimé)
      '2025-06-07', // Aid el-Adha jour 2
      '2025-06-27', // Nouvel An Hégirien
      '2025-09-05', // Mouled (Mawlid)
    ]],
    // 2026 (à compléter)
    [2026, [
      '2026-03-20', // Aid el-Fitr (estimé)
      '2026-03-21', // Aid el-Fitr jour 2
      '2026-05-27', // Aid el-Adha (estimé)
      '2026-05-28', // Aid el-Adha jour 2
    ]],
  ]);

  /**
   * Vérifie si une date est un dimanche (week-end en Tunisie)
   */
  isSunday(date: Date): boolean {
    return date.getDay() === 0;
  }

  /**
   * Vérifie si une date est un jour férié
   */
  isHoliday(date: Date): boolean {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    // Vérifier les jours fériés fixes
    const isFixedHoliday = this.fixedHolidays.some(
      (h) => h.month === month && h.day === day,
    );

    if (isFixedHoliday) return true;

    // Vérifier les jours fériés variables
    const yearVariableHolidays = this.variableHolidays.get(year) || [];
    const dateStr = date.toISOString().split('T')[0];

    return yearVariableHolidays.includes(dateStr);
  }

  /**
   * Vérifie si une date est un dimanche OU un jour férié
   */
  isWeekendOrHoliday(date: Date): boolean {
    return this.isSunday(date) || this.isHoliday(date);
  }

  /**
   * Obtient tous les jours fériés pour une année donnée
   */
  getHolidaysForYear(year: number): Holiday[] {
    const holidays: Holiday[] = [];

    // Ajouter les jours fériés fixes
    this.fixedHolidays.forEach((h) => {
      const date = new Date(year, h.month - 1, h.day);
      holidays.push({
        name: h.name,
        date,
        isVariable: false,
      });
    });

    // Ajouter les jours fériés variables
    const yearVariableHolidays = this.variableHolidays.get(year) || [];
    yearVariableHolidays.forEach((dateStr) => {
      const date = new Date(dateStr);
      holidays.push({
        name: 'Fête religieuse',
        date,
        isVariable: true,
      });
    });

    return holidays.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Ajoute un jour férié variable pour une année donnée
   * Utile pour mettre à jour les dates des fêtes religieuses
   */
  addVariableHoliday(year: number, dateStr: string): void {
    if (!this.variableHolidays.has(year)) {
      this.variableHolidays.set(year, []);
    }
    const holidays = this.variableHolidays.get(year)!;
    if (!holidays.includes(dateStr)) {
      holidays.push(dateStr);
    }
  }

  /**
   * Obtient le nom du jour férié s'il y en a un
   */
  getHolidayName(date: Date): string | null {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    // Vérifier les jours fériés fixes
    const fixedHoliday = this.fixedHolidays.find(
      (h) => h.month === month && h.day === day,
    );

    if (fixedHoliday) return fixedHoliday.name;

    // Vérifier les jours fériés variables
    const yearVariableHolidays = this.variableHolidays.get(year) || [];
    const dateStr = date.toISOString().split('T')[0];

    if (yearVariableHolidays.includes(dateStr)) {
      return 'Fête religieuse';
    }

    if (this.isSunday(date)) {
      return 'Dimanche';
    }

    return null;
  }
}
