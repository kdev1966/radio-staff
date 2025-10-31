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
    // 1. Create SUPER_ADMIN
    console.log('\n📝 Creating SUPER_ADMIN...');
    const superAdminPassword = await bcrypt.hash('SuperAdmin123!', 10);

    const superAdminResult = await dataSource.query(`
      INSERT INTO super_admins (email, password, full_name, phone)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO NOTHING
      RETURNING id, email;
    `, ['admin@radiostaff.com', superAdminPassword, 'Platform Administrator', '+33 1 00 00 00 00']);

    if (superAdminResult.length > 0) {
      console.log(`✅ SUPER_ADMIN created: ${superAdminResult[0].email}`);
    } else {
      console.log('ℹ️  SUPER_ADMIN already exists');
    }

    // 2. Create Services
    console.log('\n📝 Creating Radiology Services...');
    const service1Id = '11111111-1111-1111-1111-111111111111';
    const service2Id = '22222222-2222-2222-2222-222222222222';

    await dataSource.query(`
      INSERT INTO radiology_services (id, name, hospital_name, address, subscription_tier, status)
      VALUES
        ($1, $2, $3, $4, $5, $6),
        ($7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO NOTHING;
    `, [
      service1Id, 'Service Radio CHU Nord', 'CHU Nord', '1 Avenue des Hôpitaux Nord', 'PRO', 'ACTIVE',
      service2Id, 'Service Radio CHU Sud', 'CHU Sud', '2 Boulevard des Hôpitaux Sud', 'BASIC', 'ACTIVE',
    ]);

    console.log('✅ Services créés: CHU Nord & CHU Sud');

    // 3. Create ADMIN for each service (1 per service)
    console.log('\n📝 Creating ADMIN (chefs de service)...');
    const adminPassword = await bcrypt.hash('Admin123!', 10);

    await dataSource.query(`
      INSERT INTO employees (service_id, matricule, first_name, last_name, birth_date, phone, role, address, email, password)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10),
        ($11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      ON CONFLICT (email) DO NOTHING;
    `, [
      service1Id, 'ADMIN001', 'Jean', 'Dupont', '1975-05-15', '+33 1 23 45 67 89', 'ADMIN', '10 Rue de Paris', 'admin1@chu-nord.fr', adminPassword,
      service2Id, 'ADMIN001', 'Marie', 'Martin', '1978-08-20', '+33 1 23 45 67 90', 'ADMIN', '20 Rue de Lyon', 'admin2@chu-sud.fr', adminPassword,
    ]);

    console.log('✅ ADMIN créés pour chaque service');

    // 4. Create RH with different permissions
    console.log('\n📝 Creating RH with granular permissions...');
    const rhPassword = await bcrypt.hash('Rh123!', 10);

    await dataSource.query(`
      INSERT INTO employees (service_id, matricule, first_name, last_name, birth_date, phone, role, permissions, address, email, password)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11),
        ($12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      ON CONFLICT (email) DO NOTHING;
    `, [
      service1Id, 'RH001', 'Sophie', 'Bernard', '1980-03-10', '+33 1 23 45 67 91', 'RH', 'manage_leaves,approve_leaves', '30 Rue de Marseille', 'rh1@chu-nord.fr', rhPassword,
      service2Id, 'RH001', 'Pierre', 'Dubois', '1982-07-25', '+33 1 23 45 67 92', 'RH', 'manage_employees,manage_shifts', '40 Rue de Bordeaux', 'rh2@chu-sud.fr', rhPassword,
    ]);

    console.log('✅ RH créés:');
    console.log('   - RH1 (CHU Nord): permissions = manage_leaves, approve_leaves');
    console.log('   - RH2 (CHU Sud): permissions = manage_employees, manage_shifts');

    // 5. Create EMPLOYE (TECHNICIEN and ADMINISTRATIF)
    console.log('\n📝 Creating EMPLOYE...');
    const employeePassword = await bcrypt.hash('Emp123!', 10);

    await dataSource.query(`
      INSERT INTO employees (service_id, matricule, first_name, last_name, birth_date, phone, role, employee_type, address, email, password)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11),
        ($12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22),
        ($23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33),
        ($34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44)
      ON CONFLICT (email) DO NOTHING;
    `, [
      service1Id, 'EMP001', 'Luc', 'Moreau', '1990-01-15', '+33 1 23 45 67 93', 'EMPLOYE', 'TECHNICIEN', '50 Rue de Lille', 'luc.moreau@chu-nord.fr', employeePassword,
      service1Id, 'EMP002', 'Julie', 'Petit', '1992-06-20', '+33 1 23 45 67 94', 'EMPLOYE', 'ADMINISTRATIF', '60 Rue de Nantes', 'julie.petit@chu-nord.fr', employeePassword,
      service2Id, 'EMP001', 'Marc', 'Roux', '1988-11-30', '+33 1 23 45 67 95', 'EMPLOYE', 'TECHNICIEN', '70 Rue de Toulouse', 'marc.roux@chu-sud.fr', employeePassword,
      service2Id, 'EMP002', 'Claire', 'Blanc', '1993-04-12', '+33 1 23 45 67 96', 'EMPLOYE', 'ADMINISTRATIF', '80 Rue de Nice', 'claire.blanc@chu-sud.fr', employeePassword,
    ]);

    console.log('✅ EMPLOYE créés:');
    console.log('   - CHU Nord: 2 employés (1 TECHNICIEN, 1 ADMINISTRATIF)');
    console.log('   - CHU Sud: 2 employés (1 TECHNICIEN, 1 ADMINISTRATIF)');

    // 6. Display summary
    console.log('\n\n═══════════════════════════════════════════════════════');
    console.log('🎉 SEED COMPLETED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('📊 SUMMARY:');
    console.log('  - 1 SUPER_ADMIN (platform)');
    console.log('  - 2 Radiology Services (CHU Nord, CHU Sud)');
    console.log('  - 2 ADMIN (1 per service)');
    console.log('  - 2 RH with different permissions');
    console.log('  - 4 EMPLOYE (2 per service)\n');

    console.log('🔐 LOGIN CREDENTIALS:\n');
    console.log('SUPER_ADMIN (Platform):');
    console.log('  Email: admin@radiostaff.com');
    console.log('  Password: SuperAdmin123!\n');

    console.log('ADMIN CHU Nord:');
    console.log('  Email: admin1@chu-nord.fr');
    console.log('  Password: Admin123!\n');

    console.log('ADMIN CHU Sud:');
    console.log('  Email: admin2@chu-sud.fr');
    console.log('  Password: Admin123!\n');

    console.log('RH CHU Nord (permissions: manage_leaves, approve_leaves):');
    console.log('  Email: rh1@chu-nord.fr');
    console.log('  Password: Rh123!\n');

    console.log('RH CHU Sud (permissions: manage_employees, manage_shifts):');
    console.log('  Email: rh2@chu-sud.fr');
    console.log('  Password: Rh123!\n');

    console.log('EMPLOYE CHU Nord:');
    console.log('  Email: luc.moreau@chu-nord.fr (TECHNICIEN)');
    console.log('  Email: julie.petit@chu-nord.fr (ADMINISTRATIF)');
    console.log('  Password: Emp123!\n');

    console.log('EMPLOYE CHU Sud:');
    console.log('  Email: marc.roux@chu-sud.fr (TECHNICIEN)');
    console.log('  Email: claire.blanc@chu-sud.fr (ADMINISTRATIF)');
    console.log('  Password: Emp123!\n');

    console.log('═══════════════════════════════════════════════════════\n');

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
    console.log('✅ Seed script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed script failed:', error);
    process.exit(1);
  });
