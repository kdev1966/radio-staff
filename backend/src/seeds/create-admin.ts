import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../data-source';
import { Employee, EmployeeRole } from '../entities/employee.entity';

async function createAdmin() {
  try {
    const dataSource = await AppDataSource.initialize();
    const employeeRepository = dataSource.getRepository(Employee);

    // Check if admin exists
    const existingAdmin = await employeeRepository.findOne({
      where: { email: 'admin@radio.local' },
    });

    if (existingAdmin) {
      console.log('✅ Admin already exists');
      await dataSource.destroy();
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const admin = employeeRepository.create({
      matricule: 'ADMIN001',
      firstName: 'Admin',
      lastName: 'System',
      birthDate: new Date('1990-01-01'),
      phone: '+33 1 23 45 67 89',
      role: EmployeeRole.ADMIN,
      address: '1 Rue de l\'Hôpital',
      email: 'admin@radio.local',
      password: hashedPassword,
    });

    await employeeRepository.save(admin);

    console.log('✅ Admin user created:');
    console.log('   Email: admin@radio.local');
    console.log('   Password: admin123');

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    process.exit(1);
  }
}

createAdmin();
