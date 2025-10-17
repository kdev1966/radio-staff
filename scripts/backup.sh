#!/bin/bash
set -e

echo "💾 Backing up Radio Staff Manager data..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/radio-backup-$TIMESTAMP"

mkdir -p "$BACKUP_DIR"

cd "$PROJECT_ROOT"

if ! docker-compose ps postgres | grep -q "Up"; then
    echo "❌ Error: PostgreSQL container is not running"
    echo "   Start services with: docker-compose up -d"
    exit 1
fi

echo "📦 Creating backup: $BACKUP_FILE"
mkdir -p "$BACKUP_FILE"

echo "🗄️  Dumping PostgreSQL database..."
docker-compose exec -T postgres pg_dump -U radio radiodb -F c -f /tmp/radiodb.dump
docker cp $(docker-compose ps -q postgres):/tmp/radiodb.dump "$BACKUP_FILE/radiodb.dump"

echo "📋 Saving environment configuration..."
cp .env "$BACKUP_FILE/.env.backup"

echo "📊 Creating backup metadata..."
cat > "$BACKUP_FILE/backup-info.txt" <<EOF
Radio Staff Manager Backup
==========================
Date: $(date)
Timestamp: $TIMESTAMP
Database: radiodb
Format: PostgreSQL custom format

Docker Images:
$(docker-compose images)

Services Status:
$(docker-compose ps)
EOF

echo "🗜️  Compressing backup..."
tar -czf "$BACKUP_FILE.tar.gz" -C "$BACKUP_DIR" "$(basename "$BACKUP_FILE")"
rm -rf "$BACKUP_FILE"

BACKUP_SIZE=$(du -h "$BACKUP_FILE.tar.gz" | cut -f1)

echo ""
echo "✅ Backup complete!"
echo "📦 Backup file: $BACKUP_FILE.tar.gz"
echo "💾 Size: $BACKUP_SIZE"
echo ""
echo "===== RESTORE INSTRUCTIONS ====="
echo "1. Extract: tar -xzf $BACKUP_FILE.tar.gz"
echo "2. Stop services: docker-compose down"
echo "3. Restore DB: docker-compose up -d postgres"
echo "4. Import: docker-compose exec -T postgres pg_restore -U radio -d radiodb -c /tmp/radiodb.dump"
echo "5. Start all: docker-compose up -d"
echo ""

echo "🧹 Keeping last 7 backups, removing older ones..."
ls -t "$BACKUP_DIR"/radio-backup-*.tar.gz | tail -n +8 | xargs -r rm -f

echo "📊 Current backups:"
ls -lh "$BACKUP_DIR"/radio-backup-*.tar.gz 2>/dev/null || echo "  No backups found"
