# One image: builds the front end, then serves it from the API.
#
# A single origin means no CORS, no second container, and no nginx vhost to
# keep in sync — the Express app serves /api/* itself and hands everything
# else to the SPA. Put your own reverse proxy in front for TLS if you want.

# --- 1. build the front end ------------------------------------------------
FROM node:22-alpine AS client
WORKDIR /build/client

# Copy manifests first so the dependency layer is cached across code changes.
COPY client/package.json client/package-lock.json ./
RUN npm ci

COPY client/ ./
RUN npm run build


# --- 2. server dependencies (production only) ------------------------------
FROM node:22-alpine AS deps
WORKDIR /build/server

COPY server/package.json server/package-lock.json ./
# --omit=dev leaves out mongodb-memory-server; production requires a real
# MONGODB_URI anyway (see server/src/config/env.js), so it is never reached.
RUN npm ci --omit=dev


# --- 3. runtime ------------------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Run as the image's existing unprivileged user rather than root.
RUN mkdir -p /app/server /app/client && chown -R node:node /app

COPY --chown=node:node --from=deps  /build/server/node_modules ./server/node_modules
COPY --chown=node:node server/package.json                     ./server/package.json
COPY --chown=node:node server/src                              ./server/src
COPY --chown=node:node server/scripts                          ./server/scripts
# app.js resolves this at ../../client/dist relative to server/src
COPY --chown=node:node --from=client /build/client/dist        ./client/dist

USER node
WORKDIR /app/server

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=4s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/index.js"]
