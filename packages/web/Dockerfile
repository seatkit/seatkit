# Stage 1: Prune the monorepo to web-only subset
FROM node:22-slim AS pruner
RUN npm install -g turbo@2
WORKDIR /app
COPY . .
RUN turbo prune @seatkit/web --docker

# Stage 2: Install dependencies (cached when lockfile unchanged)
FROM node:22-slim AS installer
RUN npm install -g pnpm@9.12.3
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
# patchedDependencies in root package.json requires the patches directory
COPY --from=pruner /app/patches ./patches
RUN pnpm install --frozen-lockfile

# Stage 3: Build with NEXT_PUBLIC_API_URL baked in (per D-20)
FROM installer AS builder
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
COPY --from=pruner /app/out/full/ .
RUN pnpm build --filter=@seatkit/web

# Stage 4: Production runner (standalone = no node_modules needed)
FROM node:22-slim AS runner
RUN addgroup --system seatkit && adduser --system --ingroup seatkit seatkit
WORKDIR /app

# Copy standalone server output
# In a pnpm monorepo, standalone output preserves the packages/web/ directory structure
COPY --from=builder /app/packages/web/.next/standalone ./
COPY --from=builder /app/packages/web/.next/static ./packages/web/.next/static
COPY --from=builder /app/packages/web/public ./packages/web/public

USER seatkit

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# In monorepo standalone mode, server.js is at packages/web/server.js
CMD ["node", "packages/web/server.js"]
