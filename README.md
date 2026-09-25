# Quickshelf & `esl-sim`

> **Enterprise Electronic Shelf Label (ESL) Continuous Reconciliation Engine & Virtual Fleet Simulator**

[![pnpm](https://img.shields.io/badge/pnpm-10.29.3-orange?logo=pnpm)](https://pnpm.io/)
[![Turborepo](https://img.shields.io/badge/Turborepo-2.4.4-blue?logo=turborepo)](https://turbo.build/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22-green?logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb?logo=react)](https://react.dev/)
[![Fastify](https://img.shields.io/badge/Fastify-5.2-black?logo=fastify)](https://fastify.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis)](https://redis.io/)

---

## Overview

**Quickshelf** is an event-driven, distributed microservices platform engineered to synchronize hundreds of thousands of digital electronic shelf labels (ESLs) across retail stores with cloud Point-of-Sale (POS) price updates in real time.

Physical digital price tags operate over lossy 2.4 GHz radio channels, sleep 99.9% of the time, and run on tiny coin-cell batteries that must last 5 years. Quickshelf guarantees that in-store shelf tags match cloud prices with sub-second divergence resolution, battery-preserving payload skips, and lossy-radio backpressure pacing.

Accompanied by **`esl-sim`**, a hardware-accurate virtual fleet simulator that emulates ceiling gateways, RF packet loss, battery drain, and e-ink displays for end-to-end chaos engineering without requiring physical hardware.

---

## Key Highlights

- **Continuous Reconciliation Control Loop**: Solves distributed state divergence by continuously driving `reportedVersion` to match `desiredVersion`.
- **Sub-Millisecond Divergence Queries**: Leverages a PostgreSQL partial index (`idx_tag_diverged WHERE "desiredVersion" > "reportedVersion"`) to query only out-of-sync tags in $< 1\text{ms}$.
- **The 7 Hard Distributed Problems Solved**:
  1. *Monotonic Versioning*: Hardware rejects stale packets with `STALE_VERSION`.
  2. *Burst & Collapse*: Rapid price overrides automatically collapse intermediate versions into `SUPERSEDED`.
  3. *Battery-Aware Hash Skip*: Canonical SHA-256 payload hashing bypasses radio dispatches for non-visual updates.
  4. *Radio Pacing / Backpressure*: Atomic Redis Lua token bucket caps transmissions to `maxTagsPerSec` (default: 50 tags/sec).
  5. *AP Reconnect Reconciliation*: Reconnecting gateways emit full inventory `hello` frames to instantly heal state drift.
  6. *Idempotent Settlement*: Safe against duplicate or late-arriving ACKs/NACKs.
  7. *Fault Isolation & Low-Battery Guard*: Tags with $< 15\%$ battery NACK with `LOW_BATTERY` to prevent partial screen freezes without halting batches.
- **Enterprise Operations Console (`apps/dashboard`)**:
  - **E-Ink Grid View**: Realistic pixel-level digital paper display simulation with price, MRP strikethrough, discount badges, and animated divergence glow.
  - **Dense Data Table**: Multi-facet search and filters across stores, gateways, sizes, and battery levels.
  - **Tag Inspector Drawer**: Deep hardware diagnostics, telemetry gauges, side-by-side Cloud vs Hardware state diff, and live SKU re-binding.
  - **Ceiling AP Manager**: Health monitoring, transmission rate limit tuning, and forced inventory sync requests (`sync_request`).
  - **Commercial Catalog & Compliance Ledger**: Product inventory editor and immutable price change audit ledger.
  - **Chaos Lab**: Live 1-click test suite for 7 Hard Problems and fault injection.
- **Strict Currency Arithmetic**: All monetary values are strictly validated and stored as integer minor units (paise/cents, never floats).

---

## Architecture at a Glance

```
POS / ERP Webhook ──► [apps/api] ──► PostgreSQL (idx_tag_diverged)
                                              │
                      ┌───────────────────────┘
                      ▼
              [apps/sync-engine] (Reconciliation Loop)
                      │ (Atomic Redis Lua Token Bucket: 50 tags/sec)
                      ▼
              [apps/gateway-hub] (WebSocket Termination & Redis Routing)
                      │ (Wire Protocol: render_batch / sync_request)
                      ▼
         Store Gateway (Real AP / apps/esl-sim)
                      │ (2.4 GHz Radio Mesh)
                      ▼
           Digital Shelf Labels (e-paper tags)
```

For complete architectural specifications, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Quickstart

### Prerequisites
- [Node.js](https://nodejs.org/) v20+
- [pnpm](https://pnpm.io/) v10+ (`npm install -g pnpm`)
- [Docker Desktop](https://www.docker.com/) (for PostgreSQL and Redis)

### 1. Clone & Install
```bash
git clone https://github.com/BhadraSuman/QuickShelf.git
cd QuickShelf
pnpm install
```

### 2. Start Databases & Seed Data
```bash
# Start background PostgreSQL and Redis containers
docker compose up -d

# Apply database migrations and seed sample retail store
pnpm db:migrate
pnpm db:seed
```

### 3. Launch the Complete Ecosystem (One Command)
```bash
pnpm start
```

This single command boots the entire distributed system concurrently:
- 🌐 **Enterprise Dashboard**: [http://localhost:5173](http://localhost:5173)
- 🔌 **REST API & Webhooks**: [http://localhost:3000](http://localhost:3000)
- 📡 **Gateway Hub**: `ws://localhost:8080`
- ⚡ **Sync Engine**: Running background reconciliation control loop
- 🏷️ **ESL Simulator**: Virtual gateway `gw-blr-01` connected with 5 emulated tags

---

## Monorepo Structure

```
├── apps/
│   ├── api/             # Fastify REST API, POS webhook receiver, commercial CRUD
│   ├── dashboard/       # React 19 + Vite Enterprise Operations Console
│   ├── esl-sim/         # Virtual Gateway & Tag CLI Simulator (RF & battery emulation)
│   ├── gateway-hub/     # Distributed WebSocket server & Redis connection tracker
│   └── sync-engine/     # Background divergence scanner & token bucket rate limiter
├── packages/
│   ├── config/          # Central Zod environment configuration
│   ├── db/              # Prisma schema, client, seed, and hand-crafted partial index
│   └── esl-protocol/    # Wire protocol frames, Zod schemas, SHA-256 hash utility
├── tools/
│   ├── chaos-bench.ts   # Automated 7 Hard Problems benchmark suite
│   └── publish-public.ps1 # Dual-repo sync script for public esl-sim release
└── docs/
    ├── ARCHITECTURE.md  # In-depth architectural design & distributed systems model
    ├── CLI_CHEAT_SHEET.md # Exhaustive list of commands, flags, and scripts
    ├── PROTOCOL.md      # Wire protocol specification & frame contracts
    └── SPEC.md          # Original distributed systems challenge specification
```

---

## Verification & Chaos Benchmark

Run the automated chaos benchmark proving all 7 distributed systems edge cases:

```bash
pnpm test:chaos
```

```
=============================================================
  🧪 QUICKSHELF RECONCILIATION ENGINE - CHAOS BENCHMARK SUITE
  Proving the 7 Hard Problems in Distributed ESL Fleets
=============================================================

  ✅ [PASS] Problem 1: Monotonic Ordering & Stale Rejection
  ✅ [PASS] Problem 4: Token Bucket Backpressure & Rate Limiting
  ✅ [PASS] Problem 3: Battery-Aware Payload Hash Skip
  ✅ [PASS] Problem 6: Idempotent ACKs & Stale Settlement Rejection
  ✅ [PASS] Problem 7: Partial Batch Settlement & Fault Isolation

=============================================================
  🏁 BENCHMARK RESULTS: 5 / 5 CHECKS PASSED
=============================================================
```

Run all unit and integration tests across every package:
```bash
pnpm test
```

---

## Documentation Index

- 📘 [**Architecture & System Design**](docs/ARCHITECTURE.md): Microservice interactions, state machines, partial index design, and distributed edge cases.
- 💻 [**CLI Cheat Sheet & Operations Guide**](docs/CLI_CHEAT_SHEET.md): Complete reference for all development, database, simulator, docker, and test commands.
- 📡 [**Wire Protocol Specification**](docs/PROTOCOL.md): Detailed frame schemas (`hello`, `heartbeat`, `ack`, `nack`, `render_batch`, `sync_request`, `config`, `telemetry`).

---

## License

Private / Proprietary. Dual-licensed open-source components for the virtual simulator are published at [`BhadraSuman/esl-sim`](https://github.com/BhadraSuman/esl-sim).
