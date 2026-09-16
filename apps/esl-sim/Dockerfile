FROM node:22-slim AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/esl-sim/ ./apps/esl-sim/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter esl-sim run build

FROM node:22-slim AS runner
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

COPY --from=builder /app /app

ENV HUB_URL="ws://gateway-hub:8080"
ENV GATEWAY_ID="gw-blr-01"
ENV TAG_COUNT="5"

CMD ["node", "apps/esl-sim/dist/cli.js", "--gateway", "gw-blr-01", "--tags", "5", "--hub", "ws://gateway-hub:8080"]
