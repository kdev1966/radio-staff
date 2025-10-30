# Guide de Développement Local - Radio Staff

## Prérequis

- **Node.js** >= 18.x
- **PostgreSQL** >= 14.x
- **Java** >= 17 (pour Keycloak)

## Installation Rapide

### 1. Installation des Dépendances

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configuration de la Base de Données

```bash
# Créer la base de données
createdb radiodb

# Appliquer les migrations Prisma
cd backend
npx prisma migrate dev
npx prisma generate
```

### 3. Installation de Keycloak

**Option A: Via Homebrew (Recommandé)**
```bash
brew install keycloak
```

**Option B: Téléchargement Automatique**
```bash
# Le script de démarrage téléchargera automatiquement Keycloak
./scripts/start-keycloak-dev.sh
```

## Démarrage des Services

### Ordre de Démarrage Recommandé

#### 1. Démarrer Keycloak (Terminal 1)
```bash
./scripts/start-keycloak-dev.sh
```

**Accès Keycloak:**
- URL: http://localhost:8080
- Console Admin: http://localhost:8080/admin
- Compte admin: `admin` / `admin123`
- Realm: `radio-staff`

**Utilisateurs de Test:**
| Email | Mot de passe | Rôle |
|-------|-------------|------|
| admin@radio.local | admin123 | ADMIN |
| chef@radio.local | chef123 | CHEF_SERVICE |
| employe@radio.local | employe123 | EMPLOYE |

#### 2. Démarrer le Backend (Terminal 2)
```bash
cd backend
npm run start:dev
```

**Backend disponible sur:** http://localhost:4000/api

#### 3. Démarrer le Frontend (Terminal 3)
```bash
cd frontend
npm run dev
```

**Frontend disponible sur:** http://localhost:3000

## Configuration des Variables d'Environnement

### Backend (.env)
```env
# Base de données
DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/radiodb
PORT=4000

# Keycloak
KEYCLOAK_URL=http://localhost:8080/auth
KEYCLOAK_REALM=radio-staff
KEYCLOAK_CLIENT_ID=radio-backend
KEYCLOAK_CLIENT_SECRET=dev-client-secret-change-in-production
```

### Frontend (.env.local)
```env
# API Backend
NEXT_PUBLIC_API_URL=http://localhost:4000/api

# Keycloak
NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:8080
NEXT_PUBLIC_KEYCLOAK_REALM=radio-staff
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=radio-frontend
```

## Scripts Utiles

### Backend
```bash
# Mode développement avec hot-reload
npm run start:dev

# Build de production
npm run build

# Démarrer en production
npm run start:prod

# Tests
npm run test
npm run test:watch
npm run test:e2e

# Prisma
npx prisma studio          # Interface graphique de la BDD
npx prisma migrate dev     # Créer et appliquer une migration
npx prisma generate        # Générer le client Prisma
npx prisma db seed         # Remplir la BDD avec des données de test
```

### Frontend
```bash
# Mode développement
npm run dev

# Build de production
npm run build

# Démarrer en production
npm run start

# Linting
npm run lint

# Tests
npm run test
```

### Keycloak
```bash
# Démarrer Keycloak
./scripts/start-keycloak-dev.sh

# Arrêter Keycloak
pkill -f keycloak
# ou Ctrl+C dans le terminal de Keycloak

# Réinitialiser la configuration Keycloak
rm -rf ~/.keycloak-dev
./scripts/start-keycloak-dev.sh
```

## Résolution des Problèmes

### Keycloak n'est pas accessible sur localhost:8080

**Vérifications:**
1. Keycloak est-il démarré ?
   ```bash
   lsof -i :8080
   ```

2. Java est-il installé ?
   ```bash
   java -version
   ```

3. Le realm est-il importé ?
   - Accéder à http://localhost:8080/admin
   - Vérifier que le realm `radio-staff` existe

### Le Backend ne se connecte pas à Keycloak

**Vérifications:**
1. Vérifier l'URL dans `backend/.env`:
   ```env
   KEYCLOAK_URL=http://localhost:8080/auth
   ```

2. Vérifier que le client `radio-backend` existe dans Keycloak
3. Redémarrer le backend après modification de `.env`

### Le Frontend affiche "Site inaccessible"

**Vérifications:**
1. Tous les services sont démarrés dans l'ordre
2. Les URLs dans `frontend/.env.local` sont correctes
3. Le client `radio-frontend` existe dans Keycloak avec:
   - Valid Redirect URIs: `http://localhost:3000/*`
   - Web Origins: `http://localhost:3000`

### Erreurs de connexion à la base de données

**Solutions:**
1. Vérifier que PostgreSQL est démarré:
   ```bash
   pg_isready
   ```

2. Vérifier les credentials dans `backend/.env`

3. Recréer la base si nécessaire:
   ```bash
   dropdb radiodb
   createdb radiodb
   cd backend
   npx prisma migrate dev
   ```

## Workflow de Développement

### Démarrage Quotidien
```bash
# Terminal 1: Keycloak
./scripts/start-keycloak-dev.sh

# Terminal 2: Backend
cd backend && npm run start:dev

# Terminal 3: Frontend
cd frontend && npm run dev
```

### Arrêt des Services
```bash
# Ctrl+C dans chaque terminal
# ou
pkill -f keycloak
pkill -f "nest start"
pkill -f "next-router-worker"
```

## Architecture de Développement

```
┌─────────────────────────────────────────────────┐
│  Browser: http://localhost:3000                 │
│  Frontend (Next.js)                             │
└────────────────┬────────────────────────────────┘
                 │
                 ├─── API Calls ───────────────────┐
                 │                                  │
                 │                                  ▼
                 │                    ┌──────────────────────────┐
                 │                    │  Backend (NestJS)        │
                 │                    │  http://localhost:4000   │
                 │                    └──────┬───────────────────┘
                 │                           │
                 └─── Auth ────┐             ├─── Database ──┐
                               │             │               │
                               ▼             ▼               ▼
                    ┌────────────────┐  ┌─────────────────────┐
                    │  Keycloak      │  │  PostgreSQL         │
                    │  :8080         │  │  :5432              │
                    └────────────────┘  └─────────────────────┘
```

## Ressources

- **NestJS**: https://docs.nestjs.com
- **Next.js**: https://nextjs.org/docs
- **Prisma**: https://www.prisma.io/docs
- **Keycloak**: https://www.keycloak.org/documentation
- **PostgreSQL**: https://www.postgresql.org/docs

## Support

Pour toute question ou problème, consultez:
- Le fichier README.md principal
- Les issues du projet
- La documentation des technologies utilisées
