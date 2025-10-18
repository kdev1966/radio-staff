import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seed...');

  // Nettoyer les données existantes
  await prisma.auditLog.deleteMany();
  await prisma.shiftAssignment.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.employee.deleteMany();

  console.log('🧹 Données existantes supprimées');

  // Créer 3 employés
  const employee1 = await prisma.employee.create({
    data: {
      matricule: '12345678',
      firstName: 'Sarah',
      lastName: 'Martin',
      birthDate: new Date('1985-03-15'),
      phone: '0612345678',
      role: 'TECHNICIEN',
      address: '12 Rue de la Paix, 75001 Paris',
    },
  });

  const employee2 = await prisma.employee.create({
    data: {
      matricule: '87654321',
      firstName: 'Jean',
      lastName: 'Dupont',
      birthDate: new Date('1990-07-22'),
      phone: '0623456789',
      role: 'TECHNICIEN',
      address: '45 Avenue des Champs-Élysées, 75008 Paris',
    },
  });

  const employee3 = await prisma.employee.create({
    data: {
      matricule: '11223344',
      firstName: 'Marie',
      lastName: 'Dubois',
      birthDate: new Date('1988-11-10'),
      phone: '0634567890',
      role: 'ADMINISTRATIF',
      address: '78 Boulevard Saint-Germain, 75005 Paris',
    },
  });

  console.log('✅ 3 employés créés');

  // Créer des shifts pour la semaine prochaine
  const shiftPeriods: { period: any; startHour: number; endHour: number; needed: number }[] = [
    { period: 'MORNING', startHour: 7, endHour: 13, needed: 2 },
    { period: 'AFTERNOON', startHour: 13, endHour: 19, needed: 2 },
    { period: 'NIGHT', startHour: 19, endHour: 7, needed: 1 },
  ];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let shiftsCreated = 0;
  let assignmentsCreated = 0;

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const shiftDate = new Date(today);
    shiftDate.setDate(today.getDate() + dayOffset);

    for (const periodConfig of shiftPeriods) {
      const startTime = new Date('1970-01-01');
      startTime.setHours(periodConfig.startHour, 0, 0, 0);

      const endTime = new Date('1970-01-01');
      if (periodConfig.period === 'NIGHT') {
        endTime.setDate(2);
      }
      endTime.setHours(periodConfig.endHour, 0, 0, 0);

      const shift = await prisma.shift.create({
        data: {
          shiftDate,
          period: periodConfig.period,
          startTime,
          endTime,
          needed: periodConfig.needed,
        },
      });

      shiftsCreated++;

      // Assigner quelques employés
      if (periodConfig.period === 'MORNING' && dayOffset < 3) {
        await prisma.shiftAssignment.create({
          data: {
            shiftId: shift.id,
            employeeId: employee1.id,
            assignedBy: 'SEED',
          },
        });
        assignmentsCreated++;
      } else if (periodConfig.period === 'AFTERNOON' && dayOffset % 2 === 0) {
        await prisma.shiftAssignment.create({
          data: {
            shiftId: shift.id,
            employeeId: employee2.id,
            assignedBy: 'SEED',
          },
        });
        assignmentsCreated++;
      } else if (periodConfig.period === 'NIGHT' && dayOffset < 2) {
        await prisma.shiftAssignment.create({
          data: {
            shiftId: shift.id,
            employeeId: employee3.id,
            assignedBy: 'SEED',
          },
        });
        assignmentsCreated++;
      }
    }
  }

  console.log(`✅ ${shiftsCreated} shifts créés (1 semaine × 3 périodes)`);
  console.log(`✅ ${assignmentsCreated} assignations créées`);

  // Créer des demandes de congé
  const futureDate1 = new Date(today);
  futureDate1.setDate(today.getDate() + 14);

  const futureDate2 = new Date(today);
  futureDate2.setDate(today.getDate() + 17);

  await prisma.leaveRequest.create({
    data: {
      employeeId: employee2.id,
      startDate: futureDate1,
      endDate: futureDate2,
      days: 3,
      type: 'CP',
      status: 'PENDING',
    },
  });

  const pastDate1 = new Date(today);
  pastDate1.setDate(today.getDate() - 10);

  const pastDate2 = new Date(today);
  pastDate2.setDate(today.getDate() - 5);

  await prisma.leaveRequest.create({
    data: {
      employeeId: employee1.id,
      startDate: pastDate1,
      endDate: pastDate2,
      days: 5,
      type: 'FORMATION',
      status: 'APPROVED',
      managerApprovedAt: new Date(pastDate1.getTime() - 2 * 24 * 60 * 60 * 1000),
      managerApprovedBy: 'CHEF_SERVICE',
      hrApprovedAt: new Date(pastDate1.getTime() - 1 * 24 * 60 * 60 * 1000),
      hrApprovedBy: 'RH',
    },
  });

  console.log('✅ 2 demandes de congé créées (1 pending, 1 approved)');

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📊 Résumé:');
  console.log(`  - Employés: 3 (2 Techniciens, 1 Administratif)`);
  console.log(`  - Shifts: ${shiftsCreated}`);
  console.log(`  - Assignations: ${assignmentsCreated}`);
  console.log(`  - Demandes de congé: 2`);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
