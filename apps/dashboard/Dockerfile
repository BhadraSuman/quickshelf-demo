FROM node:22-slim AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/dashboard/ ./apps/dashboard/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @quickshelf/dashboard build

FROM node:22-slim AS runner
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

COPY --from=builder /app /app

EXPOSE 5173
CMD ["pnpm", "--filter", "@quickshelf/dashboard", "preview", "--host", "0.0.0.0", "--port", "5173"]
