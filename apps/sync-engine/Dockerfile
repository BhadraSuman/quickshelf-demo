FROM node:22-slim AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/sync-engine/ ./apps/sync-engine/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @quickshelf/db run generate
RUN pnpm --filter @quickshelf/sync-engine run build

FROM node:22-slim AS runner
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

ENV NODE_ENV=production

COPY --from=builder /app /app

# sync-engine has ZERO HTTP ports (private worker)
CMD ["pnpm", "--filter", "@quickshelf/sync-engine", "start"]
