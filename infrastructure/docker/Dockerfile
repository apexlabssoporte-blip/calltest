# ----------------------------------------------------
# Multi-stage Production Dockerfile for CallTest Backend
# ----------------------------------------------------

# Stage 1: Build & Prune
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies required for native builds if any
RUN apk add --no-cache libc6-compat

COPY package*.json ./
COPY packages ./packages
COPY apps/backend ./apps/backend

# Install all workspace dependencies
RUN npm ci

# Generate Prisma Client & Build TypeScript
RUN npm run db:generate --workspace=apps/backend
RUN npm run build

# Stage 2: Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 calltest

# Copy necessary production files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/backend/package.json ./apps/backend/
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma

# Set correct ownership
USER calltest

EXPOSE 3000

# Healthcheck probe using liveness endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health/live || exit 1

# Start the Fastify backend service
CMD ["node", "apps/backend/dist/server.js"]
