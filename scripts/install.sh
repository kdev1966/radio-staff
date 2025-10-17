#!/bin/bash
set -e

echo "🚀 Installing Radio Staff Manager..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found"
    echo "   Please copy .env.example to .env and configure it"
    exit 1
fi

IMAGES_DIR="$PROJECT_ROOT/offline-images"
if [ ! -d "$IMAGES_DIR" ]; then
    IMAGES_DIR="$PROJECT_ROOT/dist/offline-images"
fi

if [ ! -d "$IMAGES_DIR" ]; then
    echo "❌ Error: offline-images directory not found"
    exit 1
fi

echo "📦 Loading Docker images..."
for TAR_FILE in "$IMAGES_DIR"/*.tar; do
    if [ -f "$TAR_FILE" ]; then
        echo "  - Loading $(basename "$TAR_FILE")..."
        docker load -i "$TAR_FILE"
    fi
done

echo "🔍 Verifying loaded images..."
docker images

echo "🐳 Starting services..."
docker-compose up -d

echo "⏳ Waiting for services to be healthy..."
sleep 10

MAX_WAIT=120
ELAPSED=0
echo -n "Waiting for PostgreSQL"
while [ $ELAPSED -lt $MAX_WAIT ]; do
    if docker-compose exec -T postgres pg_isready -U radio >/dev/null 2>&1; then
        echo " ✅"
        break
    fi
    echo -n "."
    sleep 2
    ELAPSED=$((ELAPSED + 2))
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
    echo " ❌ Timeout"
    echo "PostgreSQL did not start in time"
    docker-compose logs postgres
    exit 1
fi

echo "📊 Running database migrations..."
docker-compose exec -T backend npx prisma migrate deploy || true

echo "🌱 Seeding database..."
docker-compose exec -T backend npx prisma db seed || echo "⚠️  Seed already applied or failed"

echo ""
echo "✅ Installation complete!"
echo ""
echo "===== ACCESS INFORMATION ====="
echo "Application:    http://localhost"
echo "API:            http://localhost/api"
echo "API Health:     http://localhost/api/health"
echo "Keycloak:       http://localhost/auth"
echo ""
echo "===== DEFAULT CREDENTIALS ====="
echo "Keycloak Admin:"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
echo "Application Users:"
echo "  Admin:    admin@radio.local / admin123"
echo "  Chef:     chef@radio.local / chef123"
echo "  Employé:  employe@radio.local / employe123"
echo ""
echo "===== USEFUL COMMANDS ====="
echo "View logs:       docker-compose logs -f"
echo "Stop services:   docker-compose stop"
echo "Start services:  docker-compose start"
echo "Remove all:      docker-compose down -v"
echo ""
echo "🎉 Radio Staff Manager is ready!"
