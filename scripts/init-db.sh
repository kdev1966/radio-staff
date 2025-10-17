#!/bin/bash
set -e

echo "🔧 Initializing PostgreSQL database..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Enable pgcrypto extension for RGPD compliance
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    -- Create audit schema
    CREATE SCHEMA IF NOT EXISTS audit;

    -- Grant permissions
    GRANT ALL PRIVILEGES ON DATABASE $POSTGRES_DB TO $POSTGRES_USER;
    GRANT ALL PRIVILEGES ON SCHEMA public TO $POSTGRES_USER;
    GRANT ALL PRIVILEGES ON SCHEMA audit TO $POSTGRES_USER;
EOSQL

echo "✅ Database initialization complete"
