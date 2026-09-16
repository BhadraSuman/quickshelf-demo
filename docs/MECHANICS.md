# Operational & Infrastructure Mechanics: quickshelf & esl-sim

This document captures the operational realities, deployment topology, and infrastructure mechanics for **Quickshelf** (cloud reconciliation layer) and **`esl-sim`** (fleet simulator).

---

## 1. System Communication Topology

There is **no direct HTTP communication between any internal services**. All inter-service communication flows through durable messaging (Service Bus) or low-latency pub/sub (Redis).

```
store gateways (esl-sim) ──wss──▶ gateway-hub ──┐
                                                ├─ Redis pub/sub ─┐
POS webhooks ────────────https──▶ api           │                 ▼
                                   │            └────────── sync-engine
                                   └── Service Bus ──────────────▶│
                                                                  │
                        api, sync-engine ───────▶ Postgres ◀──────┘
```

### Protocol & Queue Responsibilities
- **Service Bus**: Carries `PriceChanged` events from `api` to `sync-engine`.
  - Durable, persistent, retryable, dead-letter queue (DLQ).
  - A lost price change represents real store pricing drift.
- **Redis Pub/Sub**: Carries command dispatches from `sync-engine` to whichever `gateway-hub` instance holds the gateway's socket.
  - Ephemeral / fire-and-forget.
  - Delivery guarantees stem from the continuous state reconciliation loop, not the pub/sub transport.
- **WebSocket**: Carries frame-based protocol (`hello`, `render_batch`, `ack`, `nack`, `heartbeat`) between `gateway-hub` and gateways (`esl-sim`).

### End-to-End Correlation ID
A single `correlationId` originates at the POS webhook, propagates into Service Bus application properties, travels in the WebSocket `render_batch` frame, and is echoed back in the `ack`/`nack`. A single KQL query traces any price change across all three services.

---

## 2. Repo Layout & Monorepo Structure

One monorepo managed with **pnpm workspaces** and **Turborepo**:

```
quickshelf/
├── apps/
│   ├── api/            # GraphQL (Pothos + Prisma) + POS REST webhook receiver
│   ├── sync-engine/    # Continuous reconciliation loop (no HTTP surface, private network only)
│   ├── gateway-hub/    # Stateful WebSocket termination & frame translation
│   └── dashboard/      # Next.js real-time tag grid & operations panel
├── packages/
│   ├── db/             # Prisma schema, migrations, generated client
│   ├── config/         # Strongly-typed environment parsing (Zod)
│   └── esl-protocol/   # Published to npm as @quickshelf/esl-protocol (MIT)
├── docs/               # Architecture, protocol, mechanics documentation
├── docker-compose.yml  # Local Postgres & Redis
├── pnpm-workspace.yaml
└── turbo.json
```

### The Protocol Package Exception
`packages/esl-protocol` is published as `@quickshelf/esl-protocol` (MIT). Both the cloud monorepo and the independent `esl-sim` repository consume this package, guaranteeing honest, shared protocol semantics.

---

## 3. Database Ownership & Migrations

### Ownership Boundaries
- `api` and `sync-engine` import `packages/db` and talk directly to Postgres.
- `gateway-hub` **never** touches Postgres; its sole job is socket management and frame translation.

### Migration Invariants
1. **Never run `prisma migrate deploy` on application startup.**
   - Multiple Container App replicas race the migration lock and cause deployment stalls or deadlocks.
2. **Migrations run as a dedicated, gated pipeline step** in CI/CD before any service revision rolls out.
3. **Expand-Contract Pattern**:
   - For live store operations, schema changes must never break running services. Add new columns, deploy code writing both, backfill, read new, drop old.
4. **Hand-Crafted Partial Index**:
   ```sql
   CREATE INDEX idx_tag_diverged
     ON "Tag" ("gatewayId")
     WHERE "desiredVersion" > "reportedVersion";
   ```
   Ensures the divergence detection query is an index scan over only diverged tags.

---

## 4. Azure Container Apps Topology

Single Container Apps Environment sharing an internal virtual network and Log Analytics workspace.

| App | Ingress | Replicas | Scale Trigger | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| `api` | External HTTPS | 0–2 | HTTP Concurrency | Scales to zero when idle; handles public webhooks and UI queries. |
| `gateway-hub` | External HTTPS (WebSocket) | 1–2 | Custom / Connected Count (**NOT HTTP Concurrency**) | Persistent WebSocket sockets trick HTTP concurrency scalers into scaling out indefinitely. Requires session affinity and `minReplicas: 1`. |
| `sync-engine` | **None** | 1–1 (initially) | Queue backlog / CPU | No ingress: zero public/internal HTTP attack surface. Fixed at 1 replica until distributed row locking (`FOR UPDATE SKIP LOCKED`) is validated. |
| `redis` | Internal TCP | 1–1 | Fixed | Low-cost internal routing and token buckets. Zero persistence needed (state rebuilds on heartbeat). |
| `dashboard` | External HTTPS | 0–2 | HTTP Concurrency | Staff and admin UI. |

---

## 5. Dockerfile & Container Best Practices

- Base Image: `node:20-slim` (Debian-based, avoiding Alpine musl libc mismatches with Prisma query engine binaries).
- Binary Targets:
  ```prisma
  generator client {
    provider      = "prisma-client-js"
    binaryTargets = ["native", "debian-openssl-3.0.x"]
  }
  ```
- Build Strategy: Multi-stage Dockerfiles utilizing `pnpm deploy --filter` to generate minimal runtime bundles.

---

## 6. CI/CD & Deployment Order

### GitHub Actions Pipeline
```
on: push to main
  ├── 1. Filter changed apps (paths-filter / turbo --filter)
  ├── 2. Build & push Docker images to GHCR tagged with commit SHA (never :latest)
  ├── 3. Execute `prisma migrate deploy` (blocking deployment gate)
  └── 4. Update Azure Container App revisions (`az containerapp update --image ...`)
```

- **Rollback**: Instant rollback via `az containerapp revision activate` to the previous commit SHA revision.
- **Auth**: Azure OIDC federated credentials (passwordless, no long-lived client secrets).

### First Deployment Sequence
1. Resource Group & Log Analytics Workspace (daily cap configured immediately).
2. Container Apps Environment.
3. Postgres Flexible Server (firewall configured for Azure VNet).
4. Redis Container App with internal TCP ingress.
5. Service Bus Namespace & Queue (Basic tier, with dead-letter queue).
6. Run database migrations (`prisma migrate deploy`).
7. Deploy `sync-engine` (internal worker), `gateway-hub` (WebSocket), `api` (webhooks & GraphQL).
8. Run `esl-sim` against public `gateway-hub` to smoke test end-to-end convergence.
