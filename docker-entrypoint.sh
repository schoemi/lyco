#!/bin/sh
set -e

# Ensure upload directories exist and are writable by nextjs user.
# Bind mounts may create the host directory as root — fix ownership here.
mkdir -p /app/data/uploads/audio /app/data/uploads/covers /app/data/uploads/referenz-daten
chown -R nextjs:nodejs /app/data/uploads

# Log mount info for debugging file persistence issues
echo "=== Storage diagnostics ==="
echo "Upload dir contents:"
ls -la /app/data/uploads/ 2>/dev/null || echo "  (empty or missing)"
echo "Audio files: $(ls /app/data/uploads/audio/ 2>/dev/null | wc -l | tr -d ' ')"
echo "Cover files: $(ls /app/data/uploads/covers/ 2>/dev/null | wc -l | tr -d ' ')"
echo "Mount info:"
mount | grep /app/data || echo "  (no mount found for /app/data)"
echo "==========================="

echo "Running Prisma migrations..."
su-exec nextjs npx prisma migrate deploy --config=prisma.config.docker.ts || echo "Warning: Migration failed or skipped."

echo "Starting application..."
exec su-exec nextjs "$@"
