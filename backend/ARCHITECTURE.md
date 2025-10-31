# Architecture Multi-Tenant SAAS - Radio Staff Platform

## 📋 Vue d'Ensemble

Cette application est une plateforme SAAS multi-tenant pour la gestion du personnel des services de radiologie hospitaliers. Chaque service de radiologie est complètement isolé avec ses propres employés, congés, et plannings.

## 🎭 Hiérarchie des Rôles

### 1. SUPER_ADMIN (Plateforme)
**Table**: `super_admins`
**Scope**: Accès global à tous les services
**Responsabilités**:
- Créer/supprimer des services de radiologie
- Créer le compte ADMIN (chef de service) pour chaque nouveau service
- Suspendre/réactiver des services
- Consulter les audits de tous les services
- Gérer les abonnements et facturation
- Support technique niveau plateforme

**Restrictions**:
- N'a PAS accès direct aux employés, congés, shifts (délégué aux ADMIN)
- Ne peut pas se connecter comme employé d'un service

---

### 2. ADMIN (Chef de Service)
**Table**: `employees` avec `role='ADMIN'`
**Scope**: Accès complet à SON service uniquement
**Contrainte**: **1 seul ADMIN par service** (contrainte unique)

**Responsabilités**:
- CRUD employés de son service
- Assigner le rôle RH à des employés
- **Configurer les permissions granulaires des RH** (manage_employees, manage_leaves, manage_shifts)
- CRUD shifts et planning
- **Validation finale des congés** (après approbation RH)
- Export PDF du planning
- Consulter les audits de son service
- Transférer ou archiver des employés

**Permissions**: Toutes les permissions sur son service

---

### 3. RH (Ressources Humaines)
**Table**: `employees` avec `role='RH'`
**Scope**: Accès à SON service uniquement
**Contrainte**: Plusieurs RH possibles par service

**Responsabilités** (configurables par ADMIN):
- `manage_employees`: CRUD employés si permission accordée
- `manage_leaves`: Consulter et gérer les demandes de congés
- `approve_leaves`: **Pré-validation des congés** (workflow RH → ADMIN)
- `manage_shifts`: CRUD shifts si permission accordée
- `export_planning`: Export PDF si permission accordée
- `view_audits`: Consulter audits si permission accordée

**Permissions**: Sous-ensemble configurable défini par ADMIN

**Exemple de configuration**:
```typescript
// RH1 : Spécialisé congés
permissions: [Permission.MANAGE_LEAVES, Permission.APPROVE_LEAVES]

// RH2 : Spécialisé planning
permissions: [Permission.MANAGE_SHIFTS, Permission.EXPORT_PLANNING]

// RH3 : Complet
permissions: [Permission.MANAGE_EMPLOYEES, Permission.MANAGE_LEAVES, Permission.APPROVE_LEAVES]
```

---

### 4. EMPLOYE (Employé Standard)
**Table**: `employees` avec `role='EMPLOYE'`
**Scope**: Accès à SES propres données uniquement
**Types**: `TECHNICIEN` ou `ADMINISTRATIF`

**Responsabilités**:
- Consulter ses informations personnelles
- **Demander des congés**
- Consulter le statut de ses demandes de congés
- Consulter ses shifts/horaires de travail
- Mettre à jour son profil (limité)

**Permissions**: Lecture seule sauf pour les demandes de congés

---

## 🏗️ Schéma de Base de Données

### Tables Principales

#### 1. `radiology_services`
Service de radiologie (tenant)

```typescript
{
  id: uuid (PK)
  name: string                    // "Service Radio CHU Montpellier"
  hospitalName: string            // "CHU Montpellier"
  address: string?
  subscriptionTier: enum          // TRIAL, BASIC, PRO, ENTERPRISE
  status: enum                    // ACTIVE, SUSPENDED, TRIAL, EXPIRED
  trialEndsAt: date?
  subscriptionEndsAt: date?
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Relations**:
- `employees[]` - Employés du service
- `shifts[]` - Shifts du service
- `leaveRequests[]` - Demandes de congés du service

---

#### 2. `super_admins`
Administrateurs plateforme (hors-tenant)

```typescript
{
  id: uuid (PK)
  email: string (unique)
  password: string (hashed)
  fullName: string
  phone: string?
  isActive: boolean
  lastLoginAt: timestamp?
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Pas de serviceId** - accès global

---

#### 3. `employees`
Employés d'un service (multi-tenant)

```typescript
{
  id: uuid (PK)
  serviceId: uuid (FK -> radiology_services) **REQUIRED**
  matricule: string (unique per service)
  firstName: string
  lastName: string
  birthDate: date
  phone: string
  role: enum                      // ADMIN, RH, EMPLOYE
  employeeType: enum?             // TECHNICIEN, ADMINISTRATIF (si role=EMPLOYE)
  permissions: Permission[]       // Array pour RH (si role=RH)
  address: string
  email: string (unique)
  password: string (hashed)
  isActive: boolean               // Pour archivage
  previousServiceId: uuid?        // Pour transferts
  transferredAt: timestamp?
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Contraintes**:
- `UNIQUE(serviceId, matricule)` - Matricule unique par service
- Contrainte métier: 1 seul ADMIN par serviceId (validation dans le service)

**Index**:
- `(serviceId)` - Pour isolation tenant
- `(serviceId, role)` - Pour queries ADMIN/RH

---

#### 4. `leave_requests`
Demandes de congés (multi-tenant)

```typescript
{
  id: uuid (PK)
  serviceId: uuid (FK -> radiology_services) **REQUIRED**
  employeeId: uuid (FK -> employees)
  startDate: date
  endDate: date
  days: decimal(3,1)
  type: enum                      // CP, RTT, MALADIE, FORMATION, SPECIAL
  status: enum                    // Workflow: PENDING -> APPROVED_BY_RH -> APPROVED
  comment: text?
  requestedAt: timestamp

  // Workflow RH
  rhReviewedAt: timestamp?
  rhReviewedBy: uuid? (FK -> employees)
  rhComment: text?

  // Workflow ADMIN
  adminReviewedAt: timestamp?
  adminReviewedBy: uuid? (FK -> employees)
  adminComment: text?

  // Rejection
  rejectedAt: timestamp?
  rejectedBy: uuid? (FK -> employees)
  rejectionReason: text?
}
```

**Workflow**:
1. EMPLOYE crée demande → `status=PENDING`
2. RH approuve → `status=APPROVED_BY_RH` + `rhReviewedAt/By`
3. ADMIN approuve → `status=APPROVED` + `adminReviewedAt/By`

**Rejection**:
- RH peut rejeter → `status=REJECTED_BY_RH`
- ADMIN peut rejeter → `status=REJECTED_BY_ADMIN`

---

#### 5. `shifts`
Quarts de travail (multi-tenant)

```typescript
{
  id: uuid (PK)
  serviceId: uuid (FK -> radiology_services) **REQUIRED**
  shiftDate: date
  period: enum                    // MORNING, AFTERNOON, NIGHT
  startTime: time
  endTime: time
  dayType: enum                   // NORMAL, WEEKEND_HOLIDAY
  needed: integer                 // Nombre d'employés requis
}
```

**Contrainte**: `UNIQUE(serviceId, shiftDate, period)`

---

#### 6. `audit_logs`
Journaux d'audit (multi-tenant + global)

```typescript
{
  id: uuid (PK)
  serviceId: uuid? (FK -> radiology_services) // Nullable pour actions SUPER_ADMIN
  action: enum                    // CREATE, UPDATE, DELETE, LOGIN, etc.
  entityType: string
  entityId: string?
  userId: string?                 // employeeId OU superAdminId
  username: string?
  isSuperAdmin: boolean
  method: string?                 // GET, POST, etc.
  endpoint: string?
  statusCode: integer?
  duration: integer?
  requestBody: jsonb?
  responseBody: jsonb?
  errorMessage: text?
  details: jsonb?
  ipAddress: string?
  userAgent: text?
  timestamp: timestamp
}
```

**Index**:
- `(serviceId, timestamp)` - Pour audits par service
- `(userId, action)` - Pour actions par utilisateur

---

## 🔐 Système de Guards

### 1. ServiceScopeGuard (Isolation Tenant)
**Objectif**: Garantir que les utilisateurs ne peuvent accéder qu'aux données de leur service

**Logique**:
```typescript
if (user.isSuperAdmin) {
  return true; // Bypass
}

if (!user.serviceId) {
  throw ForbiddenException('No service assigned');
}

// Valider que serviceId dans params/query/body correspond à user.serviceId
if (targetServiceId && targetServiceId !== user.serviceId) {
  throw ForbiddenException('Access denied to other service');
}

// Auto-inject serviceId dans request pour filtrage automatique
request.scopedServiceId = user.serviceId;
return true;
```

**Usage**:
```typescript
@UseGuards(JwtAuthGuard, ServiceScopeGuard)
@Controller('employees')
export class EmployeeController { ... }
```

---

### 2. SuperAdminGuard
**Objectif**: Restreindre les routes aux SUPER_ADMIN uniquement

**Logique**:
```typescript
if (!user.isSuperAdmin) {
  throw ForbiddenException('Platform admin only');
}
return true;
```

**Usage**:
```typescript
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/services')
export class PlatformAdminController { ... }
```

---

### 3. RolesGuard
**Objectif**: Vérifier le rôle de l'utilisateur (ADMIN, RH, EMPLOYE)

**Logique**:
```typescript
if (user.isSuperAdmin) return true;

const hasRole = requiredRoles.includes(user.role);
if (!hasRole) {
  throw ForbiddenException('Role required');
}
return true;
```

**Usage**:
```typescript
@Roles('ADMIN', 'RH')
@Get('leaves')
async getLeaves() { ... }
```

---

### 4. PermissionsGuard (Granulaire RH)
**Objectif**: Vérifier les permissions spécifiques pour les RH

**Logique**:
```typescript
if (user.isSuperAdmin) return true;
if (user.role === 'ADMIN') return true; // ADMIN a toutes permissions

if (user.role === 'RH') {
  const hasPermission = user.permissions.some(p => requiredPermissions.includes(p));
  if (!hasPermission) {
    throw ForbiddenException('Permission required');
  }
  return true;
}

throw ForbiddenException('Insufficient permissions');
```

**Usage**:
```typescript
@RequirePermissions(Permission.MANAGE_EMPLOYEES)
@Post('employees')
async createEmployee() { ... }
```

---

## 🚀 Workflow de Validation des Congés

### Étape 1: Demande (EMPLOYE)
```typescript
POST /leaves
Body: { startDate, endDate, type, comment }
User: role=EMPLOYE

→ LeaveRequest créé avec status=PENDING
→ Notification envoyée aux RH
```

### Étape 2: Pré-validation (RH)
```typescript
POST /leaves/:id/approve-rh
User: role=RH avec permission APPROVE_LEAVES

→ status=PENDING -> APPROVED_BY_RH
→ rhReviewedAt = now
→ rhReviewedBy = userId
→ Notification envoyée à ADMIN
```

**Rejection RH**:
```typescript
POST /leaves/:id/reject-rh
User: role=RH avec permission APPROVE_LEAVES

→ status=PENDING -> REJECTED_BY_RH
→ Notification envoyée à EMPLOYE
```

### Étape 3: Validation Finale (ADMIN)
```typescript
POST /leaves/:id/approve-admin
User: role=ADMIN

→ status=APPROVED_BY_RH -> APPROVED
→ adminReviewedAt = now
→ adminReviewedBy = userId
→ Notification envoyée à EMPLOYE
```

**Rejection ADMIN**:
```typescript
POST /leaves/:id/reject-admin
User: role=ADMIN

→ status=APPROVED_BY_RH -> REJECTED_BY_ADMIN
→ Notifications envoyées à EMPLOYE et RH
```

---

## 🔄 Transfert d'Employé

### Cas d'usage
Un employé change de service de radiologie (mutation interne à l'hôpital)

### Processus
```typescript
POST /admin/employees/:id/transfer
Body: { targetServiceId: uuid }
User: SUPER_ADMIN uniquement

→ Archivage historique:
  - employee.previousServiceId = employee.serviceId
  - employee.transferredAt = now

→ Transfert:
  - employee.serviceId = targetServiceId
  - employee.isActive = true
  - employee.role = EMPLOYE (reset rôle)
  - employee.permissions = [] (reset permissions)

→ Audit:
  - AuditLog créé dans ancien service
  - AuditLog créé dans nouveau service
  - action = TRANSFER_EMPLOYEE

→ Historique:
  - Shifts passés: conservés avec ancien serviceId
  - Congés passés: conservés avec ancien serviceId
  - Audits: conservés avec ancien serviceId
  - Nouveau matricule généré pour nouveau service
```

### Alternative: Archivage (sans transfert)
```typescript
POST /employees/:id/archive
User: ADMIN

→ employee.isActive = false
→ Conserve tout l'historique
→ L'employé ne peut plus se connecter
```

---

## 📊 Matrice des Permissions par Route

### Employés

| Route | SUPER_ADMIN | ADMIN | RH (manage_employees) | EMPLOYE |
|-------|-------------|-------|----------------------|---------|
| `GET /employees` | ✅ All services | ✅ Own service | ✅ Own service | ❌ |
| `GET /employees/:id` | ✅ All | ✅ Own service | ✅ Own service | ✅ Self only |
| `POST /employees` | ✅ All services | ✅ Own service | ✅ If permission | ❌ |
| `PATCH /employees/:id` | ✅ All | ✅ Own service | ✅ If permission | ✅ Self (limited) |
| `DELETE /employees/:id` | ✅ All | ✅ Own service | ❌ | ❌ |
| `POST /employees/:id/transfer` | ✅ Only | ❌ | ❌ | ❌ |
| `PATCH /employees/:id/permissions` | ❌ | ✅ Own service | ❌ | ❌ |

### Congés

| Route | SUPER_ADMIN | ADMIN | RH (approve_leaves) | EMPLOYE |
|-------|-------------|-------|---------------------|---------|
| `GET /leaves` | ✅ All services | ✅ Own service | ✅ Own service | ✅ Own only |
| `POST /leaves` | ❌ | ✅ Own service | ✅ Own service | ✅ Own only |
| `POST /leaves/:id/approve-rh` | ❌ | ❌ | ✅ If permission | ❌ |
| `POST /leaves/:id/approve-admin` | ❌ | ✅ Own service | ❌ | ❌ |
| `POST /leaves/:id/reject-rh` | ❌ | ❌ | ✅ If permission | ❌ |
| `POST /leaves/:id/reject-admin` | ❌ | ✅ Own service | ❌ | ❌ |
| `DELETE /leaves/:id` | ✅ All | ✅ Own service | ❌ | ❌ |

### Shifts

| Route | SUPER_ADMIN | ADMIN | RH (manage_shifts) | EMPLOYE |
|-------|-------------|-------|-------------------|---------|
| `GET /shifts` | ✅ All services | ✅ Own service | ✅ Own service | ✅ Own service |
| `POST /shifts` | ❌ | ✅ Own service | ✅ If permission | ❌ |
| `POST /shifts/generate` | ❌ | ✅ Own service | ✅ If permission | ❌ |
| `POST /shifts/:id/assign` | ❌ | ✅ Own service | ✅ If permission | ❌ |
| `DELETE /shifts/:id` | ✅ All | ✅ Own service | ✅ If permission | ❌ |
| `GET /shifts/export` | ❌ | ✅ Own service | ✅ If export permission | ❌ |

### Services (Platform Admin)

| Route | SUPER_ADMIN | Others |
|-------|-------------|--------|
| `GET /admin/services` | ✅ | ❌ |
| `POST /admin/services` | ✅ | ❌ |
| `PATCH /admin/services/:id` | ✅ | ❌ |
| `DELETE /admin/services/:id` | ✅ | ❌ |
| `POST /admin/services/:id/suspend` | ✅ | ❌ |
| `POST /admin/services/:id/activate` | ✅ | ❌ |
| `GET /admin/analytics` | ✅ | ❌ |

---

## 🔧 JWT Payload Structure

### Pour Employee (ADMIN, RH, EMPLOYE)
```typescript
{
  sub: string;              // employeeId
  email: string;
  role: 'ADMIN' | 'RH' | 'EMPLOYE';
  serviceId: string;        // ← CRITIQUE pour isolation
  serviceName: string;      // Pour affichage
  permissions?: Permission[]; // Pour RH seulement
  employeeType?: 'TECHNICIEN' | 'ADMINISTRATIF';
  isSuperAdmin: false;
  iat: number;
  exp: number;
}
```

### Pour SuperAdmin
```typescript
{
  sub: string;              // superAdminId
  email: string;
  fullName: string;
  isSuperAdmin: true;       // ← CRITIQUE pour bypass
  iat: number;
  exp: number;
}
```

---

## 📁 Structure des Fichiers (Nouveau)

```
backend/src/
├── entities/
│   ├── radiology-service.entity.ts     ← NOUVEAU
│   ├── super-admin.entity.ts           ← NOUVEAU
│   ├── employee.entity.ts              ← MODIFIÉ (serviceId, permissions)
│   ├── leave-request.entity.ts         ← MODIFIÉ (serviceId, workflow RH)
│   ├── shift.entity.ts                 ← MODIFIÉ (serviceId)
│   ├── shift-assignment.entity.ts
│   ├── shift-position.entity.ts
│   └── audit-log.entity.ts             ← MODIFIÉ (serviceId, isSuperAdmin)
│
├── common/
│   ├── enums/
│   │   ├── permission.enum.ts          ← NOUVEAU
│   │   └── leave.enum.ts               ← MODIFIÉ (nouveaux status)
│   │
│   ├── guards/
│   │   ├── service-scope.guard.ts      ← NOUVEAU (isolation tenant)
│   │   ├── super-admin.guard.ts        ← NOUVEAU
│   │   ├── permissions.guard.ts        ← NOUVEAU (RH granulaire)
│   │   ├── roles.guard.ts              ← MODIFIÉ (gérer SUPER_ADMIN)
│   │   ├── jwt-auth.guard.ts
│   │   └── csrf.guard.ts
│   │
│   └── decorators/
│       ├── permissions.decorator.ts    ← NOUVEAU
│       ├── current-user.decorator.ts   ← NOUVEAU
│       ├── roles.decorator.ts
│       └── public.decorator.ts
│
├── radiology-service/                  ← NOUVEAU MODULE
│   ├── radiology-service.module.ts
│   ├── radiology-service.controller.ts (SUPER_ADMIN routes)
│   ├── radiology-service.service.ts
│   └── dto/
│       ├── create-service.dto.ts
│       └── update-service.dto.ts
│
├── super-admin/                        ← NOUVEAU MODULE
│   ├── super-admin.module.ts
│   ├── super-admin.controller.ts       (platform admin routes)
│   ├── super-admin.service.ts
│   └── dto/
│       ├── create-super-admin.dto.ts
│       └── login-super-admin.dto.ts
│
├── employee/                           ← MODIFIÉ
│   ├── employee.module.ts
│   ├── employee.controller.ts          ← MODIFIÉ (scope service, permissions)
│   ├── employee.service.ts             ← MODIFIÉ (filtrer par serviceId)
│   └── dto/
│       ├── create-employee.dto.ts      ← MODIFIÉ
│       ├── update-employee.dto.ts      ← MODIFIÉ
│       ├── assign-permissions.dto.ts   ← NOUVEAU
│       └── transfer-employee.dto.ts    ← NOUVEAU
│
├── leave/                              ← MODIFIÉ
│   ├── leave.module.ts
│   ├── leave.controller.ts             ← MODIFIÉ (workflow RH + ADMIN)
│   └── leave.service.ts                ← MODIFIÉ (validation workflow)
│
├── shift/                              ← MODIFIÉ
│   ├── shift.module.ts
│   ├── shift.controller.ts             ← MODIFIÉ (scope service)
│   └── shift.service.ts                ← MODIFIÉ (filtrer par serviceId)
│
├── auth/                               ← MODIFIÉ
│   ├── auth.module.ts
│   ├── auth.controller.ts              ← MODIFIÉ (2 routes login)
│   ├── auth.service.ts                 ← MODIFIÉ (gérer super_admins)
│   └── strategies/
│       ├── jwt.strategy.ts             ← MODIFIÉ (gérer 2 types users)
│       └── local.strategy.ts           ← MODIFIÉ
│
└── migrations/                         ← NOUVEAU
    └── XXXXXX-MultiTenantRefactor.ts  (migration complète)
```

---

## ✅ Avantages de cette Architecture

### 1. Isolation Complète (Sécurité RGPD)
- Aucune fuite de données entre services
- Row-Level Security automatique via `serviceId`
- Audits séparés par service

### 2. Flexibilité des Permissions RH
- ADMIN peut déléguer précisément
- RH adaptés aux besoins (congés, planning, employés)
- Évolutif (nouvelles permissions faciles à ajouter)

### 3. Workflow Congés Clair
- 2 niveaux de validation (RH → ADMIN)
- Traçabilité complète (qui, quand, pourquoi)
- Historique des rejections

### 4. Scalabilité SAAS
- Multi-tenancy natif
- SUPER_ADMIN pour gestion plateforme
- Abonnements et tiers configurables
- Métriques par service

### 5. Maintenance et Support
- SUPER_ADMIN peut investiguer sans connexion
- Audits globaux pour debugging
- Suspension de services en cas de problème
- Transferts d'employés possibles

---

## 🚧 Points d'Attention pour l'Implémentation

### 1. **Toujours filtrer par `serviceId`**
```typescript
// ❌ MAU VAIS
await this.employeeRepo.find();

// ✅ BON
await this.employeeRepo.find({
  where: { serviceId: user.serviceId }
});
```

### 2. **Valider contrainte 1 ADMIN par service**
```typescript
async createEmployee(dto: CreateEmployeeDto) {
  if (dto.role === EmployeeRole.ADMIN) {
    const existingAdmin = await this.employeeRepo.findOne({
      where: { serviceId: dto.serviceId, role: EmployeeRole.ADMIN }
    });

    if (existingAdmin) {
      throw new BadRequestException('Service already has an ADMIN');
    }
  }
  // ...
}
```

### 3. **Gérer 2 types de JWT**
```typescript
// Dans JwtStrategy
async validate(payload: any) {
  if (payload.isSuperAdmin) {
    const superAdmin = await this.superAdminRepo.findOne(payload.sub);
    return { ...superAdmin, isSuperAdmin: true };
  } else {
    const employee = await this.employeeRepo.findOne(payload.sub);
    return { ...employee, isSuperAdmin: false };
  }
}
```

### 4. **Workflow congés strict**
```typescript
// Transition PENDING → APPROVED_BY_RH (RH seulement)
if (leave.status !== LeaveStatus.PENDING) {
  throw new BadRequestException('Leave must be PENDING');
}

// Transition APPROVED_BY_RH → APPROVED (ADMIN seulement)
if (leave.status !== LeaveStatus.APPROVED_BY_RH) {
  throw new BadRequestException('Leave must be approved by RH first');
}
```

### 5. **Audits multi-tenant**
```typescript
// Pour actions dans un service
auditLog.serviceId = user.serviceId;
auditLog.isSuperAdmin = false;

// Pour actions SUPER_ADMIN (création service, etc.)
auditLog.serviceId = null; // Global
auditLog.isSuperAdmin = true;
```

---

## 📝 Prochaines Étapes

Voir [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) pour le plan de migration détaillé.
