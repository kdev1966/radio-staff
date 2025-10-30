import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../data-source';
import { Employee, EmployeeRole } from '../entities/employee.entity';

interface UserSeed {
  matricule: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: EmployeeRole;
  phone: string;
  address: string;
  birthDate: Date;
}

const users: UserSeed[] = [
  {
    matricule: 'ADMIN001',
    firstName: 'Admin',
    lastName: 'System',
    email: 'admin@radio.local',
    password: 'admin123',
    role: EmployeeRole.ADMIN,
    phone: '+33 1 23 45 67 89',
    address: '1 Rue de l\'Hôpital',
    birthDate: new Date('1990-01-01'),
  },
  {
    matricule: 'CHEF001',
    firstName: 'Chef',
    lastName: 'Service',
    email: 'chef@radio.local',
    password: 'chef123',
    role: EmployeeRole.CHEF_SERVICE,
    phone: '+33 1 23 45 67 90',
    address: '2 Rue de l\'Hôpital',
    birthDate: new Date('1985-05-15'),
  },
  {
    matricule: 'RH001',
    firstName: 'Responsable',
    lastName: 'RH',
    email: 'rh@radio.local',
    password: 'rh123456',
    role: EmployeeRole.RH,
    phone: '+33 1 23 45 67 91',
    address: '3 Rue de l\'Hôpital',
    birthDate: new Date('1988-03-20'),
  },
  {
    matricule: 'EMP001',
    firstName: 'Jean',
    lastName: 'Dupont',
    email: 'employe@radio.local',
    password: 'employe123',
    role: EmployeeRole.TECHNICIEN,
    phone: '+33 1 23 45 67 92',
    address: '4 Rue de l\'Hôpital',
    birthDate: new Date('1992-07-10'),
  },
];

async function createUsers() {
  try {
    console.log('🚀 Starting user creation...\n');
    const dataSource = await AppDataSource.initialize();
    const employeeRepository = dataSource.getRepository(Employee);

    let createdCount = 0;
    let skippedCount = 0;

    for (const userData of users) {
      // Check if user exists
      const existingUser = await employeeRepository.findOne({
        where: { email: userData.email },
      });

      if (existingUser) {
        console.log(`⏭️  Skipping ${userData.email} - already exists`);
        skippedCount++;
        continue;
      }

      // Create user
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      const user = employeeRepository.create({
        matricule: userData.matricule,
        firstName: userData.firstName,
        lastName: userData.lastName,
        birthDate: userData.birthDate,
        phone: userData.phone,
        role: userData.role,
        address: userData.address,
        email: userData.email,
        password: hashedPassword,
      });

      await employeeRepository.save(user);

      console.log(`✅ Created ${userData.role}: ${userData.email} (password: ${userData.password})`);
      createdCount++;
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Created: ${createdCount} users`);
    console.log(`   Skipped: ${skippedCount} users (already exist)`);
    console.log(`\n🎉 User creation completed!\n`);

    console.log('📋 Available Users:');
    console.log('   Email                 | Password   | Role');
    console.log('   --------------------- | ---------- | --------------');
    users.forEach(u => {
      console.log(`   ${u.email.padEnd(21)} | ${u.password.padEnd(10)} | ${u.role}`);
    });

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error creating users:', error);
    process.exit(1);
  }
}

createUsers();
