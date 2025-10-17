#!/bin/bash

################################################################################
# RADIO STAFF MANAGER - ROLLBACK SCRIPT
################################################################################
# Script de rollback pour revenir à une version antérieure
# Usage: ./scripts/rollback.sh [options]
#
# Options:
#   --backup <file>     Fichier de backup à restaurer (dans $BACKUP_DIR)
#   --list              Lister les backups disponibles
#   --no-restart        Ne pas redémarrer les services après rollback
#   --help              Afficher cette aide
################################################################################

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/home/master/backups/radio-staff}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$PROJECT_DIR/logs/rollback_${TIMESTAMP}.log"

# Options
BACKUP_FILE=""
LIST_BACKUPS=false
NO_RESTART=false

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

usage() {
    cat << EOF
Usage: $0 [options]

Options:
    --backup <file>     Fichier de backup à restaurer (dans $BACKUP_DIR)
    --list              Lister les backups disponibles
    --no-restart        Ne pas redémarrer les services après rollback
    --help              Afficher cette aide

Examples:
    $0 --list                                    # Lister les backups
    $0 --backup radio_backup_20250117_143000    # Restaurer un backup spécifique
    $0                                           # Restaurer le dernier backup
EOF
    exit 0
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --backup)
                BACKUP_FILE="$2"
                shift 2
                ;;
            --list)
                LIST_BACKUPS=true
                shift
                ;;
            --no-restart)
                NO_RESTART=true
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

list_backups() {
    log "Backups disponibles dans $BACKUP_DIR:"
    echo ""

    if [[ ! -d "$BACKUP_DIR" ]] || [[ -z "$(ls -A "$BACKUP_DIR")" ]]; then
        warning "Aucun backup trouvé dans $BACKUP_DIR"
        exit 0
    fi

    # List all SQL backup files with details
    find "$BACKUP_DIR" -name "*.sql.gz" -type f -printf "%T@ %Tc %p\n" | \
        sort -rn | \
        while read -r timestamp date time tz year file; do
            size=$(du -h "$file" | cut -f1)
            filename=$(basename "$file")
            echo -e "${GREEN}$filename${NC}"
            echo "  Date: $date $time $year"
            echo "  Taille: $size"
            echo "  Chemin: $file"
            echo ""
        done

    exit 0
}

check_prerequisites() {
    log "Vérification des prérequis..."

    # Check Docker
    if ! docker compose version &> /dev/null; then
        error "Docker Compose n'est pas disponible"
        exit 1
    fi

    # Check backup directory
    if [[ ! -d "$BACKUP_DIR" ]]; then
        error "Répertoire de backup non trouvé: $BACKUP_DIR"
        exit 1
    fi

    # Create logs directory
    mkdir -p "$PROJECT_DIR/logs"

    log "Prérequis vérifiés"
}

select_backup() {
    if [[ -n "$BACKUP_FILE" ]]; then
        # Use specified backup
        if [[ ! -f "$BACKUP_DIR/$BACKUP_FILE" ]]; then
            # Try with .sql.gz extension
            if [[ -f "$BACKUP_DIR/${BACKUP_FILE}.sql.gz" ]]; then
                BACKUP_FILE="${BACKUP_FILE}.sql.gz"
            else
                error "Backup non trouvé: $BACKUP_FILE"
                exit 1
            fi
        fi
        log "Backup sélectionné: $BACKUP_FILE"
    else
        # Find most recent backup
        BACKUP_FILE=$(find "$BACKUP_DIR" -name "*.sql.gz" -type f -printf "%T@ %p\n" | \
                     sort -rn | head -1 | cut -d' ' -f2-)

        if [[ -z "$BACKUP_FILE" ]]; then
            error "Aucun backup trouvé dans $BACKUP_DIR"
            exit 1
        fi

        BACKUP_FILE=$(basename "$BACKUP_FILE")
        log "Backup le plus récent sélectionné: $BACKUP_FILE"
    fi
}

confirm_rollback() {
    warning "ATTENTION: Cette opération va:"
    warning "  1. Arrêter tous les services"
    warning "  2. Restaurer la base de données depuis: $BACKUP_FILE"
    warning "  3. Redémarrer les services"
    echo ""
    warning "Toutes les données actuelles de la base seront ÉCRASÉES!"
    echo ""

    read -p "Êtes-vous sûr de vouloir continuer? (oui/non): " -r
    if [[ ! $REPLY =~ ^(oui|OUI|yes|YES)$ ]]; then
        log "Rollback annulé par l'utilisateur"
        exit 0
    fi
}

stop_services() {
    log "Arrêt des services..."

    cd "$PROJECT_DIR"

    docker compose -f docker-compose.yml -f docker-compose.prod.yml down || {
        warning "Échec de l'arrêt gracieux, forçage..."
        docker compose down --remove-orphans
    }

    log "Services arrêtés"
}

restore_database() {
    log "Restauration de la base de données depuis: $BACKUP_FILE"

    cd "$PROJECT_DIR"

    # Start only PostgreSQL for restore
    docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d postgres

    # Wait for PostgreSQL to be ready
    info "Attente de PostgreSQL..."
    local max_attempts=30
    local attempt=0

    while ! docker compose exec -T postgres pg_isready -U radio &> /dev/null; do
        attempt=$((attempt + 1))
        if [[ $attempt -ge $max_attempts ]]; then
            error "Timeout: PostgreSQL n'est pas disponible"
            exit 1
        fi
        sleep 2
    done

    log "PostgreSQL est prêt"

    # Drop and recreate database
    info "Recréation de la base de données..."
    docker compose exec -T postgres psql -U radio -d postgres <<EOF
DROP DATABASE IF EXISTS radiodb;
CREATE DATABASE radiodb;
GRANT ALL PRIVILEGES ON DATABASE radiodb TO radio;
EOF

    # Restore from backup
    info "Restauration des données (cela peut prendre quelques minutes)..."
    gunzip -c "$BACKUP_DIR/$BACKUP_FILE" | \
        docker compose exec -T postgres psql -U radio -d radiodb || {
        error "Échec de la restauration"
        exit 1
    }

    log "Base de données restaurée avec succès"

    # Stop PostgreSQL
    docker compose stop postgres
}

start_services() {
    if [[ "$NO_RESTART" == "true" ]]; then
        warning "Redémarrage des services ignoré (--no-restart)"
        return 0
    fi

    log "Redémarrage de tous les services..."

    cd "$PROJECT_DIR"

    # Load environment variables if exists
    if [[ -f "$PROJECT_DIR/.env.production" ]]; then
        export $(cat "$PROJECT_DIR/.env.production" | grep -v '^#' | grep -v '^$' | xargs)
    fi

    docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d || {
        error "Échec du redémarrage des services"
        exit 1
    }

    log "Services redémarrés"
}

wait_for_services() {
    if [[ "$NO_RESTART" == "true" ]]; then
        return 0
    fi

    log "Attente de la disponibilité des services..."

    local max_attempts=60

    # Wait for backend
    info "Attente du backend..."
    local attempt=0
    while ! curl -sf http://localhost:4000/api/health &> /dev/null; do
        attempt=$((attempt + 1))
        if [[ $attempt -ge $max_attempts ]]; then
            warning "Backend non disponible après rollback"
            break
        fi
        sleep 3
    done

    # Wait for frontend
    info "Attente du frontend..."
    attempt=0
    while ! curl -sf http://localhost:3000 &> /dev/null; do
        attempt=$((attempt + 1))
        if [[ $attempt -ge $max_attempts ]]; then
            warning "Frontend non disponible après rollback"
            break
        fi
        sleep 3
    done

    # Wait for nginx
    info "Attente de Nginx..."
    attempt=0
    while ! curl -sf http://localhost/health &> /dev/null; do
        attempt=$((attempt + 1))
        if [[ $attempt -ge $max_attempts ]]; then
            warning "Nginx non disponible après rollback"
            break
        fi
        sleep 2
    done

    log "Services disponibles"
}

display_info() {
    log ""
    log "=========================================="
    log "ROLLBACK TERMINÉ AVEC SUCCÈS"
    log "=========================================="
    log ""
    log "Base de données restaurée depuis:"
    log "  $BACKUP_FILE"
    log ""

    if [[ "$NO_RESTART" == "false" ]]; then
        log "Services Docker en cours d'exécution:"
        docker compose ps
        log ""
        log "Application disponible sur:"
        log "  http://192.168.1.200"
    else
        log "Services non redémarrés (--no-restart)"
        log "Pour démarrer les services:"
        log "  cd $PROJECT_DIR"
        log "  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d"
    fi

    log ""
    log "Logs de rollback: $LOG_FILE"
    log ""
}

main() {
    log "=========================================="
    log "ROLLBACK DE RADIO STAFF MANAGER"
    log "=========================================="
    log "Timestamp: $TIMESTAMP"
    log ""

    parse_args "$@"

    if [[ "$LIST_BACKUPS" == "true" ]]; then
        list_backups
        exit 0
    fi

    check_prerequisites
    select_backup
    confirm_rollback
    stop_services
    restore_database
    start_services
    wait_for_services
    display_info

    log "Rollback terminé"
}

trap 'error "Erreur lors du rollback à la ligne $LINENO"; exit 1' ERR

main "$@"
