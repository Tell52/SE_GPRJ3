# ##############################################################################
# Event Planner: production image for Cloud Run (multi-stage)
# ##############################################################################
# ONE image holds the Express API and the built React client and serves both on
# $PORT (3000). Cloud Run, CI and `docker compose --profile app` build exactly this
# file from the repository root:  docker build .
#
# The repo is an npm workspaces monorepo (client/, server/, e2e/) with ONE root
# package-lock.json, so dependencies are installed once at the root.
#
# * Listens on 0.0.0.0:$PORT when NODE_ENV=production (server/src/index.ts).
# * No secret is baked in: DATABASE_URL and SEED_PASSWORD come from Secret
#   Manager at run time (deploy/deploy.sh).
# * The Cloud Run migration job runs from this same image:
#     npx prisma migrate deploy && node dist/prisma/seed.js
#   so prisma/ and the Prisma CLI stay in the runtime image.
# * Runs as the unprivileged `node` user.
# ##############################################################################

# ---------------------------------------------------------------------------
# Stage 1: install all workspace dependencies and build server + client
# ---------------------------------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /app
# Prisma needs openssl on alpine.
RUN apk add --no-cache openssl

# Package manifests first, so `npm ci` stays cached until dependencies change.
COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/
COPY e2e/package.json e2e/
# e2e (Playwright) is not needed in the image: install only server and client.
RUN npm ci --workspace=server --workspace=client --include-workspace-root --no-audit --no-fund

COPY client/ client/
COPY server/ server/
# Same-origin API: the client calls /api on the server that serves it.
# `npm run build` = prisma generate + tsc (server), then vite build (client).
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2: runtime image (this is what runs on Cloud Run)
# ---------------------------------------------------------------------------
FROM node:24-alpine AS production
RUN apk add --no-cache openssl
WORKDIR /app

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server/package.json ./server/package.json
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/prisma ./server/prisma
COPY --from=build /app/client/dist ./client/dist
COPY server/docker-entrypoint.sh ./server/docker-entrypoint.sh
RUN chmod 0755 ./server/docker-entrypoint.sh

ENV NODE_ENV=production
ENV TZ=Asia/Bangkok
# Must match `--port` in deploy/deploy.sh. Cloud Run also sets PORT itself.
ENV PORT=3000
# The server serves the built client from here (see server/src/app.ts).
ENV CLIENT_DIST=/app/client/dist
EXPOSE 3000

WORKDIR /app/server
USER node
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/src/index.js"]
