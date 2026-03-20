# ---- Stage 1: Dependencies ----
FROM node:22-alpine AS deps
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- Stage 2: Build ----
FROM node:22-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js (standalone output)
RUN npm run build

# ---- Stage 3: Runtime ----
FROM node:22-alpine AS runner
RUN apk add --no-cache ffmpeg
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone build (includes server.js + node_modules subset)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma files for runtime migrations
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

# Docker-specific prisma config (no dotenv dependency)
COPY prisma.config.docker.ts ./prisma.config.docker.ts

# Install only prisma CLI for runtime migrations
RUN npm install --no-save prisma@7

# su-exec for dropping privileges in entrypoint (bind mount permission fix)
RUN apk add --no-cache su-exec

# Copy entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Create upload directories (will be overlaid by bind mount at runtime)
RUN mkdir -p /app/data/uploads/audio /app/data/uploads/covers /app/data/uploads/referenz-daten

# Ensure nextjs user owns the app directory for prisma migrations
RUN chown -R nextjs:nodejs /app

# Start as root so entrypoint can fix bind mount permissions, then drop to nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
