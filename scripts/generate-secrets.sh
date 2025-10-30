#!/bin/bash

# Script de génération de secrets sécurisés pour Radio Staff Manager
# Usage: ./generate-secrets.sh

set -e

echo "🔐 Génération de secrets sécurisés pour Radio Staff Manager"
echo "============================================================"
echo ""

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour générer un mot de passe sécurisé
generate_password() {
    local length=${1:-32}
    openssl rand -base64 "$length" | tr -d "=+/" | cut -c1-"$length"
}

# Fonction pour générer un secret hexadécimal
generate_hex() {
    local length=${1:-32}
    openssl rand -hex "$length"
}

# Vérifier si .env existe déjà et sauvegarder automatiquement
if [ -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  Le fichier backend/.env existe déjà.${NC}"
    BACKUP_FILE="backend/.env.backup.$(date +%Y%m%d_%H%M%S)"
    cp backend/.env "$BACKUP_FILE"
    echo -e "${GREEN}✓ Sauvegarde créée: $BACKUP_FILE${NC}"
fi

# Créer un fichier .env.secrets temporaire
SECRETS_FILE=".env.secrets.$(date +%Y%m%d_%H%M%S)"

echo "Génération des secrets..."
echo ""

# Générer tous les secrets
POSTGRES_PASSWORD=$(generate_password 32)
KEYCLOAK_ADMIN_PASSWORD=$(generate_password 24)
KEYCLOAK_CLIENT_SECRET=$(generate_hex 32)
JWT_SECRET=$(generate_hex 64)
CSRF_SECRET=$(generate_hex 32)
ENCRYPTION_KEY=$(generate_hex 32)

# Créer le fichier .env pour le backend
cat > backend/.env << EOF
# ====================================
# CONFIGURATION BACKEND - Radio Staff
# ====================================
# IMPORTANT: Ne JAMAIS commiter ce fichier dans Git!
# Généré le: $(date '+%Y-%m-%d %H:%M:%S')

# ====================================
# DATABASE CONFIGURATION
# ====================================
DATABASE_URL=postgresql://radio:${POSTGRES_PASSWORD}@localhost:5432/radiodb?connection_limit=50&pool_timeout=10
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=radio
DATABASE_PASSWORD=${POSTGRES_PASSWORD}
DATABASE_NAME=radiodb

# ====================================
# APPLICATION CONFIGURATION
# ====================================
PORT=4000
NODE_ENV=development

# ====================================
# CORS CONFIGURATION
# ====================================
# Liste des origines autorisées (séparées par des virgules)
ALLOWED_ORIGINS=http://localhost:3000,http://192.168.1.200

# ====================================
# KEYCLOAK CONFIGURATION
# ====================================
KEYCLOAK_URL=http://192.168.1.200/auth
KEYCLOAK_INTERNAL_URL=http://keycloak:8080
KEYCLOAK_REALM=radio-staff
KEYCLOAK_CLIENT_ID=radio-backend
KEYCLOAK_CLIENT_SECRET=${KEYCLOAK_CLIENT_SECRET}

# ====================================
# SECURITY SECRETS
# ====================================
# Secret pour la génération de tokens JWT (si utilisé en plus de Keycloak)
JWT_SECRET=${JWT_SECRET}

# Secret pour la protection CSRF
CSRF_SECRET=${CSRF_SECRET}

# Clé de chiffrement pour données sensibles
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# ====================================
# CACHE CONFIGURATION (Optionnel - pour Redis)
# ====================================
# REDIS_HOST=localhost
# REDIS_PORT=6379
# REDIS_PASSWORD=
# CACHE_TTL=300

# ====================================
# MONITORING & LOGGING (Optionnel)
# ====================================
# LOG_LEVEL=info
# SENTRY_DSN=
# APM_SERVER_URL=
EOF

# Créer le fichier .env pour le frontend
cat > frontend/.env.local << EOF
# ====================================
# CONFIGURATION FRONTEND - Radio Staff
# ====================================
# IMPORTANT: Seules les variables NEXT_PUBLIC_* sont exposées au navigateur!
# Généré le: $(date '+%Y-%m-%d %H:%M:%S')

# ====================================
# API CONFIGURATION
# ====================================
NEXT_PUBLIC_API_URL=/api

# ====================================
# KEYCLOAK CONFIGURATION
# ====================================
NEXT_PUBLIC_KEYCLOAK_URL=http://192.168.1.200/auth
NEXT_PUBLIC_KEYCLOAK_REALM=radio-staff
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=radio-frontend

# ====================================
# APPLICATION CONFIGURATION
# ====================================
# NEXT_PUBLIC_APP_NAME=Radio Staff Manager
# NEXT_PUBLIC_APP_VERSION=1.0.0
EOF

# Créer un fichier de secrets sécurisé
cat > "$SECRETS_FILE" << EOF
# ====================================
# SECRETS GÉNÉRÉS - Radio Staff Manager
# ====================================
# Date: $(date '+%Y-%m-%d %H:%M:%S')
# IMPORTANT: Conserver ce fichier dans un endroit sécurisé!
# Ne JAMAIS le commiter dans Git!

# Variables d'environnement pour Docker Compose
export POSTGRES_DB=radiodb
export POSTGRES_USER=radio
export POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
export KEYCLOAK_ADMIN=admin
export KEYCLOAK_ADMIN_PASSWORD=${KEYCLOAK_ADMIN_PASSWORD}
export KEYCLOAK_CLIENT_SECRET=${KEYCLOAK_CLIENT_SECRET}

# Autres secrets
export JWT_SECRET=${JWT_SECRET}
export CSRF_SECRET=${CSRF_SECRET}
export ENCRYPTION_KEY=${ENCRYPTION_KEY}

# ====================================
# POUR CHARGER CES VARIABLES:
# ====================================
# source ${SECRETS_FILE}
# docker-compose up -d

# ====================================
# POUR PRODUCTION:
# ====================================
# Utilisez un gestionnaire de secrets comme:
# - HashiCorp Vault
# - AWS Secrets Manager
# - Azure Key Vault
# - Kubernetes Secrets
EOF

# Créer le fichier .env.example pour le backend
cat > backend/.env.example << EOF
# ====================================
# CONFIGURATION BACKEND - Radio Staff
# ====================================
# Copier ce fichier vers .env et remplir avec les vraies valeurs

# ====================================
# DATABASE CONFIGURATION
# ====================================
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?connection_limit=50&pool_timeout=10
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=radio
DATABASE_PASSWORD=CHANGEME_STRONG_PASSWORD
DATABASE_NAME=radiodb

# ====================================
# APPLICATION CONFIGURATION
# ====================================
PORT=4000
NODE_ENV=development

# ====================================
# CORS CONFIGURATION
# ====================================
ALLOWED_ORIGINS=http://localhost:3000,http://VOTRE_IP

# ====================================
# KEYCLOAK CONFIGURATION
# ====================================
KEYCLOAK_URL=http://VOTRE_IP/auth
KEYCLOAK_INTERNAL_URL=http://keycloak:8080
KEYCLOAK_REALM=radio-staff
KEYCLOAK_CLIENT_ID=radio-backend
KEYCLOAK_CLIENT_SECRET=CHANGEME_CLIENT_SECRET

# ====================================
# SECURITY SECRETS
# ====================================
JWT_SECRET=CHANGEME_JWT_SECRET
CSRF_SECRET=CHANGEME_CSRF_SECRET
ENCRYPTION_KEY=CHANGEME_ENCRYPTION_KEY

# ====================================
# CACHE CONFIGURATION (Optionnel)
# ====================================
# REDIS_HOST=localhost
# REDIS_PORT=6379
# REDIS_PASSWORD=
# CACHE_TTL=300
EOF

# Mettre à jour le .gitignore
if [ ! -f .gitignore ]; then
    touch .gitignore
fi

# Ajouter les patterns au .gitignore s'ils n'existent pas déjà
grep -qxF ".env" .gitignore || echo ".env" >> .gitignore
grep -qxF ".env.local" .gitignore || echo ".env.local" >> .gitignore
grep -qxF ".env.*.local" .gitignore || echo ".env.*.local" >> .gitignore
grep -qxF ".env.secrets*" .gitignore || echo ".env.secrets*" >> .gitignore
grep -qxF "backend/.env" .gitignore || echo "backend/.env" >> .gitignore
grep -qxF "backend/.env.backup.*" .gitignore || echo "backend/.env.backup.*" >> .gitignore
grep -qxF "frontend/.env.local" .gitignore || echo "frontend/.env.local" >> .gitignore

# Sécuriser les permissions
chmod 600 backend/.env
chmod 600 frontend/.env.local
chmod 600 "$SECRETS_FILE"
chmod 644 backend/.env.example

echo ""
echo -e "${GREEN}✓ Secrets générés avec succès!${NC}"
echo ""
echo "📁 Fichiers créés:"
echo "   - backend/.env (configuration backend)"
echo "   - frontend/.env.local (configuration frontend)"
echo "   - backend/.env.example (template pour Git)"
echo "   - $SECRETS_FILE (secrets pour Docker Compose)"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT - Prochaines étapes:${NC}"
echo ""
echo "1. Sauvegarder le fichier de secrets dans un endroit sécurisé:"
echo -e "   ${GREEN}cp $SECRETS_FILE ~/secrets/radio-staff-secrets.env${NC}"
echo ""
echo "2. Pour démarrer l'application avec les nouveaux secrets:"
echo -e "   ${GREEN}source $SECRETS_FILE${NC}"
echo -e "   ${GREEN}docker-compose down${NC}"
echo -e "   ${GREEN}docker-compose up -d${NC}"
echo ""
echo "3. Vérifier que les secrets ne sont PAS commités:"
echo -e "   ${GREEN}git status${NC}"
echo ""
echo "4. Pour la production, utilisez un gestionnaire de secrets:"
echo "   - HashiCorp Vault"
echo "   - AWS Secrets Manager"
echo "   - Azure Key Vault"
echo "   - Kubernetes Secrets"
echo ""
echo -e "${RED}⚠️  SÉCURITÉ:${NC}"
echo "   - Ne JAMAIS commiter les fichiers .env dans Git"
echo "   - Changer les secrets régulièrement (tous les 90 jours)"
echo "   - Utiliser des mots de passe différents pour chaque environnement"
echo "   - Sauvegarder les secrets dans un coffre-fort sécurisé"
echo ""
echo -e "${GREEN}✓ Configuration terminée!${NC}"
