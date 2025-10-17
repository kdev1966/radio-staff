import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seed...');

  await prisma.auditLog.deleteMany();
  await prisma.shiftAssignment.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.employeeRole.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.role.deleteMany();

  console.log('🧹 Données existantes supprimées');

  const roleManipulateur = await prisma.role.create({
    data: { name: 'MANIPULATEUR', description: 'Manipulateur en radiologie médicale' },
  });

  const roleRadiologue = await prisma.role.create({
    data: { name: 'RADIOLOGUE', description: 'Médecin radiologue' },
  });

  console.log('✅ 2 rôles créés');

  const employee1 = await prisma.employee.create({
    data: {
      firstName: 'Dr. Sarah',
      lastName: 'Martin',
      email: 'sarah.martin@hopital.fr',
      phone: '+33612345678',
      hireDate: new Date('2020-01-15'),
      contractType: 'CDI',
      weeklyHours: 35,
      diplomas: ['Doctorat en Médecine', 'DES Radiologie'],
      roles: { create: [{ roleId: roleRadiologue.id }] },
    },
  });

  const employee2 = await prisma.employee.create({
    data: {
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean.dupont@hopital.fr',
      phone: '+33623456789',
      hireDate: new Date('2021-03-10'),
      contractType: 'CDI',
      weeklyHours: 35,
      diplomas: ['Diplôme de Manipulateur en Radiologie'],
      roles: { create: [{ roleId: roleManipulateur.id }] },
    },
  });

  const employee3 = await prisma.employee.create({
    data: {
      firstName: 'Marie',
      lastName: 'Dubois',
      email: 'marie.dubois@hopital.fr',
      phone: '+33634567890',
      hireDate: new Date('2022-06-01'),
      contractType: 'PART_TIME',
      weeklyHours: 24,
      diplomas: ['Diplôme de Manipulateur en Radiologie'],
      roles: { create: [{ roleId: roleManipulateur.id }] },
    },
  });

  console.log('✅ 3 employés créés');

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
  console.log(`  - Rôles: 2`);
  console.log(`  - Employés: 3`);
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