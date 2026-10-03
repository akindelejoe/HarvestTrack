# syntax=docker/dockerfile:1
# HarvestTrack API — multi-stage build (context: repository root)

FROM node:22-alpine AS base
# Prisma's query engine needs OpenSSL on Alpine.
RUN apk add --no-cache openssl
WORKDIR /app

# ---- Install all server dependencies (incl. dev) for compiling TypeScript ----
FROM base AS deps
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --workspace server --include-workspace-root=false

# ---- Compile TypeScript + generate Prisma client ----
FROM deps AS build
COPY server/ server/
RUN npm run build --workspace server

# ---- Production dependencies only (prisma + tsx are runtime deps for migrate/seed) ----
FROM base AS prod-deps
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
COPY server/prisma server/prisma
RUN npm ci --workspace server --include-workspace-root=false --omit=dev \
 && cd server && npx --no-install prisma generate \
 && npm cache clean --force

# ---- Runtime image ----
FROM base AS runtime
ENV NODE_ENV=production \
    PRISMA_HIDE_UPDATE_MESSAGE=1 \
    PORT=4100
COPY --from=prod-deps /app ./
COPY --from=build /app/server/dist ./server/dist
COPY server/prisma ./server/prisma
COPY server/scripts/docker-entrypoint.sh ./server/scripts/docker-entrypoint.sh
COPY server/scripts/scan-alerts.ts ./server/scripts/scan-alerts.ts
RUN chmod +x ./server/scripts/docker-entrypoint.sh

WORKDIR /app/server
USER node
EXPOSE 4100

HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4100)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["./scripts/docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
