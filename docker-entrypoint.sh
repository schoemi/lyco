#!/bin/sh
set -e

# Ensure upload directories exist and are writable by nextjs user.
# Bind mounts may create the host directory as root — fix ownership here.
mkdir -p /app/data/uploads/audio /app/data/uploads/covers /app/data/uploads/referenz-daten
chown -R nextjs:nodejs /app/data/uploads

echo "Running Prisma migrations..."
su-exec nextjs npx prisma migrate deploy --config=prisma.config.docker.ts || echo "Warning: Migration failed or skipped."

echo "Starting application..."
exec su-exec nextjs "$@"
