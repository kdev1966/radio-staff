#!/bin/bash

################################################################################
# RADIO STAFF MANAGER - DEPLOYMENT SCRIPT
################################################################################
# Script de déploiement automatisé pour l'application Radio Staff Manager
# Usage: ./scripts/deploy.sh [options]
#
# Options:
#   --env <file>        Fichier d'environnement à utiliser (défaut: .env.production)
#   --skip-backup       Ne pas faire de backup avant déploiement
#   --skip-build        Ne pas rebuilder les images Docker
#   --no-cache          Forcer rebuild sans cache
#   --help              Afficher cette aide
################################################################################

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_DIR="$PROJECT_DIR/scripts"
BACKUP_DIR="${BACKUP_DIR:-/home/master/backups/radio-staff}"
ENV_FILE="${ENV_FILE:-.env.production}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$PROJECT_DIR/logs/deploy_${TIMESTAMP}.log"

# Options
SKIP_BACKUP=false
SKIP_BUILD=false
NO_CACHE=""

################################################################################
# Functions
################################################################################

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $*" | tee -a "$LOG_FILE" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $*" | tee -a "$LOG_FILE"
}

# Print usage
usage() {
    cat << EOF
Usage: $0 [options]

Options:
    --env <file>        Fichier d'environnement à utiliser (défaut: .env.production)
    --skip-backup       Ne pas faire de backup avant déploiement
    --skip-build        Ne pas rebuilder les images Docker
    --no-cache          Forcer rebuild sans cache
    --help              Afficher cette aide

Examples:
    $0                              # Déploiement standard
    $0 --env .env.staging           # Déploiement avec fichier env spécifique
    $0 --skip-backup --skip-build   # Déploiement rapide sans backup ni build
    $0 --no-cache                   # Rebuild complet sans cache
EOF
    exit 0
}

# Parse arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --env)
                ENV_FILE="$2"
                shift 2
                ;;
            --skip-backup)
                SKIP_BACKUP=true
                shift
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --no-cache)
                NO_CACHE="--no-cache"
                shift
                ;;
            --help)
                usage
                ;;
            *)
                error "Option inconnue: $1"
                usage
                ;;
        esac
    done
}

# Check prerequisites
check_prerequisites() {
    log "Vérification des prérequis..."

    # Check if running on the correct server
    if ! ip addr | grep -q "192.168.1.200"; then
        warning "Ce script devrait être exécuté sur le VPS 192.168.1.200"
    fi

    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        error "Docker n'est pas installé"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        error "Docker n'est pas démarré"
        exit 1
    fi

    # Check if docker-compose is available
    if ! docker compose version &> /dev/null; then
        error "Docker Compose n'est pas disponible"
        exit 1
    fi

    # Check if .env file exists
    if [[ ! -f "$PROJECT_DIR/$ENV_FILE" ]]; then
        error "Fichier d'environnement $ENV_FILE non trouvé"
        error "Copiez .env.production.example vers $ENV_FILE et configurez-le"
        exit 1
    fi

    # Check for weak passwords in production
    if [[ "$ENV_FILE" == ".env.production" ]]; then
        if grep -q "CHANGE_ME\|password123\|admin123\|secret123" "$PROJECT_DIR/$ENV_FILE"; then
            error "Des mots de passe par défaut ont été détectés dans $ENV_FILE"
            error "Veuillez générer des secrets forts avec: openssl rand -base64 32"
            exit 1
        fi
    fi

    # Create necessary directories
    mkdir -p "$PROJECT_DIR/logs"
    mkdir -p "$BACKUP_DIR"

    log "Prérequis vérifiés avec succès"
}

# Create backup
create_backup() {
    if [[ "$SKIP_BACKUP" == "true" ]]; then
        warning "Backup ignoré (--skip-backup)"
        return 0
    fi

    log "Création du backup..."

    if [[ -f "$SCRIPT_DIR/backup-db.sh" ]]; then
        bash "$SCRIPT_DIR/backup-db.sh" || {
            error "Échec du backup"
            exit 1
        }
    else
        warning "Script de backup non trouvé, backup ignoré"
    fi

    log "Backup créé avec succès"
}

# Build Docker images
build_images() {
    if [[ "$SKIP_BUILD" == "true" ]]; then
        warning "Build ignoré (--skip-build)"
        return 0
    fi

    log "Build des images Docker..."

    cd "$PROJECT_DIR"

    # Build with production compose file
    docker compose -f docker-compose.yml -f docker-compose.prod.yml build $NO_CACHE || {
        error "Échec du build des images"
        exit 1
    }

    log "Images Docker construites avec succès"
}

# Stop running containers
stop_containers() {
    log "Arrêt des conteneurs en cours d'exécution..."

    cd "$PROJECT_DIR"

    if docker compose ps -q | grep -q .; then
        docker compose -f docker-compose.yml -f docker-compose.prod.yml down || {
            warning "Échec de l'arrêt gracieux, forçage de l'arrêt..."
            docker compose -f docker-compose.yml -f docker-compose.prod.yml down -v --remove-orphans
        }
    else
        info "Aucun conteneur en cours d'exécution"
    fi

    log "Conteneurs arrêtés"
}

# Start containers
start_containers() {
    log "Démarrage des conteneurs..."

    cd "$PROJECT_DIR"

    # Load environment variables
    export $(cat "$ENV_FILE" | grep -v '^#' | grep -v '^$' | xargs)

    # Start with production compose file
    docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d || {
        error "Échec du démarrage des conteneurs"
        exit 1
    }

    log "Conteneurs démarrés"
}

# Wait for services to be healthy
wait_for_health() {
    log "Attente de la disponibilité des services..."

    local max_attempts=60
    local attempt=0

    # Wait for postgres
    info "Attente de PostgreSQL..."
    while ! docker compose exec -T postgres pg_isready -U radio &> /dev/null; do
        attempt=$((attempt + 1))
        if [[ $attempt -ge $max_attempts ]]; then
            error "Timeout: PostgreSQL n'est pas disponible"
            exit 1
        fi
        sleep 2
    done
    log "PostgreSQL est disponible"

    # Wait for keycloak
    info "Attente de Keycloak (cela peut prendre 1-2 minutes)..."
    attempt=0
    while ! curl -sf http://localhost:8080/health/ready &> /dev/null; do
        attempt=$((attempt + 1))
        if [[ $attempt -ge $max_attempts ]]; then
            error "Timeout: Keycloak n'est pas disponible"
            exit 1
        fi
        sleep 5
    done
    log "Keycloak est disponible"

    # Wait for backend
    info "Attente du backend..."
    attempt=0
    while ! curl -sf http://localhost:4000/api/health &> /dev/null; do
        attempt=$((attempt + 1))
        if [[ $attempt -ge $max_attempts ]]; then
            error "Timeout: Backend n'est pas disponible"
            exit 1
        fi
        sleep 3
    done
    log "Backend est disponible"

    # Wait for frontend
    info "Attente du frontend..."
    attempt=0
    while ! curl -sf http://localhost:3000 &> /dev/null; do
        attempt=$((attempt + 1))
        if [[ $attempt -ge $max_attempts ]]; then
            error "Timeout: Frontend n'est pas disponible"
            exit 1
        fi
        sleep 3
    done
    log "Frontend est disponible"

    # Wait for nginx
    info "Attente de Nginx..."
    attempt=0
    while ! curl -sf http://localhost/health &> /dev/null; do
        attempt=$((attempt + 1))
        if [[ $attempt -ge $max_attempts ]]; then
            error "Timeout: Nginx n'est pas disponible"
            exit 1
        fi
        sleep 2
    done
    log "Nginx est disponible"

    log "Tous les services sont disponibles"
}

# Run health checks
run_health_checks() {
    log "Exécution des health checks..."

    if [[ -f "$SCRIPT_DIR/health-check.sh" ]]; then
        bash "$SCRIPT_DIR/health-check.sh" || {
            error "Health checks échoués"
            warning "Le déploiement peut avoir des problèmes"
            return 1
        }
    else
        warning "Script de health check non trouvé"
    fi

    log "Health checks réussis"
}

# Display deployment info
display_info() {
    log ""
    log "=========================================="
    log "DÉPLOIEMENT TERMINÉ AVEC SUCCÈS"
    log "=========================================="
    log ""
    log "Application Radio Staff Manager déployée sur:"
    log "  - Interface Web: http://192.168.1.200"
    log "  - API Backend:   http://192.168.1.200/api"
    log "  - Keycloak:      http://192.168.1.200/auth"
    log ""
    log "Services Docker en cours d'exécution:"
    docker compose ps
    log ""
    log "Logs de déploiement: $LOG_FILE"
    log ""
    log "Pour voir les logs en temps réel:"
    log "  docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f"
    log ""
    log "Pour arrêter l'application:"
    log "  docker compose -f docker-compose.yml -f docker-compose.prod.yml down"
    log ""
}

# Main deployment process
main() {
    log "=========================================="
    log "DÉPLOIEMENT DE RADIO STAFF MANAGER"
    log "=========================================="
    log "Timestamp: $TIMESTAMP"
    log "Environment: $ENV_FILE"
    log ""

    parse_args "$@"
    check_prerequisites
    create_backup
    stop_containers
    build_images
    start_containers
    wait_for_health
    run_health_checks
    display_info

    log "Déploiement terminé en $(( $(date +%s) - $(date -d "$(grep -m1 '\[' "$LOG_FILE" | sed 's/.*\[\(.*\)\].*/\1/')" +%s) )) secondes"
}

# Trap errors
trap 'error "Erreur lors du déploiement à la ligne $LINENO"; exit 1' ERR

# Run main
main "$@"
