# Quickshelf & `esl-sim` CLI Cheat Sheet & Operations Guide

A comprehensive quick-reference for developers, operators, and evaluators running, testing, and managing the Quickshelf ecosystem.

---

## 1. Quickstart (One-Command Launch)

```bash
# 1. Start local Postgres 16 and Redis 7 (if not already running)
docker compose up -d

# 2. Run migrations and seed sample retail store data
pnpm db:migrate
pnpm db:seed

# 3. Launch all microservices, simulator, and operations console concurrently
pnpm start
```
> **What `pnpm start` launches:**
> - `API` on `http://localhost:3000` (REST & Webhooks)
> - `Gateway Hub` on `ws://localhost:8080` (WebSocket termination)
> - `Sync Engine` (Background divergence reconciliation control loop)
> - `ESL Simulator` (Virtual gateway `gw-blr-01` with 5 emulated tags)
> - `Dashboard` on `http://localhost:5173` (React 19 Enterprise Operations Console)

---

## 2. Running Services Individually

Useful for debugging a single microservice with detailed logs:

| Service | Command | Port / Protocol | Description |
|---|---|---|---|
| **All Services** | `pnpm start` | Multi | Launches API, Hub, Engine, Sim, and UI concurrently |
| **Cloud Services Only** | `pnpm services` | Multi | Launches API, Hub, and Engine (no Sim or UI) |
| **REST API** | `pnpm api` or `pnpm dev:api` | `http://localhost:3000` | POS webhook receiver & management API |
| **Gateway Hub** | `pnpm hub` or `pnpm dev:hub` | `ws://localhost:8080` | WebSocket termination & Redis event routing |
| **Sync Engine** | `pnpm engine` or `pnpm dev:engine` | Background | Reconciliation control loop & token bucket |
| **Operations Console** | `pnpm dashboard` or `pnpm dev:dashboard` | `http://localhost:5173` | React 19 + Vite operations console |
| **Fleet Simulator** | `pnpm sim` or `pnpm dev:sim` | CLI Client | Emulates virtual gateway and e-ink labels |

---

## 3. Database & Prisma Operations

All commands run against the PostgreSQL database configured in `.env` (`DATABASE_URL`).

```bash
# Apply pending Prisma migrations to the database
pnpm db:migrate

# Seed sample data (Koramangala store, gw-blr-01 gateway, 5 SKUs, paired tags)
pnpm db:seed

# Regenerate Prisma Client after schema changes
pnpm db:generate

# Open interactive Prisma Studio GUI in browser
pnpm --filter @quickshelf/db studio

# Create a new Prisma migration (development only)
pnpm --filter @quickshelf/db migrate dev --name <migration_name>
```

---

## 4. Virtual Fleet Simulator CLI (`apps/esl-sim`)

The simulator emulates real ceiling gateways and physical e-paper shelf labels with realistic radio latency, battery degradation, and version enforcement.

```bash
# Standard simulator run (connects to local Hub ws://localhost:8080 with 5 tags)
pnpm sim

# Custom gateway ID and custom label count (e.g. 50 tags)
pnpm sim -- --gateway gw-mumbai-01 --tags 50

# Custom Hub endpoint and simulated radio latency (ms)
pnpm sim -- --hub ws://127.0.0.1:8080 --latency 150

# Simulate a lossy 2.4 GHz RF environment (e.g. 10% packet drop rate)
pnpm sim -- --loss 0.10

# Display simulator CLI help and available options
pnpm --filter esl-sim run dev -- --help
```

### Simulator CLI Options Reference:
| Option | Default | Description |
|---|---|---|
| `--gateway, -g` | `gw-blr-01` | Gateway Hardware ID to report in `hello` frame |
| `--hub, -h` | `ws://localhost:8080` | Target Gateway Hub WebSocket URL |
| `--tags, -t` | `5` | Number of virtual e-ink tags to register under this AP |
| `--firmware, -f` | `v2.4.1-rc1` | Firmware version reported by the virtual AP |
| `--heartbeat` | `10000` | Heartbeat frame interval in milliseconds |
| `--latency` | `50` | Simulated radio latency per packet in milliseconds |
| `--drain` | `0.05` | Battery percentage drained per e-ink screen refresh |

---

## 5. Testing & Verification

```bash
# Run the 7 Hard Distributed Systems Problems Chaos Benchmark Suite
pnpm test:chaos

# Run all unit and integration tests across the entire monorepo
pnpm test

# Run tests for specific packages
pnpm --filter @quickshelf/api test           # API integration tests (9 tests)
pnpm --filter @quickshelf/sync-engine test   # Sync Engine & Token Bucket tests
pnpm --filter @quickshelf/gateway-hub test   # WebSocket Hub routing tests
pnpm --filter @quickshelf/esl-protocol test  # Protocol frame & hashing tests
pnpm --filter esl-sim test                   # Virtual Tag & Monotonicity tests

# Typecheck and build all workspace packages via Turborepo
pnpm build
```

---

## 6. Docker & Infrastructure Controls

```bash
# Start background PostgreSQL and Redis containers
docker compose up -d

# Stop background containers (preserves database volumes)
docker compose down

# Stop containers and erase all database volumes (clean slate)
docker compose down -v

# Inspect container status and healthchecks
docker ps

# Stream database logs
docker logs -f quickshelf-postgres

# Stream Redis logs
docker logs -f quickshelf-redis

# Connect directly to Redis CLI
docker exec -it quickshelf-redis redis-cli

# Connect directly to PostgreSQL via psql
docker exec -it quickshelf-postgres psql -U quickshelf -d quickshelf
```

---

## 7. Useful REST & Webhook `curl` Commands

### Ingest POS Price Update (Integer Minor Units)
```bash
curl -X POST http://localhost:3000/webhooks/pos \
  -H "Content-Type: application/json" \
  -d '{
    "storeId": "store-blr-koramangala",
    "skuCode": "CAD-SILK-150",
    "newPriceMinor": 16500,
    "mrpMinor": 17500,
    "promoBadge": "Weekend Special",
    "source": "pos"
  }'
```

### Trigger Fleet-Wide Flash Sale (-15%)
```bash
curl -X POST http://localhost:3000/api/pos/flash-sale \
  -H "Content-Type: application/json" \
  -d '{"discountPct": 15}'
```

### Reset All Prices to Standard MRP
```bash
curl -X POST http://localhost:3000/api/pos/reset-prices
```

### Inspect Fleet Divergence Status
```bash
curl http://localhost:3000/api/fleet/status
```

### Force Ceiling Gateway Drift Sync Request
```bash
curl -X POST http://localhost:3000/api/gateways/<GATEWAY_ID>/sync
```

### Update Ceiling AP Rate Limit (e.g. 75 tags/sec)
```bash
curl -X PUT http://localhost:3000/api/gateways/<GATEWAY_ID> \
  -H "Content-Type: application/json" \
  -d '{"maxTagsPerSec": 75}'
```

### Chaos: Inject Low Battery on Label
```bash
curl -X POST http://localhost:3000/api/chaos/inject-fault \
  -H "Content-Type: application/json" \
  -d '{"tagId": "tag-001", "faultType": "LOW_BATTERY"}'
```

### Chaos: Restore Battery on Label
```bash
curl -X POST http://localhost:3000/api/chaos/inject-fault \
  -H "Content-Type: application/json" \
  -d '{"tagId": "tag-001", "faultType": "RESTORE"}'
```

---

## 8. Dual-Repo & Git Synchronization

The project follows a dual-repo structure:
- **Private Repository**: [`BhadraSuman/QuickShelf`](https://github.com/BhadraSuman/QuickShelf) (`main` branch) — Complete enterprise monorepo.
- **Public Repository**: [`BhadraSuman/esl-sim`](https://github.com/BhadraSuman/esl-sim) (`public-release` branch) — Simulator & wire protocol only.

```bash
# Push full monorepo changes to private QuickShelf repository
git push origin main

# Automatically sync public simulator & protocol code to public esl-sim repo
pnpm publish:public
```
