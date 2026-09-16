FROM node:22-slim AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/gateway-hub/ ./apps/gateway-hub/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @quickshelf/gateway-hub run build

FROM node:22-slim AS runner
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

ENV NODE_ENV=production
ENV GATEWAY_HUB_PORT=8080

COPY --from=builder /app /app

EXPOSE 8080
CMD ["pnpm", "--filter", "@quickshelf/gateway-hub", "start"]
