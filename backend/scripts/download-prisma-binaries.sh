#!/bin/bash
# Script pour télécharger manuellement les binaires Prisma
# À exécuter sur une machine avec accès Internet complet

PRISMA_VERSION="5.22.0"
COMMIT_HASH="605197351a3c8bdd595af2d2a9bc3025bca48ea2"
PLATFORM="linux-musl-openssl-3.0.x"

BINARIES=(
  "libquery_engine.so.node"
  "schema-engine"
)

DOWNLOAD_DIR="./prisma-binaries"
mkdir -p "$DOWNLOAD_DIR"

echo "📦 Téléchargement des binaires Prisma $PRISMA_VERSION pour $PLATFORM..."

for BINARY in "${BINARIES[@]}"; do
  URL="https://binaries.prisma.sh/all_commits/${COMMIT_HASH}/${PLATFORM}/${BINARY}.gz"
  echo "⬇️  Téléchargement de $BINARY..."

  if curl -L -o "${DOWNLOAD_DIR}/${BINARY}.gz" "$URL"; then
    echo "✅ $BINARY téléchargé"
    gunzip -f "${DOWNLOAD_DIR}/${BINARY}.gz"
    chmod +x "${DOWNLOAD_DIR}/${BINARY}"
  else
    echo "❌ Erreur lors du téléchargement de $BINARY"
  fi
done

echo ""
echo "✅ Binaires téléchargés dans $DOWNLOAD_DIR"
echo "📋 Transférez ce dossier vers le serveur avec: scp -r $DOWNLOAD_DIR master@192.168.1.200:/home/master/radio-staff/backend/"
