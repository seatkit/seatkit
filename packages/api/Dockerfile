# Stage 1: Prune the monorepo to API-only subset
FROM node:22-slim AS pruner
RUN npm install -g turbo@2
WORKDIR /app
COPY . .
RUN turbo prune @seatkit/api --docker

# Stage 2: Install production dependencies (cached when lockfile unchanged)
FROM node:22-slim AS installer
RUN npm install -g pnpm@9.12.3
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
# patchedDependencies in root package.json requires the patches directory
COPY --from=pruner /app/patches ./patches
# shamefully-hoist flattens node_modules (no symlinks) so Docker COPY works correctly
RUN pnpm install --frozen-lockfile --prod --shamefully-hoist

# Stage 3: Build the API
FROM node:22-slim AS builder
RUN npm install -g pnpm@9.12.3
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=pruner /app/patches ./patches
# Install all deps (including devDependencies for build tooling)
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN pnpm build --filter=@seatkit/api

# Stage 4: Production runner
FROM node:22-slim AS runner
RUN addgroup --system seatkit && adduser --system --ingroup seatkit seatkit
WORKDIR /app

# Copy built API output
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/api/package.json ./packages/api/package.json
# Workspace dependency dist/ dirs (imported by API at runtime)
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/types/package.json ./packages/types/package.json
COPY --from=builder /app/packages/utils/dist ./packages/utils/dist
COPY --from=builder /app/packages/utils/package.json ./packages/utils/package.json
COPY --from=builder /app/packages/engine/dist ./packages/engine/dist
COPY --from=builder /app/packages/engine/package.json ./packages/engine/package.json
# Hoisted node_modules — flat layout, no symlinks
COPY --from=installer /app/node_modules ./node_modules
# Migration files — migrate.ts reads from ./src/db/migrations
COPY --from=builder /app/packages/api/src/db/migrations ./packages/api/src/db/migrations

USER seatkit

ENV NODE_ENV=production
EXPOSE 3001
# Working directory is /app; API entry point at packages/api/dist/index.js
CMD ["node", "packages/api/dist/index.js"]
