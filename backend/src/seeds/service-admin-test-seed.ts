import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
  });

  await dataSource.initialize();
  console.log('🔌 Connected to database');

  try {
    // Service IDs from multi-tenant-seed.ts
    const service1Id = '11111111-1111-1111-1111-111111111111'; // CHU Nord
    const service2Id = '22222222-2222-2222-2222-222222222222'; // CHU Sud

    // Get employee IDs for creating leaves and shifts
    console.log('\n📝 Fetching employee IDs...');
    const employees = await dataSource.query(`
      SELECT id, email, service_id, role, employee_type
      FROM employees
      WHERE service_id IN ($1, $2)
      ORDER BY email;
    `, [service1Id, service2Id]);

    console.log(`✅ Found ${employees.length} employees`);

    // Group employees by service
    const service1Employees = employees.filter((e: any) => e.service_id === service1Id);
    const service2Employees = employees.filter((e: any) => e.service_id === service2Id);

    // 1. CREATE LEAVE REQUESTS
    console.log('\n📝 Creating Leave Requests...');

    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const nextMonth = new Date(today);
    nextMonth.setDate(today.getDate() + 30);

    const twoMonths = new Date(today);
    twoMonths.setDate(today.getDate() + 60);

    // PENDING leaves (to be approved by RH)
    if (service1Employees.length > 0) {
      await dataSource.query(`
        INSERT INTO leave_requests (employee_id, service_id, start_date, end_date, days, type, status, comment)
        VALUES
          ($1, $2, $3, $4, 5, 'CP', 'PENDING', 'Congés d''été en famille'),
          ($5, $6, $7, $8, 3, 'RTT', 'PENDING', 'Week-end prolongé')
        ON CONFLICT DO NOTHING;
      `, [
        service1Employees[0].id, service1Id, nextWeek.toISOString().split('T')[0],
        new Date(nextWeek.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        service1Employees[1]?.id || service1Employees[0].id, service1Id,
        new Date(nextWeek.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        new Date(nextWeek.getTime() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      ]);
    }

    // APPROVED_BY_RH leaves (waiting for Admin approval)
    if (service1Employees.length > 1) {
      const rhApprovedDate = new Date();
      rhApprovedDate.setDate(today.getDate() - 2);

      await dataSource.query(`
        INSERT INTO leave_requests (employee_id, service_id, start_date, end_date, days, type, status, comment, rh_reviewed_at, rh_comment)
        VALUES
          ($1, $2, $3, $4, 10, 'CP', 'APPROVED_BY_RH', 'Vacances de Noël', $5, 'Approuvé par RH')
        ON CONFLICT DO NOTHING;
      `, [
        service1Employees[2]?.id || service1Employees[0].id, service1Id,
        nextMonth.toISOString().split('T')[0],
        new Date(nextMonth.getTime() + 9 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        rhApprovedDate.toISOString(),
      ]);
    }

    // APPROVED leaves (fully approved)
    if (service2Employees.length > 0) {
      const rhApprovedDate = new Date();
      rhApprovedDate.setDate(today.getDate() - 5);
      const adminApprovedDate = new Date();
      adminApprovedDate.setDate(today.getDate() - 3);

      await dataSource.query(`
        INSERT INTO leave_requests (employee_id, service_id, start_date, end_date, days, type, status, comment, rh_reviewed_at, rh_comment, admin_reviewed_at, admin_comment)
        VALUES
          ($1, $2, $3, $4, 7, 'CP', 'APPROVED', 'Vacances d''été', $5, 'Approuvé par RH', $6, 'Approuvé définitivement'),
          ($7, $8, $9, $10, 2, 'MALADIE', 'APPROVED', 'Certificat médical fourni', $11, 'Approuvé par RH', $12, 'Approuvé définitivement')
        ON CONFLICT DO NOTHING;
      `, [
        service2Employees[0].id, service2Id,
        twoMonths.toISOString().split('T')[0],
        new Date(twoMonths.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        rhApprovedDate.toISOString(),
        adminApprovedDate.toISOString(),
        service2Employees[1]?.id || service2Employees[0].id, service2Id,
        new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        rhApprovedDate.toISOString(),
        adminApprovedDate.toISOString(),
      ]);
    }

    // REJECTED leaves
    if (service2Employees.length > 1) {
      const rejectionDate = new Date();
      rejectionDate.setDate(today.getDate() - 1);

      await dataSource.query(`
        INSERT INTO leave_requests (employee_id, service_id, start_date, end_date, days, type, status, comment, rh_reviewed_at, rejection_reason)
        VALUES
          ($1, $2, $3, $4, 3, 'FORMATION', 'REJECTED_BY_RH', 'Formation de dernière minute', $5, 'Délai trop court, effectifs insuffisants')
        ON CONFLICT DO NOTHING;
      `, [
        service2Employees[2]?.id || service2Employees[0].id, service2Id,
        new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        rejectionDate.toISOString(),
      ]);
    }

    console.log('✅ Leave requests created');

    // 2. CREATE SHIFTS
    console.log('\n📝 Creating Shifts...');

    // Helper function to create shifts for a week
    const createWeekShifts = async (serviceId: string, startDate: Date) => {
      const shifts = [];

      for (let day = 0; day < 7; day++) {
        const shiftDate = new Date(startDate);
        shiftDate.setDate(startDate.getDate() + day);

        const dayOfWeek = shiftDate.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const dayType = isWeekend ? 'WEEKEND_HOLIDAY' : 'NORMAL';

        // Morning shift
        shifts.push([
          serviceId,
          shiftDate.toISOString().split('T')[0],
          'MORNING',
          '08:00:00',
          '16:00:00',
          dayType,
          2, // needed
        ]);

        // Afternoon shift
        shifts.push([
          serviceId,
          shiftDate.toISOString().split('T')[0],
          'AFTERNOON',
          '14:00:00',
          '22:00:00',
          dayType,
          2, // needed
        ]);

        // Night shift
        shifts.push([
          serviceId,
          shiftDate.toISOString().split('T')[0],
          'NIGHT',
          '22:00:00',
          '08:00:00',
          dayType,
          1, // needed
        ]);
      }

      return shifts;
    };

    // Create shifts for this week and next week for both services
    const thisWeek = new Date();
    thisWeek.setDate(today.getDate() - today.getDay()); // Start of week

    const service1Shifts = await createWeekShifts(service1Id, thisWeek);
    const service2Shifts = await createWeekShifts(service2Id, thisWeek);

    const allShifts = [...service1Shifts, ...service2Shifts];

    // Insert shifts
    const shiftValues = allShifts.map((_, i) => {
      const offset = i * 7;
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`;
    }).join(', ');

    await dataSource.query(`
      INSERT INTO shifts (service_id, shift_date, period, start_time, end_time, day_type, needed)
      VALUES ${shiftValues}
      ON CONFLICT DO NOTHING;
    `, allShifts.flat());

    console.log(`✅ Created ${allShifts.length} shifts (7 days × 3 periods × 2 services)`);

    // 3. ASSIGN SOME SHIFTS
    console.log('\n📝 Assigning employees to shifts...');

    // Get created shifts
    const createdShifts = await dataSource.query(`
      SELECT id, service_id, shift_date, period, needed
      FROM shifts
      WHERE service_id IN ($1, $2)
      ORDER BY shift_date, period
      LIMIT 20;
    `, [service1Id, service2Id]);

    // Assign employees to some shifts (leave some unassigned for testing)
    const assignments = [];

    for (let i = 0; i < Math.min(createdShifts.length, 15); i++) {
      const shift = createdShifts[i];
      const serviceEmployees = shift.service_id === service1Id ? service1Employees : service2Employees;

      // Only assign if we have employees and if shift needs assignments
      if (serviceEmployees.length > 0 && shift.needed > 0) {
        // Assign 1-2 employees per shift randomly
        const assignCount = Math.min(shift.needed, Math.floor(Math.random() * 2) + 1);

        for (let j = 0; j < assignCount && j < serviceEmployees.length; j++) {
          const employee = serviceEmployees[j % serviceEmployees.length];
          assignments.push([shift.id, employee.id]);
        }
      }
    }

    if (assignments.length > 0) {
      const assignmentValues = assignments.map((_, i) => {
        const offset = i * 2;
        return `($${offset + 1}, $${offset + 2})`;
      }).join(', ');

      await dataSource.query(`
        INSERT INTO shift_assignments (shift_id, employee_id)
        VALUES ${assignmentValues}
        ON CONFLICT DO NOTHING;
      `, assignments.flat());

      console.log(`✅ Created ${assignments.length} shift assignments`);
    }

    // 4. Display summary
    console.log('\n\n═══════════════════════════════════════════════════════');
    console.log('🎉 SERVICE-ADMIN TEST DATA SEEDED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════\n');

    const leaveStats = await dataSource.query(`
      SELECT status, COUNT(*) as count
      FROM leave_requests
      WHERE service_id IN ($1, $2)
      GROUP BY status;
    `, [service1Id, service2Id]);

    const shiftStats = await dataSource.query(`
      SELECT
        s.service_id,
        COUNT(DISTINCT s.id) as total_shifts,
        COUNT(DISTINCT sa.id) as assigned_count
      FROM shifts s
      LEFT JOIN shift_assignments sa ON s.id = sa.shift_id
      WHERE s.service_id IN ($1, $2)
      GROUP BY s.service_id;
    `, [service1Id, service2Id]);

    console.log('📊 LEAVE REQUESTS BY STATUS:');
    leaveStats.forEach((stat: any) => {
      console.log(`  ${stat.status}: ${stat.count}`);
    });
    console.log('');

    console.log('📊 SHIFTS:');
    shiftStats.forEach((stat: any) => {
      const serviceName = stat.service_id === service1Id ? 'CHU Nord' : 'CHU Sud';
      console.log(`  ${serviceName}:`);
      console.log(`    - Total shifts: ${stat.total_shifts}`);
      console.log(`    - Assigned: ${stat.assigned_count}`);
      console.log(`    - Unassigned: ${stat.total_shifts - stat.assigned_count}`);
    });
    console.log('');

    console.log('✅ You can now test:');
    console.log('  1. Employee management (CRUD, archive/restore)');
    console.log('  2. Leave workflow (RH approval → Admin approval)');
    console.log('  3. Shift planning (assign/unassign employees)');
    console.log('  4. Dashboard statistics and pending actions');
    console.log('\n═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('🔌 Disconnected from database');
  }
}

seed()
  .then(() => {
    console.log('✅ Service-admin test seed completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Service-admin test seed failed:', error);
    process.exit(1);
  });
