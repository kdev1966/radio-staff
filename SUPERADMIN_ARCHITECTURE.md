# Architecture SuperAdmin - Endpoints Dédiés

## 🎯 Philosophie

Le SuperAdmin est l'**administrateur de toute la plateforme multi-tenant**, pas un employé d'un service spécifique. Il a besoin d'endpoints dédiés qui reflètent cette séparation architecturale.

## 📊 Pourquoi des Endpoints Dédiés ?

### ❌ Problème Conceptuel (Avant)

```typescript
// SuperAdmin utilise /radiology-services (endpoint Employee)
const services = await api.get('/radiology-services');
```

**Problèmes** :
1. **Contexte incorrect** - SuperAdmin n'a pas de `serviceId`, n'appartient à aucun service
2. **Permissions mixtes** - Endpoint conçu pour Employee, utilisé par SuperAdmin
3. **Données inadaptées** - Employee voit SON service, SuperAdmin voit TOUS les services
4. **Opérations manquantes** - SuperAdmin a besoin de suspend/delete, pas Employee

### ✅ Solution Architecturale (Maintenant)

```typescript
// SuperAdmin utilise /super-admin/dashboard/stats (endpoint dédié)
const stats = await api.get('/super-admin/dashboard/stats');
```

**Avantages** :
1. **Séparation claire** - SuperAdmin ≠ Employee, endpoints distincts
2. **Données agrégées** - Vues plateforme multi-tenant natives
3. **Permissions cohérentes** - `SuperAdminGuard` sur tous les endpoints
4. **Opérations dédiées** - Suspend, delete, analytics plateforme

---

## 🏗️ Architecture Backend

### Structure des Modules

```
backend/src/
├── super-admin/
│   ├── super-admin.module.ts                    # Module principal
│   ├── super-admin.controller.ts                # CRUD Super Admins
│   ├── super-admin.service.ts                   # Logique CRUD
│   ├── super-admin-dashboard.controller.ts      # 🆕 Dashboard endpoints
│   └── super-admin-dashboard.service.ts         # 🆕 Dashboard logic
```

### Endpoints SuperAdmin

#### 1. **Dashboard Stats**
```http
GET /api/super-admin/dashboard/stats
Authorization: Bearer <superadmin_token>
```

**Réponse** :
```json
{
  "totalServices": 3,
  "activeServices": 3,
  "totalEmployees": 8,
  "totalShifts": 0,
  "servicesByStatus": {
    "ACTIVE": 3
  },
  "servicesByTier": {
    "PRO": 1,
    "BASIC": 1,
    "TRIAL": 1
  },
  "platformStatus": "OPERATIONAL"
}
```

**Utilisation** : Statistiques plateforme pour dashboard SuperAdmin

---

#### 2. **Services Overview**
```http
GET /api/super-admin/dashboard/services
Authorization: Bearer <superadmin_token>
```

**Réponse** :
```json
[
  {
    "id": "11111111-1111-1111-1111-111111111111",
    "name": "Service Radio CHU Nord",
    "hospitalName": "CHU Nord",
    "status": "ACTIVE",
    "subscriptionTier": "PRO",
    "subscriptionEndsAt": null,
    "employeeCount": 4,
    "createdAt": "2025-10-31T00:18:41.469Z",
    "canManage": true
  }
]
```

**Utilisation** : Liste complète des services avec capacités de gestion

---

#### 3. **Platform Activity**
```http
GET /api/super-admin/dashboard/activity
Authorization: Bearer <superadmin_token>
```

**Réponse** :
```json
{
  "recentLogins": [
    {
      "adminEmail": "admin@radiostaff.com",
      "adminName": "Platform Administrator",
      "loginAt": "2025-10-31T18:20:29.991Z"
    }
  ],
  "recentServiceCreations": [
    {
      "serviceName": "Service Radio CHU Nord",
      "hospitalName": "CHU Nord",
      "subscriptionTier": "PRO",
      "createdAt": "2025-10-31T00:18:41.469Z"
    }
  ],
  "systemEvents": []
}
```

**Utilisation** : Activité récente plateforme (logins, créations services)

---

#### 4. **Platform Health**
```http
GET /api/super-admin/dashboard/health
Authorization: Bearer <superadmin_token>
```

**Réponse** :
```json
{
  "systemStatus": "OPERATIONAL",
  "alerts": [],
  "metrics": {
    "totalServices": 3,
    "activeServices": 3,
    "healthScore": 1
  }
}
```

**Utilisation** : État de santé plateforme et alertes système

---

## 🎨 Architecture Frontend

### Utilisation des Endpoints Dédiés

**Avant** (`pages/index.tsx:72-89`) :
```typescript
const loadSuperAdminDashboard = async () => {
  // ❌ Utilisait /radiology-services (endpoint Employee)
  const servicesRes = await api.get('/radiology-services');
  const services = servicesRes.data;

  // Calcul manuel des stats
  const totalEmployees = services.reduce(...)
};
```

**Maintenant** (`pages/index.tsx:72-89`) :
```typescript
const loadSuperAdminDashboard = async () => {
  // ✅ Utilise /super-admin/dashboard/stats (endpoint dédié)
  const statsRes = await api.get('/super-admin/dashboard/stats');
  const platformStats = statsRes.data;

  setStats({
    totalEmployees: platformStats.totalEmployees,
    totalShifts: platformStats.activeServices,
    todayShifts: platformStats.totalShifts,
  });
};
```

---

## 🔒 Sécurité

### Guards Backend

Tous les endpoints SuperAdmin sont protégés par :
```typescript
@Controller('super-admin/dashboard')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class SuperAdminDashboardController {
  // ...
}
```

**Vérifications** :
1. `JwtAuthGuard` - Token JWT valide requis
2. `SuperAdminGuard` - Vérifie `isSuperAdmin: true` dans le payload JWT

### Isolation Multi-Tenant

- **Employee** : Ne voit que **SON service** via `serviceId` dans JWT
- **SuperAdmin** : Voit **TOUS les services**, pas de `serviceId` dans JWT

---

## 📈 Évolutivité

### Futures Fonctionnalités SuperAdmin

Avec cette architecture, il est facile d'ajouter :

1. **Analytics Avancées**
   ```typescript
   GET /super-admin/dashboard/analytics
   // Graphiques: croissance services, revenus, utilisation
   ```

2. **Gestion Services**
   ```typescript
   PATCH /super-admin/services/:id/suspend
   PATCH /super-admin/services/:id/activate
   DELETE /super-admin/services/:id
   ```

3. **Audit Logs**
   ```typescript
   GET /super-admin/audit-logs
   // Historique: modifications, suppressions, accès
   ```

4. **Billing Management**
   ```typescript
   GET /super-admin/billing/overview
   POST /super-admin/billing/invoices/:id/send
   ```

---

## 🎯 Comparaison Architecturale

| Aspect | Employee | SuperAdmin |
|--------|----------|------------|
| **Contexte** | Un seul service (`serviceId`) | Tous les services (plateforme) |
| **Endpoints** | `/employees`, `/shifts`, `/leaves` | `/super-admin/dashboard/*` |
| **Guards** | `JwtAuthGuard` + optionnel RolesGuard | `JwtAuthGuard` + `SuperAdminGuard` |
| **Données** | Limitées au service | Agrégées plateforme |
| **Opérations** | CRUD métier service | Gestion plateforme (suspend, delete) |

---

## ✅ Résumé

### Architecture Propre

1. **Séparation claire** - SuperAdmin ≠ Employee, endpoints distincts
2. **Permissions cohérentes** - Guards dédiés sur routes dédiées
3. **Données adaptées** - Vues agrégées multi-tenant natives
4. **Évolutivité** - Facile d'ajouter analytics, billing, audit logs

### Tests Validés

✅ Backend compilé sans erreurs
✅ 4 endpoints testés et fonctionnels :
  - `GET /super-admin/dashboard/stats`
  - `GET /super-admin/dashboard/services`
  - `GET /super-admin/dashboard/activity`
  - `GET /super-admin/dashboard/health`
✅ Frontend mis à jour pour utiliser les nouveaux endpoints

### Prochaines Étapes

1. Créer pages frontend : `/services`, `/admin-users`, `/analytics`
2. Ajouter endpoints gestion services (suspend, activate, delete)
3. Implémenter audit logs pour traçabilité
4. Créer tableau de bord analytics avec graphiques

---

## 📚 Références

- [SUPERADMIN_DASHBOARD_FIX.md](SUPERADMIN_DASHBOARD_FIX.md) - Correction login SuperAdmin
- [backend/src/super-admin/](backend/src/super-admin/) - Code source backend
- [frontend/pages/index.tsx](frontend/pages/index.tsx) - Dashboard frontend
