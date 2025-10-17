#!/bin/bash

################################################################################
# RADIO STAFF MANAGER - DATABASE BACKUP SCRIPT
################################################################################
# Script de backup automatisé pour la base de données PostgreSQL
# Usage: ./scripts/backup-db.sh [options]
#
# Options:
#   --output <dir>      Répertoire de sortie (défaut: /home/master/backups/radio-staff)
#   --retention <days>  Nombre de jours à conserver (défaut: 30)
#   --compress          Compresser le backup avec gzip (défaut: activé)
#   --no-compress       Ne pas compresser le backup
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
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILENAME="radio_backup_${TIMESTAMP}"
COMPRESS=true
LOG_FILE="$PROJECT_DIR/logs/backup_${TIMESTAMP}.log"

# Database credentials (will be loaded from .env)
DB_USER="${POSTGRES_USER:-radio}"
DB_NAME="${POSTGRES_DB:-radiodb}"

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
    --output <dir>      Répertoire de sortie (défaut: /home/master/backups/radio-staff)
    --retention <days>  Nombre de jours à conserver (défaut: 30)
    --compress          Compresser le backup avec gzip (défaut: activé)
    --no-compress       Ne pas compresser le backup
    --help              Afficher cette aide

Examples:
    $0                                    # Backup standard
    $0 --output /custom/backup/path       # Backup vers répertoire personnalisé
    $0 --retention 90                     # Conserver 90 jours de backups
    $0 --no-compress                      # Backup non compressé
EOF
    exit 0
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --output)
                BACKUP_DIR="$2"
                shift 2
                ;;
            --retention)
                RETENTION_DAYS="$2"
                shift 2
                ;;
            --compress)
                COMPRESS=true
                shift
                ;;
            --no-compress)
                COMPRESS=false
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

check_prerequisites() {
    log "Vérification des prérequis..."

    # Check Docker
    if ! docker compose version &> /dev/null; then
        error "Docker Compose n'est pas disponible"
        exit 1
    fi

    # Check if PostgreSQL container is running
    if ! docker compose ps postgres | grep -q "Up"; then
        error "Le conteneur PostgreSQL n'est pas en cours d'exécution"
        error "Démarrez-le avec: docker compose up -d postgres"
        exit 1
    fi

    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$PROJECT_DIR/logs"

    # Load environment variables
    if [[ -f "$PROJECT_DIR/.env.production" ]]; then
        info "Chargement des variables depuis .env.production"
        export $(cat "$PROJECT_DIR/.env.production" | grep -v '^#' | grep -v '^$' | xargs)
    elif [[ -f "$PROJECT_DIR/.env" ]]; then
        info "Chargement des variables depuis .env"
        export $(cat "$PROJECT_DIR/.env" | grep -v '^#' | grep -v '^$' | xargs)
    fi

    DB_USER="${POSTGRES_USER:-radio}"
    DB_NAME="${POSTGRES_DB:-radiodb}"

    log "Prérequis vérifiés"
}

check_database_health() {
    log "Vérification de la santé de la base de données..."

    if ! docker compose exec -T postgres pg_isready -U "$DB_USER" &> /dev/null; then
        error "La base de données n'est pas disponible"
        exit 1
    fi

    log "Base de données opérationnelle"
}

create_backup() {
    log "Création du backup de la base de données '$DB_NAME'..."

    cd "$PROJECT_DIR"

    local backup_path="$BACKUP_DIR/${BACKUP_FILENAME}.sql"

    # Create SQL dump
    docker compose exec -T postgres pg_dump -U "$DB_USER" -d "$DB_NAME" \
        --format=plain \
        --no-owner \
        --no-privileges \
        --clean \
        --if-exists > "$backup_path" || {
        error "Échec de la création du backup"
        rm -f "$backup_path"
        exit 1
    }

    # Compress if requested
    if [[ "$COMPRESS" == "true" ]]; then
        info "Compression du backup..."
        gzip -f "$backup_path" || {
            error "Échec de la compression"
            exit 1
        }
        backup_path="${backup_path}.gz"
        BACKUP_FILENAME="${BACKUP_FILENAME}.sql.gz"
    else
        BACKUP_FILENAME="${BACKUP_FILENAME}.sql"
    fi

    # Verify backup
    if [[ ! -f "$backup_path" ]]; then
        error "Le fichier de backup n'a pas été créé"
        exit 1
    fi

    local backup_size=$(du -h "$backup_path" | cut -f1)
    log "Backup créé avec succès: $BACKUP_FILENAME (${backup_size})"
}

create_metadata() {
    log "Création des métadonnées du backup..."

    local metadata_file="$BACKUP_DIR/${BACKUP_FILENAME%.sql.gz}.meta"

    cat > "$metadata_file" << EOF
# Backup Metadata
BACKUP_DATE=$(date -Iseconds)
BACKUP_TIMESTAMP=$TIMESTAMP
DATABASE_NAME=$DB_NAME
DATABASE_USER=$DB_USER
BACKUP_FILE=$BACKUP_FILENAME
COMPRESSED=$COMPRESS
PROJECT_VERSION=$(git -C "$PROJECT_DIR" describe --tags --always 2>/dev/null || echo "unknown")
COMMIT_HASH=$(git -C "$PROJECT_DIR" rev-parse HEAD 2>/dev/null || echo "unknown")
HOSTNAME=$(hostname)
EOF

    log "Métadonnées créées"
}

cleanup_old_backups() {
    log "Nettoyage des anciens backups (rétention: $RETENTION_DAYS jours)..."

    local deleted_count=0

    # Find and delete old backups
    while IFS= read -r -d '' file; do
        rm -f "$file"
        # Also remove associated metadata
        rm -f "${file%.sql.gz}.meta"
        deleted_count=$((deleted_count + 1))
        info "Supprimé: $(basename "$file")"
    done < <(find "$BACKUP_DIR" -name "radio_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -print0)

    if [[ $deleted_count -eq 0 ]]; then
        info "Aucun ancien backup à supprimer"
    else
        log "Supprimé $deleted_count ancien(s) backup(s)"
    fi
}

calculate_statistics() {
    log "Statistiques des backups:"

    local total_backups=$(find "$BACKUP_DIR" -name "radio_backup_*.sql.gz" -type f | wc -l)
    local total_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)

    info "  Nombre total de backups: $total_backups"
    info "  Taille totale: $total_size"
    info "  Répertoire: $BACKUP_DIR"

    # Show 5 most recent backups
    if [[ $total_backups -gt 0 ]]; then
        info ""
        info "5 backups les plus récents:"
        find "$BACKUP_DIR" -name "radio_backup_*.sql.gz" -type f -printf "%T@ %Tc %p\n" | \
            sort -rn | head -5 | \
            while read -r timestamp date time tz year file; do
                local size=$(du -h "$file" | cut -f1)
                info "    $(basename "$file") - $date $time - $size"
            done
    fi
}

verify_backup() {
    log "Vérification de l'intégrité du backup..."

    local backup_path="$BACKUP_DIR/$BACKUP_FILENAME"

    if [[ "$COMPRESS" == "true" ]]; then
        # Test gzip integrity
        if ! gzip -t "$backup_path" &> /dev/null; then
            error "Le fichier de backup est corrompu"
            exit 1
        fi
    fi

    # Check file size
    local file_size=$(stat -f%z "$backup_path" 2>/dev/null || stat -c%s "$backup_path" 2>/dev/null)
    if [[ $file_size -lt 1000 ]]; then
        warning "Le fichier de backup est suspicieusement petit (${file_size} bytes)"
        warning "Vérifiez que la base de données contient des données"
    fi

    log "Backup vérifié avec succès"
}

display_info() {
    log ""
    log "=========================================="
    log "BACKUP TERMINÉ AVEC SUCCÈS"
    log "=========================================="
    log ""
    log "Fichier de backup: $BACKUP_FILENAME"
    log "Emplacement: $BACKUP_DIR"
    log "Base de données: $DB_NAME"
    log ""
    log "Pour restaurer ce backup:"
    log "  ./scripts/rollback.sh --backup $BACKUP_FILENAME"
    log ""
    log "Pour lister tous les backups:"
    log "  ./scripts/rollback.sh --list"
    log ""
    log "Logs de backup: $LOG_FILE"
    log ""
}

# Automated backup function (for cron jobs)
automated_backup() {
    # Suppress interactive output for automated runs
    exec > "$LOG_FILE" 2>&1

    check_prerequisites
    check_database_health
    create_backup
    create_metadata
    verify_backup
    cleanup_old_backups
    calculate_statistics

    # Send notification (if notification system is configured)
    if command -v notify &> /dev/null; then
        notify "Radio Staff Backup" "Backup completed: $BACKUP_FILENAME"
    fi
}

main() {
    log "=========================================="
    log "BACKUP DE LA BASE DE DONNÉES"
    log "=========================================="
    log "Timestamp: $TIMESTAMP"
    log ""

    parse_args "$@"
    check_prerequisites
    check_database_health
    create_backup
    create_metadata
    verify_backup
    cleanup_old_backups
    calculate_statistics
    display_info

    log "Backup terminé"
}

trap 'error "Erreur lors du backup à la ligne $LINENO"; exit 1' ERR

# Run main
main "$@"
