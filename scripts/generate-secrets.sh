#!/bin/bash

################################################################################
# RADIO STAFF MANAGER - SECRET GENERATION SCRIPT
################################################################################
# Script pour générer des secrets cryptographiquement sécurisés
# Usage: ./scripts/generate-secrets.sh [options]
#
# Options:
#   --all               Générer tous les secrets requis
#   --update-env        Mettre à jour .env.production directement
#   --length <n>        Longueur des secrets (défaut: 32)
#   --help              Afficher cette aide
################################################################################

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
LENGTH=32
UPDATE_ENV=false
GENERATE_ALL=false
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$PROJECT_DIR/.env.production"

################################################################################
# Functions
################################################################################

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

usage() {
    cat << EOF
Usage: $0 [options]

Options:
    --all               Générer tous les secrets requis
    --update-env        Mettre à jour .env.production directement
    --length <n>        Longueur des secrets (défaut: 32)
    --help              Afficher cette aide

Examples:
    $0                              # Générer un secret unique
    $0 --all                        # Générer tous les secrets
    $0 --all --update-env           # Générer et mettre à jour .env.production
    $0 --length 64                  # Générer un secret de 64 caractères
EOF
    exit 0
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --all)
                GENERATE_ALL=true
                shift
                ;;
            --update-env)
                UPDATE_ENV=true
                shift
                ;;
            --length)
                LENGTH="$2"
                shift 2
                ;;
            --help)
                usage
                ;;
            *)
                echo "Option inconnue: $1"
                usage
                ;;
        esac
    done
}

# Generate a secure random secret
generate_secret() {
    local length="${1:-$LENGTH}"
    openssl rand -base64 "$length" | tr -d '\n' | head -c "$length"
}

# Generate all required secrets
generate_all_secrets() {
    log "Génération de tous les secrets requis..."
    echo ""

    local secrets=(
        "POSTGRES_PASSWORD:Password pour PostgreSQL"
        "KEYCLOAK_ADMIN_PASSWORD:Password admin Keycloak"
        "KEYCLOAK_CLIENT_SECRET:Secret client Keycloak OAuth"
        "JWT_SECRET:Secret pour JWT tokens"
        "SESSION_SECRET:Secret pour sessions"
    )

    declare -A generated_secrets

    for secret_def in "${secrets[@]}"; do
        IFS=':' read -r secret_name secret_desc <<< "$secret_def"
        local secret_value=$(generate_secret)
        generated_secrets["$secret_name"]="$secret_value"

        info "$secret_desc ($secret_name):"
        echo "$secret_value"
        echo ""
    done

    # Update .env.production if requested
    if [[ "$UPDATE_ENV" == "true" ]]; then
        update_env_file generated_secrets
    fi
}

# Update .env.production file
update_env_file() {
    local -n secrets=$1

    if [[ ! -f "$ENV_FILE" ]]; then
        warning "Fichier $ENV_FILE non trouvé"
        warning "Créez-le d'abord depuis .env.production.example"
        return 1
    fi

    # Create backup
    local backup_file="${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$ENV_FILE" "$backup_file"
    log "Backup créé: $backup_file"

    # Update secrets
    for secret_name in "${!secrets[@]}"; do
        local secret_value="${secrets[$secret_name]}"

        if grep -q "^${secret_name}=" "$ENV_FILE"; then
            # Update existing value
            sed -i "s|^${secret_name}=.*|${secret_name}=${secret_value}|" "$ENV_FILE"
            log "Mis à jour: $secret_name"
        else
            # Add new value
            echo "${secret_name}=${secret_value}" >> "$ENV_FILE"
            log "Ajouté: $secret_name"
        fi
    done

    log "Fichier $ENV_FILE mis à jour avec succès"
    warning "IMPORTANT: Redéployez l'application pour appliquer les nouveaux secrets"
}

# Display security recommendations
show_recommendations() {
    echo ""
    log "=========================================="
    log "RECOMMANDATIONS DE SÉCURITÉ"
    log "=========================================="
    echo ""
    info "1. Sauvegardez ces secrets dans un gestionnaire de mots de passe"
    info "2. Ne partagez JAMAIS ces secrets par email ou chat"
    info "3. Changez les secrets régulièrement (tous les 90 jours recommandé)"
    info "4. Limitez l'accès au fichier .env.production (chmod 600)"
    info "5. Ne commitez JAMAIS .env.production dans Git"
    echo ""

    if [[ "$UPDATE_ENV" == "true" ]]; then
        warning "ATTENTION: Vous devez redéployer pour appliquer les nouveaux secrets:"
        echo "  cd $PROJECT_DIR"
        echo "  ./scripts/deploy.sh"
        echo ""
    else
        info "Pour mettre à jour .env.production avec ces secrets:"
        echo "  Copiez/collez manuellement les valeurs dans $ENV_FILE"
        echo "  OU relancez ce script avec --update-env"
        echo ""
    fi
}

main() {
    parse_args "$@"

    log "=========================================="
    log "GÉNÉRATEUR DE SECRETS SÉCURISÉS"
    log "=========================================="
    echo ""

    if [[ "$GENERATE_ALL" == "true" ]]; then
        generate_all_secrets
    else
        # Generate single secret
        log "Secret généré (longueur: $LENGTH):"
        generate_secret
        echo ""
    fi

    show_recommendations
}

main "$@"
