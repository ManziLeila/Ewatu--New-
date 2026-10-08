#!/bin/sh
apk add --no-cache openssl libssl3 2>/dev/null || true

set -e

echo "Starting E-Watu service: ${SERVICE_NAME:-service}"

# Run Prisma migrations if schema exists and DATABASE_URL is set
if [ -f "./prisma/schema.prisma" ]; then
  if [ -z "${DATABASE_URL:-}" ]; then
    echo "WARNING: DATABASE_URL not set — skipping migrations"
  else
    echo "Running database migrations for ${SERVICE_NAME:-service}..."
    npx prisma migrate deploy --schema=./prisma/schema.prisma
    echo "Migrations complete."
  fi
fi

# Execute the main process
exec "$@"
