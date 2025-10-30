#!/bin/sh
set -e

echo "🔄 Waiting for database to be ready..."
sleep 5

echo "🔄 Running TypeORM migrations..."
npm run migration:run -- -d dist/data-source.js || echo "⚠️  Migrations failed or already applied"

echo "🚀 Starting application..."
exec node dist/main
