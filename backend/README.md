# Radio Staff Manager - Backend

Backend API construite avec NestJS et PostgreSQL.

## 🏗️ Architecture

### Structure des Dossiers

```
src/
├── common/                     # Composants partagés
│   ├── filters/               # Exception filters (gestion d'erreurs)
│   ├── interceptors/          # Intercepteurs (logging, transformation)
│   ├── guards/                # Guards (authentification, autorisation)
│   ├── decorators/            # Décorateurs personnalisés
│   └── pipes/                 # Pipes de validation/transformation
│
├── config/                    # Configuration
│   └── env.validation.ts      # Validation des variables d'environnement
│
├── modules/                   # Modules métier
│   └── [à créer]             # users, staff, schedules, etc.
│
├── app.module.ts             # Module racine de l'application
└── main.ts                   # Point d'entrée de l'application
```

## 🔧 Configuration

### Variables d'environnement requises

Créer un fichier `.env` à la racine du dossier backend:

```env
# Database Configuration
DATABASE_HOST=postgres          # Host de la base de données
DATABASE_PORT=5432             # Port PostgreSQL
DATABASE_USER=radio            # Utilisateur DB
DATABASE_PASSWORD=radiopass    # Mot de passe DB
DATABASE_NAME=radiodb          # Nom de la base

# Application
PORT=4000                      # Port de l'API
NODE_ENV=development           # Environment (development/production/test)

# CORS
CORS_ORIGIN=http://localhost:3000  # Origine autorisée pour CORS
```

La validation est automatique au démarrage. L'application ne démarrera pas si des variables requises sont manquantes.

## 🚀 Démarrage

### Installation des dépendances
```bash
npm install
```

### Modes de démarrage
```bash
# Développement avec auto-reload
npm run start:dev

# Développement avec debugger
npm run start:debug

# Production
npm run build
npm run start:prod
```

## 📦 Dépendances Principales

### Core
- `@nestjs/core` - Framework NestJS
- `@nestjs/common` - Composants communs
- `@nestjs/platform-express` - Adaptateur Express

### Configuration & Validation
- `@nestjs/config` - Gestion de configuration
- `class-validator` - Validation des DTOs
- `class-transformer` - Transformation des objets

### Base de données
- `@nestjs/typeorm` - Intégration TypeORM
- `typeorm` - ORM pour PostgreSQL
- `pg` - Driver PostgreSQL

### Utilitaires
- `rxjs` - Programmation réactive
- `reflect-metadata` - Métadonnées pour décorateurs

## 🛡️ Sécurité & Validation

### Validation Automatique
Toutes les requêtes sont automatiquement validées via `ValidationPipe`:
- Whitelist: Propriétés non déclarées sont retirées
- ForbidNonWhitelisted: Rejette les propriétés inconnues
- Transform: Transforme automatiquement les types

### Gestion d'Erreurs
`AllExceptionsFilter` capture toutes les exceptions et retourne:
```json
{
  "statusCode": 500,
  "timestamp": "2025-10-15T23:00:00.000Z",
  "path": "/api/endpoint",
  "message": "Error details"
}
```

### Logging
`LoggingInterceptor` log automatiquement:
- Méthode HTTP
- URL
- Status code
- Temps de réponse

## 🎯 Bonnes Pratiques

### Création d'un Module

1. **Générer le module**
```bash
nest g module modules/users
nest g controller modules/users
nest g service modules/users
```

2. **Créer les entités** (`modules/users/entities/user.entity.ts`)
```typescript
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;
}
```

3. **Créer les DTOs** (`modules/users/dto/create-user.dto.ts`)
```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
```

4. **Implémenter le service** (`modules/users/users.service.ts`)
```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  // Méthodes CRUD
}
```

## 📊 Base de Données

### Synchronisation
- **Development**: `synchronize: true` (auto-sync avec les entités)
- **Production**: `synchronize: false` (utiliser les migrations)

### Migrations (Production)
```bash
npm run typeorm migration:generate -- -n MigrationName
npm run typeorm migration:run
```

## 🧪 Tests (à implémenter)

```bash
# Tests unitaires
npm run test

# Tests e2e
npm run test:e2e

# Coverage
npm run test:cov
```

## 📝 Linting & Formatage

```bash
# Linting
npm run lint

# Formatage automatique
npm run format
```

## 🔍 Debugging

### VS Code Launch Configuration
```json
{
  "type": "node",
  "request": "attach",
  "name": "Attach NestJS",
  "port": 9229,
  "restart": true
}
```

Puis lancer: `npm run start:debug`

## 📚 Ressources

- [Documentation NestJS](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [Class Validator](https://github.com/typestack/class-validator)
