import { AppDataSource } from '../data-source';
import { Employee, EmployeeRole } from '../entities/employee.entity';

async function fixAdminRole() {
  try {
    console.log('🔧 Fixing admin user role...\n');
    const dataSource = await AppDataSource.initialize();
    const employeeRepository = dataSource.getRepository(Employee);

    // Find admin user
    const adminUser = await employeeRepository.findOne({
      where: { email: 'admin@radio.local' },
    });

    if (!adminUser) {
      console.log('❌ Admin user not found');
      await dataSource.destroy();
      return;
    }

    console.log(`Current role: ${adminUser.role}`);

    if (adminUser.role !== EmployeeRole.ADMIN) {
      adminUser.role = EmployeeRole.ADMIN;
      await employeeRepository.save(adminUser);
      console.log('✅ Admin role updated to: ADMIN');
    } else {
      console.log('✅ Admin role is already correct');
    }

    console.log('\n📋 Admin User Details:');
    console.log('   Email:', adminUser.email);
    console.log('   Role:', adminUser.role);
    console.log('   Name:', `${adminUser.firstName} ${adminUser.lastName}`);

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error fixing admin role:', error);
    process.exit(1);
  }
}

fixAdminRole();
