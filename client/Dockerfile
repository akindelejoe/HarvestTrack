# syntax=docker/dockerfile:1
# HarvestTrack web client — build with Node, serve static files with nginx (context: repository root)

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN npm ci --workspace client --include-workspace-root=false
COPY client/ client/
RUN npm run build --workspace client

FROM nginx:1.27-alpine AS runtime
ENV BACKEND_UPSTREAM=backend:4100
COPY client/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/client/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
