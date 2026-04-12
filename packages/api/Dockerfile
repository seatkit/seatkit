# Stage 1: Prune the monorepo to API-only subset
FROM node:22-slim AS pruner
RUN npm install -g turbo@2
WORKDIR /app
COPY . .
RUN turbo prune @seatkit/api --docker

# Stage 2: Install deps and build
FROM node:22-slim AS builder
RUN npm install -g pnpm@9.12.3
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=pruner /app/patches ./patches
RUN pnpm install --frozen-lockfile --shamefully-hoist
COPY --from=pruner /app/out/full/ .
RUN pnpm build --filter=@seatkit/api
# Prune dev dependencies after build
RUN pnpm prune --prod

# Stage 3: Production runner
FROM node:22-slim AS runner
RUN addgroup --system seatkit && adduser --system --ingroup seatkit seatkit
WORKDIR /app

# Copy built output and pruned production node_modules from same stage
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/api/package.json ./packages/api/package.json
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/types/package.json ./packages/types/package.json
COPY --from=builder /app/packages/utils/dist ./packages/utils/dist
COPY --from=builder /app/packages/utils/package.json ./packages/utils/package.json
COPY --from=builder /app/packages/engine/dist ./packages/engine/dist
COPY --from=builder /app/packages/engine/package.json ./packages/engine/package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/api/src/db/migrations ./packages/api/src/db/migrations

USER seatkit

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "packages/api/dist/index.js"]
