#!/bin/sh
set -e

# Set defaults
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-$POSTGRES_USER}"
PGDATA="${PGDATA:-/var/lib/postgresql/data}"

# Check if initialization is needed
if [ ! -s "$PGDATA/PG_VERSION" ]; then
    echo "Initializing database..."

    mkdir -p "$PGDATA"
    chown -R postgres:postgres "$PGDATA"
    chmod 700 "$PGDATA"

    # Create password file with proper permissions
    echo "$POSTGRES_PASSWORD" > /tmp/pwfile
    chown postgres:postgres /tmp/pwfile
    chmod 600 /tmp/pwfile

    # Initialize database
    su-exec postgres initdb \
        --username="$POSTGRES_USER" \
        --pwfile=/tmp/pwfile \
        $POSTGRES_INITDB_ARGS

    rm -f /tmp/pwfile

    # Configure PostgreSQL
    echo "host all all all md5" >> "$PGDATA/pg_hba.conf"
    echo "listen_addresses = '*'" >> "$PGDATA/postgresql.conf"

    # Start PostgreSQL temporarily to create database
    su-exec postgres pg_ctl -D "$PGDATA" -o "-c listen_addresses=''" -w start

    # Create database if it doesn't exist
    if [ "$POSTGRES_DB" != "postgres" ]; then
        su-exec postgres psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<-EOSQL
            CREATE DATABASE "$POSTGRES_DB";
EOSQL
    fi

    # Run init scripts if any
    if [ -d /docker-entrypoint-initdb.d ]; then
        for f in /docker-entrypoint-initdb.d/*; do
            if [ -f "$f" ]; then
                case "$f" in
                    *.sh)     echo "Running $f"; . "$f" ;;
                    *.sql)    echo "Running $f"; su-exec postgres psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$f"; ;;
                    *.sql.gz) echo "Running $f"; gunzip -c "$f" | su-exec postgres psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB"; ;;
                    *)        echo "Ignoring $f" ;;
                esac
            fi
        done
    fi

    su-exec postgres pg_ctl -D "$PGDATA" -m fast -w stop

    echo "PostgreSQL init process complete; ready for start up."
fi

# Start PostgreSQL
exec su-exec postgres postgres
