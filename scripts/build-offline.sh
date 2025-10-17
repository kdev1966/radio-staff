#!/bin/bash
set -e

echo "🏗️  Building offline Radio Staff Manager package..."

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$PROJECT_ROOT/dist"
IMAGES_DIR="$DIST_DIR/offline-images"

cd "$PROJECT_ROOT"

echo "📦 Creating dist directories..."
rm -rf "$DIST_DIR"
mkdir -p "$IMAGES_DIR"

echo "🐳 Building Docker images..."
docker-compose build --no-cache

echo "💾 Saving Docker images..."
IMAGES=$(docker-compose config | grep 'image:' | awk '{print $2}' | sort -u)
POSTGRES_IMAGE="postgres:15-alpine"
IMAGES="$IMAGES $POSTGRES_IMAGE"

for IMAGE in $IMAGES; do
    IMAGE_NAME=$(echo "$IMAGE" | tr '/:' '_')
    echo "  - Saving $IMAGE to $IMAGE_NAME.tar..."
    docker save "$IMAGE" -o "$IMAGES_DIR/$IMAGE_NAME.tar"
done

echo "📋 Copying configuration files..."
cp docker-compose.yml "$DIST_DIR/"
cp .env.example "$DIST_DIR/.env"
cp -r scripts "$DIST_DIR/"

echo "📄 Copying installation files..."
cat > "$DIST_DIR/README.txt" <<'EOF'
===========================================
Radio Staff Manager - Installation Package
===========================================

Ce package contient tous les fichiers nécessaires pour déployer
l'application Radio Staff Manager en environnement air-gap.

PRÉREQUIS:
- Docker Engine 20.10+
- Docker Compose 2.0+
- 4 GB RAM minimum
- 10 GB espace disque

INSTALLATION:
1. Copier ce dossier sur le serveur cible
2. Adapter le fichier .env si nécessaire
3. Exécuter: bash scripts/install.sh

COMPTES PAR DÉFAUT:
- Admin Keycloak: admin / admin123
- Admin App: admin@radio.local / admin123
- Chef Service: chef@radio.local / chef123
- Employé: employe@radio.local / employe123

ACCÈS:
- Application: http://localhost
- API: http://localhost/api
- Keycloak: http://localhost/auth

SAUVEGARDE:
- Exécuter: bash scripts/backup.sh

Pour plus d'informations, consulter docs/admin.pdf
EOF

echo "📊 Generating size report..."
echo ""
echo "===== BUILD SUMMARY ====="
du -sh "$DIST_DIR"
du -sh "$IMAGES_DIR"
echo ""
ls -lh "$IMAGES_DIR"
echo ""

TOTAL_SIZE=$(du -sb "$DIST_DIR" | awk '{print $1}')
TOTAL_SIZE_GB=$(echo "scale=2; $TOTAL_SIZE / 1024 / 1024 / 1024" | bc)

echo "✅ Build complete!"
echo "📦 Total package size: ${TOTAL_SIZE_GB} GB"
echo "📁 Package location: $DIST_DIR"
echo ""

if (( $(echo "$TOTAL_SIZE_GB > 2.0" | bc -l) )); then
    echo "⚠️  WARNING: Package size exceeds 2 GB target!"
else
    echo "✅ Package size is within 2 GB target"
fi

echo ""
echo "🚀 Ready for deployment!"
echo "   To test locally: cd $DIST_DIR && bash scripts/install.sh"
