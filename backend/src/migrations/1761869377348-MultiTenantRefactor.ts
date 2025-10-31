import { MigrationInterface, QueryRunner } from 'typeorm';

export class MultiTenantRefactor1761869377348 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop existing tables (dev mode - data not important)
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS shift_assignments CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS shift_positions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS shifts CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS leave_requests CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS employees CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS radiology_services CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS super_admins CASCADE`);

    console.log('✅ Dropped existing tables');

    // 1. Create radiology_services table
    await queryRunner.query(`
      CREATE TABLE radiology_services (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR NOT NULL,
        hospital_name VARCHAR NOT NULL,
        address VARCHAR,
        subscription_tier VARCHAR DEFAULT 'TRIAL' CHECK (subscription_tier IN ('TRIAL', 'BASIC', 'PRO', 'ENTERPRISE')),
        status VARCHAR DEFAULT 'TRIAL' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'TRIAL', 'EXPIRED')),
        trial_ends_at DATE,
        subscription_ends_at DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_radiology_services_name ON radiology_services(name);
      CREATE INDEX idx_radiology_services_status ON radiology_services(status);
    `);

    console.log('✅ Created radiology_services table');

    // 2. Create super_admins table
    await queryRunner.query(`
      CREATE TABLE super_admins (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR UNIQUE NOT NULL,
        password VARCHAR NOT NULL,
        full_name VARCHAR NOT NULL,
        phone VARCHAR,
        is_active BOOLEAN DEFAULT TRUE,
        last_login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('✅ Created super_admins table');

    // 3. Create default service for development
    await queryRunner.query(`
      INSERT INTO radiology_services (id, name, hospital_name, status)
      VALUES (
        '00000000-0000-0000-0000-000000000001',
        'Service de Radiologie Principal',
        'Hôpital Principal',
        'ACTIVE'
      );
    `);

    console.log('✅ Created default service');

    // 4. Create employees table
    await queryRunner.query(`
      CREATE TABLE employees (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        service_id UUID NOT NULL REFERENCES radiology_services(id) ON DELETE CASCADE,
        matricule VARCHAR NOT NULL,
        first_name VARCHAR NOT NULL,
        last_name VARCHAR NOT NULL,
        birth_date DATE NOT NULL,
        phone VARCHAR NOT NULL,
        role VARCHAR NOT NULL CHECK (role IN ('ADMIN', 'RH', 'EMPLOYE')),
        employee_type VARCHAR CHECK (employee_type IN ('TECHNICIEN', 'ADMINISTRATIF')),
        permissions TEXT,
        address VARCHAR NOT NULL,
        email VARCHAR UNIQUE NOT NULL,
        password VARCHAR NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        previous_service_id UUID,
        transferred_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_employees_service_id ON employees(service_id);
      CREATE INDEX idx_employees_service_role ON employees(service_id, role);
      CREATE UNIQUE INDEX idx_employees_service_matricule ON employees(service_id, matricule);
    `);

    console.log('✅ Created employees table');

    // 5. Create leave_requests table
    await queryRunner.query(`
      CREATE TABLE leave_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        service_id UUID NOT NULL REFERENCES radiology_services(id) ON DELETE CASCADE,
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        days DECIMAL(3,1) NOT NULL,
        type VARCHAR NOT NULL CHECK (type IN ('CP', 'RTT', 'MALADIE', 'FORMATION', 'SPECIAL')),
        status VARCHAR DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED_BY_RH', 'APPROVED', 'REJECTED_BY_RH', 'REJECTED_BY_ADMIN')),
        comment TEXT,
        requested_at TIMESTAMP DEFAULT NOW(),
        rh_reviewed_at TIMESTAMP,
        rh_reviewed_by UUID REFERENCES employees(id),
        rh_comment TEXT,
        admin_reviewed_at TIMESTAMP,
        admin_reviewed_by UUID REFERENCES employees(id),
        admin_comment TEXT,
        rejected_at TIMESTAMP,
        rejected_by UUID REFERENCES employees(id),
        rejection_reason TEXT
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_leave_requests_service_id ON leave_requests(service_id);
      CREATE INDEX idx_leave_requests_employee_id ON leave_requests(employee_id);
      CREATE INDEX idx_leave_requests_service_dates ON leave_requests(service_id, start_date, end_date);
    `);

    console.log('✅ Created leave_requests table');

    // 6. Create shifts table
    await queryRunner.query(`
      CREATE TABLE shifts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        service_id UUID NOT NULL REFERENCES radiology_services(id) ON DELETE CASCADE,
        shift_date DATE NOT NULL,
        period VARCHAR NOT NULL CHECK (period IN ('MORNING', 'AFTERNOON', 'NIGHT')),
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        day_type VARCHAR DEFAULT 'NORMAL' CHECK (day_type IN ('NORMAL', 'WEEKEND_HOLIDAY')),
        needed INTEGER DEFAULT 1
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_shifts_service_id ON shifts(service_id);
      CREATE INDEX idx_shifts_service_date ON shifts(service_id, shift_date);
      CREATE UNIQUE INDEX idx_shifts_service_date_period ON shifts(service_id, shift_date, period);
    `);

    console.log('✅ Created shifts table');

    // 7. Create shift_assignments table
    await queryRunner.query(`
      CREATE TABLE shift_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT NOW(),
        assigned_by UUID REFERENCES employees(id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_shift_assignments_shift_id ON shift_assignments(shift_id);
      CREATE INDEX idx_shift_assignments_employee_id ON shift_assignments(employee_id);
    `);

    console.log('✅ Created shift_assignments table');

    // 8. Create shift_positions table
    await queryRunner.query(`
      CREATE TABLE shift_positions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
        position_name VARCHAR NOT NULL,
        required_count INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_shift_positions_shift_id ON shift_positions(shift_id);
    `);

    console.log('✅ Created shift_positions table');

    // 9. Create audit_logs table
    await queryRunner.query(`
      CREATE TABLE audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        service_id UUID REFERENCES radiology_services(id) ON DELETE SET NULL,
        action VARCHAR NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'ASSIGN_SHIFT', 'APPROVE_LEAVE', 'REJECT_LEAVE', 'TRANSFER_EMPLOYEE', 'ARCHIVE_EMPLOYEE', 'CREATE_SERVICE', 'SUSPEND_SERVICE', 'GRANT_PERMISSION')),
        entity_type VARCHAR NOT NULL,
        entity_id VARCHAR,
        user_id VARCHAR,
        username VARCHAR,
        is_super_admin BOOLEAN DEFAULT FALSE,
        method VARCHAR,
        endpoint VARCHAR,
        status_code INTEGER,
        duration INTEGER,
        request_body JSONB,
        response_body JSONB,
        error_message TEXT,
        details JSONB,
        ip_address VARCHAR,
        user_agent TEXT,
        timestamp TIMESTAMP DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_audit_logs_service_timestamp ON audit_logs(service_id, timestamp);
      CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX idx_audit_logs_status_code ON audit_logs(status_code);
      CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
    `);

    console.log('✅ Created audit_logs table');
    console.log('🎉 Multi-tenant schema migration completed successfully!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: drop all tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS shift_positions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS shift_assignments CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS shifts CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS leave_requests CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS employees CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS super_admins CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS radiology_services CASCADE`);

    console.log('✅ Rollback completed - all tables dropped');
  }
}
