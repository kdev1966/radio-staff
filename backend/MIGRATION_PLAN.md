# Plan de Migration Multi-Tenant - Radio Staff Platform

## 📋 Résumé des Changements

Cette migration transforme l'application **mono-tenant** en **plateforme SAAS multi-tenant** avec:
- Isolation complète des services de radiologie
- Hiérarchie SUPER_ADMIN → ADMIN → RH → EMPLOYE
- Permissions granulaires configurables pour RH
- Workflow congés en 2 étapes (RH → ADMIN)
- Support transfert/archivage d'employés

---

## ✅ Status Actuel des Fichiers Créés

### Entités (*.v2.ts = nouvelles versions)
- [x] `entities/radiology-service.entity.ts` ✅ **CRÉÉ**
- [x] `entities/super-admin.entity.ts` ✅ **CRÉÉ**
- [x] `entities/employee.entity.v2.ts` ✅ **CRÉÉ** (à renommer)
- [x] `entities/leave-request.entity.v2.ts` ✅ **CRÉÉ** (à renommer)
- [x] `entities/shift.entity.v2.ts` ✅ **CRÉÉ** (à renommer)
- [x] `entities/audit-log.entity.v2.ts` ✅ **CRÉÉ** (à renommer)

### Enums
- [x] `common/enums/permission.enum.ts` ✅ **CRÉÉ**
- [x] `common/enums/leave.enum.ts` ✅ **MODIFIÉ** (workflow RH)

### Guards
- [x] `common/guards/service-scope.guard.ts` ✅ **CRÉÉ**
- [x] `common/guards/super-admin.guard.ts` ✅ **CRÉÉ**
- [x] `common/guards/permissions.guard.ts` ✅ **CRÉÉ**
- [ ] `common/guards/roles.guard.ts` ⏳ **À MODIFIER**

### Decorators
- [x] `common/decorators/permissions.decorator.ts` ✅ **CRÉÉ**
- [x] `common/decorators/current-user.decorator.ts` ✅ **CRÉÉ**

### Documentation
- [x] `ARCHITECTURE.md` ✅ **CRÉÉ**
- [x] `MIGRATION_PLAN.md` ✅ **EN COURS**

---

## 🎯 Plan de Migration par Phases

### Phase 1: Préparation et Backup (30 min) 🔴 CRITIQUE
**Objectif**: Sauvegarder l'état actuel avant modifications

#### Checkpoint 1.1: Backup Base de Données
```bash
# Dump de la base actuelle
pg_dump -h localhost -U radio radiodb > backup_before_migration_$(date +%Y%m%d).sql

# Vérifier le backup
ls -lh backup_before_migration_*.sql
```

#### Checkpoint 1.2: Commit Git des fichiers v2
```bash
cd /Users/kdev66/Desktop/nestjsProjects/radio-staff/backend

# Vérifier les fichiers créés
git status

# Ajouter les nouveaux fichiers
git add src/entities/*.v2.ts
git add src/common/enums/permission.enum.ts
git add src/common/guards/service-scope.guard.ts
git add src/common/guards/super-admin.guard.ts
git add src/common/guards/permissions.guard.ts
git add src/common/decorators/permissions.decorator.ts
git add src/common/decorators/current-user.decorator.ts
git add ARCHITECTURE.md
git add MIGRATION_PLAN.md

# Commit
git commit -m "feat: Add multi-tenant architecture entities and guards (v2 files)"
```

#### Checkpoint 1.3: Créer branche de migration
```bash
git checkout -b feature/multi-tenant-migration

# Push branche pour backup cloud
git push -u origin feature/multi-tenant-migration
```

**✅ Validation Phase 1**: Fichiers sauvegardés, branche créée, backup DB disponible

---

### Phase 2: Schéma de Base de Données (2-3h)
**Objectif**: Créer les nouvelles tables et modifier les existantes

#### Checkpoint 2.1: Créer migration TypeORM initiale
```bash
npm run typeorm migration:create src/migrations/MultiTenantRefactor
```

**Fichier**: `src/migrations/XXXXXX-MultiTenantRefactor.ts`

**Contenu migration UP**:
```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class MultiTenantRefactor1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Créer table radiology_services
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

    // 2. Créer table super_admins
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

    // 3. Créer service par défaut pour migration
    await queryRunner.query(`
      INSERT INTO radiology_services (id, name, hospital_name, status)
      VALUES (
        '00000000-0000-0000-0000-000000000001',
        'Service de Radiologie Principal',
        'Hôpital Principal',
        'ACTIVE'
      );
    `);

    // 4. Ajouter colonnes à employees
    await queryRunner.query(`
      ALTER TABLE employees
      ADD COLUMN service_id UUID REFERENCES radiology_services(id) ON DELETE CASCADE,
      ADD COLUMN employee_type VARCHAR CHECK (employee_type IN ('TECHNICIEN', 'ADMINISTRATIF')),
      ADD COLUMN permissions TEXT,
      ADD COLUMN is_active BOOLEAN DEFAULT TRUE,
      ADD COLUMN previous_service_id UUID,
      ADD COLUMN transferred_at TIMESTAMP;
    `);

    // 5. Migrer employés existants vers service par défaut
    await queryRunner.query(`
      UPDATE employees
      SET service_id = '00000000-0000-0000-0000-000000000001';
    `);

    // 6. Migrer rôles TECHNICIEN/ADMINISTRATIF vers EMPLOYE
    await queryRunner.query(`
      UPDATE employees
      SET employee_type = role, role = 'EMPLOYE'
      WHERE role IN ('TECHNICIEN', 'ADMINISTRATIF');
    `);

    // 7. Fusionner CHEF_SERVICE vers ADMIN
    await queryRunner.query(`
      UPDATE employees
      SET role = 'ADMIN'
      WHERE role = 'CHEF_SERVICE';
    `);

    // 8. Rendre service_id NOT NULL après migration
    await queryRunner.query(`
      ALTER TABLE employees
      ALTER COLUMN service_id SET NOT NULL;
    `);

    // 9. Créer index et contraintes employees
    await queryRunner.query(`
      CREATE INDEX idx_employees_service_id ON employees(service_id);
      CREATE INDEX idx_employees_service_role ON employees(service_id, role);
      CREATE UNIQUE INDEX idx_employees_service_matricule ON employees(service_id, matricule);
    `);

    // 10. Supprimer contrainte unique sur matricule global
    await queryRunner.query(`
      ALTER TABLE employees DROP CONSTRAINT IF EXISTS UQ_employees_matricule;
    `);

    // 11. Ajouter service_id à leave_requests
    await queryRunner.query(`
      ALTER TABLE leave_requests
      ADD COLUMN service_id UUID REFERENCES radiology_services(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      UPDATE leave_requests lr
      SET service_id = e.service_id
      FROM employees e
      WHERE lr.employee_id = e.id;
    `);

    await queryRunner.query(`
      ALTER TABLE leave_requests ALTER COLUMN service_id SET NOT NULL;
      CREATE INDEX idx_leave_requests_service_id ON leave_requests(service_id);
      CREATE INDEX idx_leave_requests_service_dates ON leave_requests(service_id, start_date, end_date);
    `);

    // 12. Modifier workflow leave_requests
    await queryRunner.query(`
      ALTER TABLE leave_requests
      DROP COLUMN IF EXISTS manager_approved_at,
      DROP COLUMN IF EXISTS manager_approved_by,
      DROP COLUMN IF EXISTS hr_approved_at,
      DROP COLUMN IF EXISTS hr_approved_by,
      ADD COLUMN rh_reviewed_at TIMESTAMP,
      ADD COLUMN rh_reviewed_by UUID REFERENCES employees(id),
      ADD COLUMN rh_comment TEXT,
      ADD COLUMN admin_reviewed_at TIMESTAMP,
      ADD COLUMN admin_reviewed_by UUID REFERENCES employees(id),
      ADD COLUMN admin_comment TEXT,
      ADD COLUMN comment TEXT;
    `);

    // 13. Migrer status congés
    await queryRunner.query(`
      UPDATE leave_requests
      SET status = CASE
        WHEN status = 'APPROVED_BY_MANAGER' THEN 'APPROVED_BY_RH'
        WHEN status = 'REJECTED' THEN 'REJECTED_BY_ADMIN'
        ELSE status
      END;
    `);

    // 14. Ajouter service_id à shifts
    await queryRunner.query(`
      ALTER TABLE shifts
      ADD COLUMN service_id UUID REFERENCES radiology_services(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      UPDATE shifts
      SET service_id = '00000000-0000-0000-0000-000000000001';
    `);

    await queryRunner.query(`
      ALTER TABLE shifts ALTER COLUMN service_id SET NOT NULL;
      CREATE INDEX idx_shifts_service_id ON shifts(service_id);
      CREATE INDEX idx_shifts_service_date ON shifts(service_id, shift_date);
    `);

    // 15. Modifier contrainte unique shifts
    await queryRunner.query(`
      ALTER TABLE shifts DROP CONSTRAINT IF EXISTS UQ_shifts_date_period;
      CREATE UNIQUE INDEX idx_shifts_service_date_period ON shifts(service_id, shift_date, period);
    `);

    // 16. Ajouter service_id à audit_logs
    await queryRunner.query(`
      ALTER TABLE audit_logs
      ADD COLUMN service_id UUID REFERENCES radiology_services(id) ON DELETE SET NULL,
      ADD COLUMN is_super_admin BOOLEAN DEFAULT FALSE;
    `);

    await queryRunner.query(`
      UPDATE audit_logs al
      SET service_id = e.service_id
      FROM employees e
      WHERE al.user_id = e.id;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_audit_logs_service_timestamp ON audit_logs(service_id, timestamp);
    `);

    console.log('✅ Migration multi-tenant completed successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback en ordre inverse
    // ... (à implémenter si besoin)
    throw new Error('Rollback not implemented - restore from backup instead');
  }
}
```

#### Checkpoint 2.2: Tester migration sur DB de dev
```bash
# Exécuter migration
npm run migration:run

# Vérifier tables créées
npm run typeorm query "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"

# Vérifier données migrées
npm run typeorm query "SELECT id, role, service_id FROM employees LIMIT 5"
npm run typeorm query "SELECT * FROM radiology_services"
```

**✅ Validation Phase 2**: Tables créées, données migrées, index créés

---

### Phase 3: Remplacer Anciennes Entités (1h)
**Objectif**: Activer les nouvelles entités TypeORM

#### Checkpoint 3.1: Renommer fichiers v2
```bash
cd /Users/kdev66/Desktop/nestjsProjects/radio-staff/backend/src/entities

# Sauvegarder anciennes versions
mv employee.entity.ts employee.entity.old.ts
mv leave-request.entity.ts leave-request.entity.old.ts
mv shift.entity.ts shift.entity.old.ts
mv audit-log.entity.ts audit-log.entity.old.ts

# Activer nouvelles versions
mv employee.entity.v2.ts employee.entity.ts
mv leave-request.entity.v2.ts leave-request.entity.ts
mv shift.entity.v2.ts shift.entity.ts
mv audit-log.entity.v2.ts audit-log.entity.ts
```

#### Checkpoint 3.2: Mettre à jour data-source.ts
```typescript
// src/data-source.ts
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Employee } from './entities/employee.entity';
import { LeaveRequest } from './entities/leave-request.entity';
import { Shift } from './entities/shift.entity';
import { ShiftAssignment } from './entities/shift-assignment.entity';
import { ShiftPosition } from './entities/shift-position.entity';
import { AuditLog } from './entities/audit-log.entity';
import { RadiologyService } from './entities/radiology-service.entity'; // ← NOUVEAU
import { SuperAdmin } from './entities/super-admin.entity'; // ← NOUVEAU

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    RadiologyService, // ← NOUVEAU
    SuperAdmin, // ← NOUVEAU
    Employee,
    LeaveRequest,
    Shift,
    ShiftAssignment,
    ShiftPosition,
    AuditLog,
  ],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
```

#### Checkpoint 3.3: Compiler et vérifier
```bash
npm run build

# Si erreurs de compilation, les corriger une par une
# Erreurs courantes: imports, types, FK
```

**✅ Validation Phase 3**: Compilation réussie, nouvelles entités actives

---

### Phase 4: Modules et Services (3-4h)
**Objectif**: Créer nouveaux modules et adapter les existants

#### Checkpoint 4.1: Créer module RadiologyService
```bash
nest g module radiology-service
nest g service radiology-service
nest g controller radiology-service
```

**Fichier**: `src/radiology-service/radiology-service.service.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RadiologyService } from '../entities/radiology-service.entity';

@Injectable()
export class RadiologyServiceService {
  constructor(
    @InjectRepository(RadiologyService)
    private radiologyServiceRepo: Repository<RadiologyService>,
  ) {}

  async create(dto: CreateRadiologyServiceDto) {
    const service = this.radiologyServiceRepo.create(dto);
    return await this.radiologyServiceRepo.save(service);
  }

  async findAll() {
    return await this.radiologyServiceRepo.find({
      relations: ['employees'],
    });
  }

  async findOne(id: string) {
    return await this.radiologyServiceRepo.findOne({
      where: { id },
      relations: ['employees', 'shifts'],
    });
  }

  async update(id: string, dto: UpdateRadiologyServiceDto) {
    await this.radiologyServiceRepo.update(id, dto);
    return await this.findOne(id);
  }

  async suspend(id: string) {
    await this.radiologyServiceRepo.update(id, {
      status: ServiceStatus.SUSPENDED,
    });
  }

  async activate(id: string) {
    await this.radiologyServiceRepo.update(id, {
      status: ServiceStatus.ACTIVE,
    });
  }
}
```

**Fichier**: `src/radiology-service/radiology-service.controller.ts`
```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { RadiologyServiceService } from './radiology-service.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';

@Controller('admin/services')
@UseGuards(JwtAuthGuard, SuperAdminGuard) // ← SUPER_ADMIN uniquement
export class RadiologyServiceController {
  constructor(private readonly serviceService: RadiologyServiceService) {}

  @Get()
  findAll() {
    return this.serviceService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.serviceService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateRadiologyServiceDto) {
    return this.serviceService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRadiologyServiceDto) {
    return this.serviceService.update(id, dto);
  }

  @Post(':id/suspend')
  suspend(@Param('id') id: string) {
    return this.serviceService.suspend(id);
  }

  @Post(':id/activate')
  activate(@Param('id') id: string) {
    return this.serviceService.activate(id);
  }
}
```

#### Checkpoint 4.2: Créer module SuperAdmin
```bash
nest g module super-admin
nest g service super-admin
nest g controller super-admin
```

*Implémentation similaire à RadiologyService*

#### Checkpoint 4.3: Adapter EmployeeService
**Fichier**: `src/employee/employee.service.ts`

**MODIFICATIONS CRITIQUES**:
```typescript
@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee)
    private employeeRepo: Repository<Employee>,
  ) {}

  // ✅ TOUJOURS filtrer par serviceId
  async findAll(serviceId: string) {
    return await this.employeeRepo.find({
      where: { serviceId }, // ← CRITIQUE
      relations: ['service'],
    });
  }

  async findOne(id: string, serviceId: string) {
    return await this.employeeRepo.findOne({
      where: { id, serviceId }, // ← CRITIQUE
    });
  }

  async create(dto: CreateEmployeeDto, serviceId: string) {
    // ✅ Valider contrainte 1 ADMIN par service
    if (dto.role === EmployeeRole.ADMIN) {
      const existingAdmin = await this.employeeRepo.findOne({
        where: { serviceId, role: EmployeeRole.ADMIN },
      });

      if (existingAdmin) {
        throw new BadRequestException('Service already has an ADMIN');
      }
    }

    const employee = this.employeeRepo.create({
      ...dto,
      serviceId, // ← CRITIQUE
    });

    return await this.employeeRepo.save(employee);
  }

  async assignPermissions(
    employeeId: string,
    permissions: Permission[],
    adminServiceId: string,
  ) {
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId, serviceId: adminServiceId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found in your service');
    }

    if (employee.role !== EmployeeRole.RH) {
      throw new BadRequestException('Can only assign permissions to RH role');
    }

    employee.permissions = permissions;
    return await this.employeeRepo.save(employee);
  }

  async transfer(
    employeeId: string,
    targetServiceId: string,
    superAdminId: string,
  ) {
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Archiver historique
    employee.previousServiceId = employee.serviceId;
    employee.transferredAt = new Date();

    // Transférer
    employee.serviceId = targetServiceId;
    employee.role = EmployeeRole.EMPLOYE; // Reset rôle
    employee.permissions = []; // Reset permissions

    // Générer nouveau matricule pour nouveau service
    const newMatricule = await this.generateMatricule(targetServiceId);
    employee.matricule = newMatricule;

    return await this.employeeRepo.save(employee);
  }

  private async generateMatricule(serviceId: string): Promise<string> {
    const count = await this.employeeRepo.count({ where: { serviceId } });
    return `EMP${serviceId.substring(0, 8)}-${String(count + 1).padStart(4, '0')}`;
  }
}
```

#### Checkpoint 4.4: Adapter EmployeeController
**Fichier**: `src/employee/employee.controller.ts`

```typescript
@Controller('employees')
@UseGuards(JwtAuthGuard, ServiceScopeGuard) // ← Isolation tenant
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Get()
  @Roles('ADMIN', 'RH')
  @RequirePermissions(Permission.MANAGE_EMPLOYEES) // Pour RH
  async findAll(@CurrentUser('serviceId') serviceId: string) {
    return this.employeeService.findAll(serviceId);
  }

  @Get(':id')
  @Roles('ADMIN', 'RH', 'EMPLOYE')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    // EMPLOYE peut voir seulement son profil
    if (user.role === 'EMPLOYE' && id !== user.id) {
      throw new ForbiddenException('You can only view your own profile');
    }

    return this.employeeService.findOne(id, user.serviceId);
  }

  @Post()
  @Roles('ADMIN', 'RH')
  @RequirePermissions(Permission.MANAGE_EMPLOYEES)
  async create(
    @Body() dto: CreateEmployeeDto,
    @CurrentUser('serviceId') serviceId: string,
  ) {
    return this.employeeService.create(dto, serviceId);
  }

  @Patch(':id/permissions')
  @Roles('ADMIN') // Seulement ADMIN
  async assignPermissions(
    @Param('id') id: string,
    @Body() dto: AssignPermissionsDto,
    @CurrentUser('serviceId') serviceId: string,
  ) {
    return this.employeeService.assignPermissions(id, dto.permissions, serviceId);
  }

  @Post(':id/transfer')
  @UseGuards(JwtAuthGuard, SuperAdminGuard) // ← SUPER_ADMIN uniquement
  async transfer(
    @Param('id') id: string,
    @Body() dto: TransferEmployeeDto,
    @CurrentUser('id') superAdminId: string,
  ) {
    return this.employeeService.transfer(id, dto.targetServiceId, superAdminId);
  }
}
```

#### Checkpoint 4.5: Adapter LeaveService (Workflow RH)
**Fichier**: `src/leave/leave.service.ts`

**MODIFICATIONS CRITIQUES**:
```typescript
@Injectable()
export class LeaveService {
  constructor(
    @InjectRepository(LeaveRequest)
    private leaveRequestRepo: Repository<LeaveRequest>,
    @InjectRepository(Employee)
    private employeeRepo: Repository<Employee>,
  ) {}

  async findAll(serviceId: string, employeeId?: string) {
    return await this.leaveRequestRepo.find({
      where: {
        serviceId, // ← CRITIQUE
        ...(employeeId && { employeeId }),
      },
      relations: ['employee'],
    });
  }

  async create(dto: CreateLeaveDto, employeeId: string, serviceId: string) {
    const leaveRequest = this.leaveRequestRepo.create({
      ...dto,
      employeeId,
      serviceId, // ← CRITIQUE
      status: LeaveStatus.PENDING,
    });

    return await this.leaveRequestRepo.save(leaveRequest);
  }

  // ✅ Étape 1: RH approuve
  async approveByRH(id: string, rhId: string, serviceId: string) {
    const leave = await this.leaveRequestRepo.findOne({
      where: { id, serviceId },
    });

    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }

    if (leave.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Leave must be in PENDING status');
    }

    // Vérifier que RH a la permission APPROVE_LEAVES
    const rh = await this.employeeRepo.findOne({
      where: { id: rhId, serviceId, role: EmployeeRole.RH },
    });

    if (!rh || !rh.permissions?.includes(Permission.APPROVE_LEAVES)) {
      throw new ForbiddenException('You do not have permission to approve leaves');
    }

    leave.status = LeaveStatus.APPROVED_BY_RH;
    leave.rhReviewedAt = new Date();
    leave.rhReviewedBy = rhId;

    return await this.leaveRequestRepo.save(leave);
  }

  // ✅ Étape 2: ADMIN approuve (validation finale)
  async approveByAdmin(id: string, adminId: string, serviceId: string) {
    const leave = await this.leaveRequestRepo.findOne({
      where: { id, serviceId },
    });

    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }

    if (leave.status !== LeaveStatus.APPROVED_BY_RH) {
      throw new BadRequestException('Leave must be approved by RH first');
    }

    leave.status = LeaveStatus.APPROVED;
    leave.adminReviewedAt = new Date();
    leave.adminReviewedBy = adminId;

    return await this.leaveRequestRepo.save(leave);
  }

  // ✅ RH peut rejeter à l'étape 1
  async rejectByRH(id: string, rhId: string, reason: string, serviceId: string) {
    const leave = await this.leaveRequestRepo.findOne({
      where: { id, serviceId },
    });

    if (leave.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Leave must be in PENDING status');
    }

    leave.status = LeaveStatus.REJECTED_BY_RH;
    leave.rejectedAt = new Date();
    leave.rejectedBy = rhId;
    leave.rejectionReason = reason;

    return await this.leaveRequestRepo.save(leave);
  }

  // ✅ ADMIN peut rejeter à l'étape 2
  async rejectByAdmin(id: string, adminId: string, reason: string, serviceId: string) {
    const leave = await this.leaveRequestRepo.findOne({
      where: { id, serviceId },
    });

    if (leave.status !== LeaveStatus.APPROVED_BY_RH) {
      throw new BadRequestException('Leave must be approved by RH first');
    }

    leave.status = LeaveStatus.REJECTED_BY_ADMIN;
    leave.rejectedAt = new Date();
    leave.rejectedBy = adminId;
    leave.rejectionReason = reason;

    return await this.leaveRequestRepo.save(leave);
  }
}
```

#### Checkpoint 4.6: Adapter LeaveController
**Fichier**: `src/leave/leave.controller.ts`

```typescript
@Controller('leaves')
@UseGuards(JwtAuthGuard, ServiceScopeGuard)
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  @Roles('EMPLOYE', 'ADMIN', 'RH')
  async create(
    @Body() dto: CreateLeaveDto,
    @CurrentUser() user: any,
  ) {
    return this.leaveService.create(dto, user.id, user.serviceId);
  }

  @Get()
  @Roles('ADMIN', 'RH', 'EMPLOYE')
  async findAll(
    @CurrentUser() user: any,
    @Query('employeeId') employeeId?: string,
  ) {
    // EMPLOYE ne voit que ses congés
    if (user.role === 'EMPLOYE') {
      employeeId = user.id;
    }

    return this.leaveService.findAll(user.serviceId, employeeId);
  }

  // ✅ Route RH approval
  @Post(':id/approve-rh')
  @Roles('RH')
  @RequirePermissions(Permission.APPROVE_LEAVES)
  async approveByRH(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.leaveService.approveByRH(id, user.id, user.serviceId);
  }

  // ✅ Route ADMIN approval (final)
  @Post(':id/approve-admin')
  @Roles('ADMIN')
  async approveByAdmin(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.leaveService.approveByAdmin(id, user.id, user.serviceId);
  }

  // ✅ Route RH rejection
  @Post(':id/reject-rh')
  @Roles('RH')
  @RequirePermissions(Permission.APPROVE_LEAVES)
  async rejectByRH(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: any,
  ) {
    return this.leaveService.rejectByRH(id, user.id, body.reason, user.serviceId);
  }

  // ✅ Route ADMIN rejection
  @Post(':id/reject-admin')
  @Roles('ADMIN')
  async rejectByAdmin(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: any,
  ) {
    return this.leaveService.rejectByAdmin(id, user.id, body.reason, user.serviceId);
  }
}
```

#### Checkpoint 4.7: Adapter ShiftService
**Modifications identiques**: Toujours filtrer par `serviceId`

**✅ Validation Phase 4**: Tous les services filtrent par serviceId, workflow congés implémenté

---

### Phase 5: Authentification (2h)
**Objectif**: Gérer 2 types d'utilisateurs (SuperAdmin vs Employee)

#### Checkpoint 5.1: Adapter JwtStrategy
**Fichier**: `src/auth/strategies/jwt.strategy.ts`

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(Employee)
    private employeeRepo: Repository<Employee>,
    @InjectRepository(SuperAdmin)
    private superAdminRepo: Repository<SuperAdmin>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    // ✅ Distinguer SuperAdmin vs Employee
    if (payload.isSuperAdmin) {
      const superAdmin = await this.superAdminRepo.findOne({
        where: { id: payload.sub },
      });

      if (!superAdmin || !superAdmin.isActive) {
        throw new UnauthorizedException('Super admin not found or inactive');
      }

      return {
        id: superAdmin.id,
        email: superAdmin.email,
        fullName: superAdmin.fullName,
        isSuperAdmin: true,
        // Pas de serviceId pour SuperAdmin
      };
    } else {
      const employee = await this.employeeRepo.findOne({
        where: { id: payload.sub },
        relations: ['service'],
      });

      if (!employee || !employee.isActive) {
        throw new UnauthorizedException('Employee not found or inactive');
      }

      if (employee.service.status !== 'ACTIVE') {
        throw new UnauthorizedException('Service is suspended or inactive');
      }

      return {
        id: employee.id,
        email: employee.email,
        role: employee.role,
        serviceId: employee.serviceId, // ← CRITIQUE pour isolation
        serviceName: employee.service.name,
        permissions: employee.permissions || [],
        employeeType: employee.employeeType,
        isSuperAdmin: false,
      };
    }
  }
}
```

#### Checkpoint 5.2: Adapter AuthService
**Fichier**: `src/auth/auth.service.ts`

```typescript
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Employee)
    private employeeRepo: Repository<Employee>,
    @InjectRepository(SuperAdmin)
    private superAdminRepo: Repository<SuperAdmin>,
    private jwtService: JwtService,
  ) {}

  // ✅ Login SUPER_ADMIN
  async loginSuperAdmin(email: string, password: string) {
    const superAdmin = await this.superAdminRepo.findOne({
      where: { email },
      select: ['id', 'email', 'password', 'fullName', 'isActive'],
    });

    if (!superAdmin || !superAdmin.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, superAdmin.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.superAdminRepo.update(superAdmin.id, {
      lastLoginAt: new Date(),
    });

    const payload = {
      sub: superAdmin.id,
      email: superAdmin.email,
      fullName: superAdmin.fullName,
      isSuperAdmin: true,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: superAdmin.id,
        email: superAdmin.email,
        fullName: superAdmin.fullName,
        isSuperAdmin: true,
      },
    };
  }

  // ✅ Login EMPLOYEE (ADMIN, RH, EMPLOYE)
  async loginEmployee(email: string, password: string) {
    const employee = await this.employeeRepo.findOne({
      where: { email },
      select: [
        'id',
        'email',
        'password',
        'role',
        'serviceId',
        'permissions',
        'employeeType',
        'isActive',
      ],
      relations: ['service'],
    });

    if (!employee || !employee.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (employee.service.status !== 'ACTIVE') {
      throw new UnauthorizedException('Service is not active');
    }

    const isPasswordValid = await bcrypt.compare(password, employee.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: employee.id,
      email: employee.email,
      role: employee.role,
      serviceId: employee.serviceId, // ← CRITIQUE
      serviceName: employee.service.name,
      permissions: employee.permissions || [],
      employeeType: employee.employeeType,
      isSuperAdmin: false,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: employee.id,
        email: employee.email,
        role: employee.role,
        serviceId: employee.serviceId,
        serviceName: employee.service.name,
        permissions: employee.permissions,
        employeeType: employee.employeeType,
        isSuperAdmin: false,
      },
    };
  }
}
```

#### Checkpoint 5.3: Adapter AuthController (2 routes login)
**Fichier**: `src/auth/auth.controller.ts`

```typescript
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ✅ Route login pour SuperAdmin
  @Post('super-admin/login')
  @Public()
  async loginSuperAdmin(@Body() dto: LoginDto) {
    return this.authService.loginSuperAdmin(dto.email, dto.password);
  }

  // ✅ Route login pour Employees (ADMIN, RH, EMPLOYE)
  @Post('login')
  @Public()
  async loginEmployee(@Body() dto: LoginDto) {
    return this.authService.loginEmployee(dto.email, dto.password);
  }

  @Post('register')
  @Roles('ADMIN', 'RH') // Seul ADMIN/RH peuvent créer des employés
  @RequirePermissions(Permission.MANAGE_EMPLOYEES)
  async register(
    @Body() dto: RegisterDto,
    @CurrentUser('serviceId') serviceId: string,
  ) {
    return this.authService.registerEmployee(dto, serviceId);
  }
}
```

**✅ Validation Phase 5**: 2 types de login fonctionnels, JWT correct, isolation par serviceId

---

### Phase 6: Tests et Validation (2-3h)
**Objectif**: Tester tous les scénarios

#### Checkpoint 6.1: Seed Data pour Tests
**Fichier**: `src/seeds/multi-tenant-test-data.ts`

```typescript
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
  });

  await dataSource.initialize();

  // 1. Créer SUPER_ADMIN
  const superAdminPassword = await bcrypt.hash('SuperAdmin123!', 10);
  await dataSource.query(`
    INSERT INTO super_admins (email, password, full_name)
    VALUES ('admin@radiostaff.com', '${superAdminPassword}', 'Platform Administrator')
    ON CONFLICT (email) DO NOTHING;
  `);

  // 2. Créer 2 services de test
  const [service1Id, service2Id] = [
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
  ];

  await dataSource.query(`
    INSERT INTO radiology_services (id, name, hospital_name, status)
    VALUES
      ('${service1Id}', 'Service Radio CHU Nord', 'CHU Nord', 'ACTIVE'),
      ('${service2Id}', 'Service Radio CHU Sud', 'CHU Sud', 'ACTIVE')
    ON CONFLICT (id) DO NOTHING;
  `);

  // 3. Créer ADMIN pour chaque service
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  await dataSource.query(`
    INSERT INTO employees (service_id, matricule, first_name, last_name, birth_date, phone, role, address, email, password)
    VALUES
      ('${service1Id}', 'ADMIN001', 'Jean', 'Dupont', '1975-05-15', '0601020304', 'ADMIN', '1 rue Nord', 'admin1@chu-nord.fr', '${adminPassword}'),
      ('${service2Id}', 'ADMIN001', 'Marie', 'Martin', '1978-08-20', '0605060708', 'ADMIN', '2 rue Sud', 'admin2@chu-sud.fr', '${adminPassword}')
    ON CONFLICT DO NOTHING;
  `);

  // 4. Créer RH avec permissions différentes
  const rhPassword = await bcrypt.hash('Rh123!', 10);
  await dataSource.query(`
    INSERT INTO employees (service_id, matricule, first_name, last_name, birth_date, phone, role, permissions, address, email, password)
    VALUES
      ('${service1Id}', 'RH001', 'Sophie', 'Bernard', '1980-03-10', '0611121314', 'RH', 'manage_leaves,approve_leaves', '3 rue Nord', 'rh1@chu-nord.fr', '${rhPassword}'),
      ('${service2Id}', 'RH001', 'Pierre', 'Dubois', '1982-07-25', '0621222324', 'RH', 'manage_employees,manage_shifts', '4 rue Sud', 'rh2@chu-sud.fr', '${rhPassword}')
    ON CONFLICT DO NOTHING;
  `);

  // 5. Créer EMPLOYES
  const employeePassword = await bcrypt.hash('Emp123!', 10);
  await dataSource.query(`
    INSERT INTO employees (service_id, matricule, first_name, last_name, birth_date, phone, role, employee_type, address, email, password)
    VALUES
      ('${service1Id}', 'EMP001', 'Luc', 'Moreau', '1990-01-15', '0631323334', 'EMPLOYE', 'TECHNICIEN', '5 rue Nord', 'luc.moreau@chu-nord.fr', '${employeePassword}'),
      ('${service1Id}', 'EMP002', 'Julie', 'Petit', '1992-06-20', '0641424344', 'EMPLOYE', 'ADMINISTRATIF', '6 rue Nord', 'julie.petit@chu-nord.fr', '${employeePassword}'),
      ('${service2Id}', 'EMP001', 'Marc', 'Roux', '1988-11-30', '0651525354', 'EMPLOYE', 'TECHNICIEN', '7 rue Sud', 'marc.roux@chu-sud.fr', '${employeePassword}')
    ON CONFLICT DO NOTHING;
  `);

  console.log('✅ Multi-tenant test data seeded successfully');

  await dataSource.destroy();
}

seed().catch(console.error);
```

**Exécuter le seed**:
```bash
ts-node src/seeds/multi-tenant-test-data.ts
```

#### Checkpoint 6.2: Tests Manuels (Postman/Insomnia)

**Test 1: Login SuperAdmin**
```bash
POST http://localhost:4000/auth/super-admin/login
Body: { "email": "admin@radiostaff.com", "password": "SuperAdmin123!" }

✅ Attendu: Token JWT avec isSuperAdmin=true
```

**Test 2: Login ADMIN Service 1**
```bash
POST http://localhost:4000/auth/login
Body: { "email": "admin1@chu-nord.fr", "password": "Admin123!" }

✅ Attendu: Token JWT avec serviceId=11111111..., role=ADMIN
```

**Test 3: ADMIN1 liste ses employés (doit voir 3)**
```bash
GET http://localhost:4000/employees
Headers: Authorization: Bearer <token_admin1>

✅ Attendu: 3 employés (1 RH, 2 EMPLOYES) du service Nord uniquement
```

**Test 4: ADMIN1 tente de lister employés Service 2 (doit échouer)**
```bash
GET http://localhost:4000/employees?serviceId=22222222-2222-2222-2222-222222222222
Headers: Authorization: Bearer <token_admin1>

❌ Attendu: 403 Forbidden - Access denied to other service
```

**Test 5: EMPLOYE demande congé**
```bash
POST http://localhost:4000/leaves
Headers: Authorization: Bearer <token_employe>
Body: {
  "startDate": "2025-12-01",
  "endDate": "2025-12-05",
  "days": 5,
  "type": "CP",
  "comment": "Vacances de fin d'année"
}

✅ Attendu: Leave créé avec status=PENDING
```

**Test 6: RH approuve congé (étape 1)**
```bash
POST http://localhost:4000/leaves/:id/approve-rh
Headers: Authorization: Bearer <token_rh1>

✅ Attendu: status=APPROVED_BY_RH, rhReviewedAt rempli
```

**Test 7: ADMIN approuve congé (étape 2 - finale)**
```bash
POST http://localhost:4000/leaves/:id/approve-admin
Headers: Authorization: Bearer <token_admin1>

✅ Attendu: status=APPROVED, adminReviewedAt rempli
```

**Test 8: RH1 sans permission tente de créer employé (doit échouer)**
```bash
POST http://localhost:4000/employees
Headers: Authorization: Bearer <token_rh1>
Body: { ... }

❌ Attendu: 403 Forbidden - Permission MANAGE_EMPLOYEES required
```

**Test 9: RH2 avec permission crée employé (doit réussir)**
```bash
POST http://localhost:4000/employees
Headers: Authorization: Bearer <token_rh2>
Body: { ... }

✅ Attendu: 201 Created
```

**Test 10: SUPER_ADMIN crée nouveau service**
```bash
POST http://localhost:4000/admin/services
Headers: Authorization: Bearer <token_superadmin>
Body: {
  "name": "Service Radio CHU Est",
  "hospitalName": "CHU Est",
  "subscriptionTier": "BASIC"
}

✅ Attendu: Service créé
```

**Test 11: SUPER_ADMIN transfère employé entre services**
```bash
POST http://localhost:4000/employees/:employeeId/transfer
Headers: Authorization: Bearer <token_superadmin>
Body: { "targetServiceId": "22222222..." }

✅ Attendu: Employé transféré, previousServiceId rempli, rôle reset
```

**Test 12: Isolation audit logs**
```bash
GET http://localhost:4000/audit-logs
Headers: Authorization: Bearer <token_admin1>

✅ Attendu: Seulement audits du service Nord
```

#### Checkpoint 6.3: Tests Automatisés (E2E)
*À implémenter si besoin*

**✅ Validation Phase 6**: Tous les tests passent, isolation vérifiée, workflow congés OK

---

### Phase 7: Finalisation et Documentation (1h)

#### Checkpoint 7.1: Nettoyer fichiers obsolètes
```bash
cd /Users/kdev66/Desktop/nestjsProjects/radio-staff/backend/src/entities

# Supprimer anciennes versions après validation
rm employee.entity.old.ts
rm leave-request.entity.old.ts
rm shift.entity.old.ts
rm audit-log.entity.old.ts

# Supprimer anciens guards dupliqués si applicable
rm -rf src/auth/guards/roles.guard.ts (si doublon avec common/guards)
```

#### Checkpoint 7.2: Mettre à jour README
**Fichier**: `backend/README.md`

```markdown
# Radio Staff Platform - Backend

## Architecture

Cette application est une **plateforme SAAS multi-tenant** pour la gestion du personnel des services de radiologie.

### Hiérarchie des Rôles

1. **SUPER_ADMIN** (Plateforme) - Gestion globale de tous les services
2. **ADMIN** (Chef de service) - Gestion d'un service spécifique
3. **RH** (Ressources Humaines) - Permissions configurables par ADMIN
4. **EMPLOYE** (Technicien/Administratif) - Accès limité à ses données

Voir [ARCHITECTURE.md](./ARCHITECTURE.md) pour détails complets.

## Installation

\`\`\`bash
npm install
\`\`\`

## Configuration

\`\`\`env
DATABASE_URL=postgresql://user:password@localhost:5432/radio_staff
JWT_SECRET=your-secret-key
\`\`\`

## Migrations

\`\`\`bash
# Exécuter migrations
npm run migration:run

# Seed test data
ts-node src/seeds/multi-tenant-test-data.ts
\`\`\`

## Comptes de Test

### SuperAdmin
- Email: admin@radiostaff.com
- Password: SuperAdmin123!

### ADMIN (CHU Nord)
- Email: admin1@chu-nord.fr
- Password: Admin123!

### RH (CHU Nord)
- Email: rh1@chu-nord.fr
- Password: Rh123!
- Permissions: manage_leaves, approve_leaves

### EMPLOYE (CHU Nord)
- Email: luc.moreau@chu-nord.fr
- Password: Emp123!
- Type: TECHNICIEN

## Tests

\`\`\`bash
npm run test
npm run test:e2e
\`\`\`

## Documentation API

Voir [ARCHITECTURE.md](./ARCHITECTURE.md) - Section "Matrice des Permissions"
\`\`\`

#### Checkpoint 7.3: Commit final
```bash
cd /Users/kdev66/Desktop/nestjsProjects/radio-staff/backend

git add .
git commit -m "feat: Complete multi-tenant migration with SUPER_ADMIN, granular RH permissions, and 2-step leave workflow"
git push origin feature/multi-tenant-migration
```

#### Checkpoint 7.4: Créer Pull Request
```bash
gh pr create --title "🚀 Multi-Tenant Architecture Migration" --body "$(cat <<EOF
## Summary
Transforms the application into a SAAS multi-tenant platform with complete service isolation.

## Architecture Changes
- ✅ Multi-tenant with RadiologyService entity
- ✅ SUPER_ADMIN platform management
- ✅ Granular RH permissions (configurable by ADMIN)
- ✅ 2-step leave workflow (RH → ADMIN)
- ✅ Employee transfer/archive support
- ✅ Complete tenant isolation with ServiceScopeGuard

## Breaking Changes
- Database schema updated (migration required)
- JWT payload structure changed
- API routes require serviceId context

## Migration Guide
See [MIGRATION_PLAN.md](./MIGRATION_PLAN.md)

## Tests
- [x] Manual tests (Postman) - All passed
- [x] Isolation tests - Confirmed
- [x] Workflow tests - Validated
- [ ] E2E tests (optional)

## Documentation
- [x] ARCHITECTURE.md - Complete
- [x] MIGRATION_PLAN.md - Detailed
- [x] README.md - Updated
EOF
)"
```

**✅ Validation Phase 7**: Code nettoyé, documentation complète, PR créée

---

## 📊 Résumé des Temps Estimés

| Phase | Durée | Status |
|-------|-------|--------|
| 1. Préparation et Backup | 30 min | ⏳ À faire |
| 2. Schéma BDD | 2-3h | ⏳ À faire |
| 3. Entités | 1h | ✅ Fait |
| 4. Modules et Services | 3-4h | ⏳ À faire |
| 5. Authentification | 2h | ⏳ À faire |
| 6. Tests | 2-3h | ⏳ À faire |
| 7. Finalisation | 1h | ⏳ À faire |
| **TOTAL** | **12-15h** | - |

---

## 🔄 Reprendre le Travail

### Option 1: Par Phase
```bash
# Voir progression actuelle
cat MIGRATION_PLAN.md | grep "Status" | head -1

# Continuer à la phase suivante non terminée
```

### Option 2: Par Checkpoint
```bash
# Lister tous les checkpoints
grep "Checkpoint" MIGRATION_PLAN.md

# Exécuter checkpoint suivant
```

### Option 3: Vérification État
```bash
# Vérifier quels fichiers v2 existent
ls src/entities/*.v2.ts

# Vérifier si migration DB est faite
npm run typeorm query "SELECT * FROM radiology_services LIMIT 1"

# Vérifier si guards sont créés
ls src/common/guards/service-scope.guard.ts
```

---

## 🚨 Rollback d'Urgence

Si problème critique pendant migration:

```bash
# 1. Restaurer backup DB
psql -h localhost -U radio radiodb < backup_before_migration_YYYYMMDD.sql

# 2. Revenir au commit avant migration
git checkout master
git reset --hard <commit-before-migration>

# 3. Rebuild
npm run build
npm start
```

---

## 📞 Support

Pour questions ou problèmes pendant migration:
1. Consulter [ARCHITECTURE.md](./ARCHITECTURE.md)
2. Vérifier logs: `npm run start:dev`
3. Tester isolation: Checkpoint 6.2

---

**Date Création**: 2025-10-31
**Dernière Mise à Jour**: 2025-10-31
**Version**: 1.0
