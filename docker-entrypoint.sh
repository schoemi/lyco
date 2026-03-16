#!/bin/sh
set -e

echo "Running Prisma migrations..."
npx prisma migrate deploy --config=prisma.config.docker.ts || echo "Warning: Migration failed or skipped."

echo "Starting application..."
exec "$@"
