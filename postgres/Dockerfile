# Custom Postgres image to bypass network issues
FROM alpine:3.19

ENV LANG=en_US.utf8 \
    PG_MAJOR=15 \
    PG_VERSION=15.10 \
    PGDATA=/var/lib/postgresql/data

# Install PostgreSQL from Alpine packages
RUN set -eux; \
    apk add --no-cache \
        postgresql${PG_MAJOR} \
        postgresql${PG_MAJOR}-contrib \
        su-exec \
        tzdata \
    ; \
    mkdir -p /var/run/postgresql; \
    chown -R postgres:postgres /var/run/postgresql; \
    chmod 2777 /var/run/postgresql; \
    mkdir -p "$PGDATA"; \
    chown -R postgres:postgres "$PGDATA"; \
    chmod 700 "$PGDATA"

# Add docker-entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

VOLUME /var/lib/postgresql/data

EXPOSE 5432

STOPSIGNAL SIGINT

ENTRYPOINT ["docker-entrypoint.sh"]

CMD ["postgres"]
