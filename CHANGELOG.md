# Changelog

Tous les changements notables de ce projet seront documentés dans ce fichier.

## [Unreleased] - 2025-10-15

### Ajouté
- ✅ `.gitignore` pour exclure fichiers sensibles et générés
- ✅ Configuration ESLint et Prettier pour backend
- ✅ TypeScript strict mode activé
- ✅ Validation automatique des variables d'environnement
- ✅ Gestion d'erreurs globale avec `AllExceptionsFilter`
- ✅ Logging des requêtes avec `LoggingInterceptor`
- ✅ Structure modulaire du backend (`common/`, `modules/`, `config/`)
- ✅ Documentation complète (README principal + README backend)
- ✅ Template `.env.example` pour configuration

### Modifié
- 🔧 CORS restreint à l'origine configurée (plus de wildcard `*`)
- 🔧 Credentials base de données déplacés vers variables d'environnement
- 🔧 Configuration TypeORM utilise `ConfigService` (plus de valeurs hardcodées)
- 🔧 TypeScript configuration plus stricte (strict mode, null checks)
- 🔧 Amélioration du script de démarrage avec logging détaillé

### Sécurité
- 🛡️ Suppression des credentials hardcodés
- 🛡️ CORS configuration sécurisée
- 🛡️ Validation stricte des DTOs
- 🛡️ Variables d'environnement validées au démarrage
- 🛡️ `.env` exclu du versioning Git

### Technique
- 📦 Ajout de `@nestjs/config` pour gestion configuration
- 📦 Ajout de `class-validator` et `class-transformer` pour validation
- 📦 Ajout d'outils de linting (ESLint, Prettier)
- 🏗️ Structure de dossiers scalable créée
- 🏗️ Séparation concerns (filters, interceptors, guards, pipes)

## [Initial] - 2025-10-15

### Créé
- Configuration initiale Docker Compose
- Backend NestJS basique
- Frontend Next.js basique
- PostgreSQL avec script d'initialisation
- Makefile avec commandes utilitaires
