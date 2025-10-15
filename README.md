# Radio Staff Manager 📻

Application de gestion du personnel pour stations de radio, développée avec Next.js (frontend) et NestJS (backend).

## 📋 Stack Technique

### Backend
- **Framework**: NestJS 10
- **Base de données**: PostgreSQL 15
- **ORM**: TypeORM
- **Language**: TypeScript 5
- **Validation**: class-validator, class-transformer

### Frontend
- **Framework**: Next.js 14
- **UI Library**: React 18
- **Language**: TypeScript 5

### Infrastructure
- **Containerisation**: Docker & Docker Compose
- **Base de données**: PostgreSQL 15 Alpine

## 🚀 Démarrage Rapide

### Prérequis
- Docker & Docker Compose
- Node.js 20+ (pour développement local)

### Installation

1. **Cloner le projet**
```bash
git clone <repository-url>
cd radio-staff
```

2. **Configuration de l'environnement**
```bash
# Backend
cp backend/.env.example backend/.env
# Modifier les variables si nécessaire
```

3. **Démarrer avec Docker**
```bash
docker-compose up -d
```

Les services seront disponibles sur:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- PostgreSQL: localhost:5432

### Développement Local (sans Docker)

**Backend**
```bash
cd backend
npm install
npm run start:dev
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

## 📁 Structure du Projet

```
radio-staff/
├── backend/                    # Application NestJS
│   ├── src/
│   │   ├── common/            # Composants partagés
│   │   │   ├── filters/       # Exception filters
│   │   │   ├── interceptors/  # Intercepteurs (logging, etc.)
│   │   │   ├── guards/        # Guards d'authentification
│   │   │   ├── decorators/    # Décorateurs personnalisés
│   │   │   └── pipes/         # Pipes de transformation
│   │   ├── config/            # Configuration & validation env
│   │   ├── modules/           # Modules métier (users, staff, etc.)
│   │   ├── app.module.ts      # Module racine
│   │   └── main.ts            # Point d'entrée
│   ├── .env.example           # Template variables d'environnement
│   ├── Dockerfile
│   └── package.json
│
├── frontend/                   # Application Next.js
│   ├── pages/                 # Pages Next.js
│   ├── components/            # Composants React (à créer)
│   ├── styles/                # Styles CSS (à créer)
│   ├── public/                # Assets statiques (à créer)
│   ├── Dockerfile
│   └── package.json
│
├── postgres/                   # Configuration PostgreSQL
│   └── 01-init.sql            # Script d'initialisation DB
│
├── docker-compose.yml         # Configuration services Docker
├── makefile                   # Commandes utilitaires
└── README.md
```

## 🔧 Configuration

### Variables d'environnement Backend (.env)

```env
# Database
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_USER=radio
DATABASE_PASSWORD=radiopass
DATABASE_NAME=radiodb
DATABASE_URL=postgresql://radio:radiopass@postgres:5432/radiodb

# Application
PORT=4000
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:3000
```

### Variables d'environnement Frontend

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## 🛠️ Scripts Disponibles

### Backend
```bash
npm run start:dev      # Démarrage mode développement avec watch
npm run start:debug    # Démarrage avec debugger
npm run start:prod     # Démarrage production
npm run build          # Build pour production
npm run lint           # Linting
npm run format         # Formatage avec Prettier
```

### Frontend
```bash
npm run dev            # Démarrage mode développement
npm run build          # Build pour production
npm run export         # Export static
```

## 🔒 Sécurité

- ✅ Validation des variables d'environnement au démarrage
- ✅ CORS configuré avec origine spécifique
- ✅ Validation automatique des DTOs avec class-validator
- ✅ TypeScript strict mode activé
- ✅ Credentials non exposés dans le code
- ✅ .env exclu du versioning

## 📝 Standards de Code

### Backend
- **Linting**: ESLint avec configuration TypeScript
- **Formatage**: Prettier
- **Style**: Single quotes, trailing commas
- **Type Safety**: Strict TypeScript

### Architecture
- **Modularité**: Organisation par modules métier
- **Séparation**: Contrôleurs, Services, Entités
- **Validation**: DTOs avec class-validator
- **Gestion d'erreurs**: Exception filters globaux
- **Logging**: Intercepteur de logging pour toutes les requêtes

## 🚧 État du Projet

Le projet est actuellement en phase d'initialisation avec:
- ✅ Configuration de base backend/frontend
- ✅ Docker configuration
- ✅ Base de données PostgreSQL
- ✅ Validation d'environnement
- ✅ Gestion d'erreurs et logging
- ⏳ Modules métier à développer
- ⏳ Authentification à implémenter
- ⏳ Interface utilisateur à construire

## 📚 Ressources

- [Documentation NestJS](https://docs.nestjs.com/)
- [Documentation Next.js](https://nextjs.org/docs)
- [Documentation TypeORM](https://typeorm.io/)
- [Documentation PostgreSQL](https://www.postgresql.org/docs/)

## 🤝 Contribution

Les contributions sont bienvenues. Veuillez:
1. Créer une branche feature
2. Commiter vos changements
3. Pousser vers la branche
4. Ouvrir une Pull Request

## 📄 Licence

Projet privé - Tous droits réservés
