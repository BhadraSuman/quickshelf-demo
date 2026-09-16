# esl-sim & the sync layer
Build spec for a device fleet simulator and the cloud reconciliation engine that drives price updates onto electronic shelf labels.

Two repos. One public and open source (`esl-sim`), one private (`sync-layer`). Together they are the foundation of Quickshelf.

---

## 01 Scope
Three layers exist. You build two of them now, and only to demo quality.

| Layer | Visibility | Why now |
| :--- | :--- | :--- |
| **esl-sim** — virtual gateways and tags | Public, MIT | Portfolio centrepiece. Gives away no moat: it is a test harness, not a product. |
| **sync-layer** — reconciliation, dispatch, device registry | Private repo | Actual advantage. Resume bullets plus a recorded demo; nobody expects a founder's source. |
| **Product surface** — dashboards, POS connectors, billing, multi-tenancy | Later | Build when beta stores tell you what they need, not before. |

### Explicitly out of scope
BLE firmware and radio work. Multi-tenancy. Real POS vendor integrations (we build one mock POS that emits the same webhook shape Tally or Zoho would). Hardened auth. Billing. Cutting all of this is what makes the project finishable alongside a full-time job.

Build the simulator first even if the resume did not exist. When real tags arrive you swap the transport and the entire cloud layer is already tested against a fleet you could never afford to buy. This is the correct engineering order for a hardware company.

---

## 02 The Core Idea
Every tag has a **desired state** — what the cloud has computed it should display, derived from SKU price, MRP, promo badge and tag size. It also has a **reported state** — what the hardware last confirmed it actually rendered.

$$\text{diverged}(tag) := tag.\text{desiredVersion} > tag.\text{reportedVersion}$$

A control loop continuously finds diverged tags and drives them back into agreement. That is the whole architecture. It is the same pattern as a Kubernetes controller.

### The property that falls out of this
Command dispatch does not need to be durable. If a command is lost in flight, the next pass of the loop re-detects the divergence and sends it again. You get delivery guarantees for free from the model rather than from the message bus.

The count of diverged tags over time is the single most important metric in the system. It should spike on a price change and return to zero within seconds.

---

## 03 Protocol
Gateways hold a persistent WebSocket to the cloud and exchange JSON frames.

### Why WebSocket and not MQTT, for now
MQTT is the right production answer — QoS levels, last-will for offline detection, a mature broker ecosystem. But it costs infrastructure, and we have deep WebSocket experience: heartbeats, exponential backoff, reconnection, namespace isolation. Define a Transport interface with `send`, `onMessage`, `onDisconnect`, implement WebSocket behind it, and note MQTT as the documented swap.

### Gateway → cloud
| Frame | Payload | Purpose |
| :--- | :--- | :--- |
| `hello` | `gatewayId`, `firmware`, full tag inventory with `{tagId, version, hash, battery}` | Announces presence and current fleet state. Drives reconnect reconciliation. |
| `heartbeat` | `uptime`, `connectedTagCount` | Liveness. Refreshes the Redis TTL key. |
| `ack` | `commandId`, `tagId`, `appliedVersion`, `hash`, `battery`, `rssi` | Confirms a render landed on hardware. |
| `nack` | `commandId`, `tagId`, `reason` | `TAG_UNREACHABLE`, `LOW_BATTERY`, `STALE_VERSION`, `RENDER_FAIL`. |
| `telemetry` | batch of battery and rssi readings | Sent on a slow timer, not per update. |

### Cloud → gateway
| Frame | Payload | Purpose |
| :--- | :--- | :--- |
| `render_batch` | `commandId`, `targets[]` of `{tagId, version, hash, payload}` | The workhorse. One frame drives many tags on one gateway. |
| `sync_request` | — | Asks the gateway to re-send its full inventory. Used when the cloud suspects drift. |
| `config` | `heartbeatMs`, `maxTagsPerSec` | Lets the cloud tune per-gateway rate limits without a firmware push. |

### One price change, end to end
```
mock POS  ──webhook──▶  api
                          │ writes Sku.price, bumps version
                          │ emits PriceChanged → Service Bus
                          ▼
                     sync-engine
                          │ recompute desired state for affected tags
                          │ hash payload; skip if unchanged
                          │ group by gateway, collapse to latest version
                          │ take tokens from per-gateway bucket
                          ▼
                     gateway-hub          (via Redis pub/sub to the
                          │                replica holding that socket)
                          ▼
                       esl-sim  ──ack──▶  sync-engine
                                            │ update reported state
                                            ▼
                                       tag converged
```

---

## 04 Data Model
```prisma
model Store {
  id        String   @id @default(cuid())
  name      String
  city      String
  gateways  Gateway[]
  skus      Sku[]
  tags      Tag[]
}

model Gateway {
  id            String   @id @default(cuid())
  storeId       String
  hardwareId    String   @unique
  firmware      String
  status        GatewayStatus @default(OFFLINE)
  lastSeenAt    DateTime?
  maxTagsPerSec Int      @default(50)
  store         Store    @relation(fields: [storeId], references: [id])
  tags          Tag[]
  commands      Command[]
}

model Sku {
  id         String  @id @default(cuid())
  storeId    String
  code       String
  name       String
  priceMinor Int                 // paise. never a float.
  mrpMinor   Int
  promoBadge String?
  version    Int     @default(1) // bumped on every commercial change
  store      Store   @relation(fields: [storeId], references: [id])
  tags       Tag[]
  events     PriceEvent[]
  @@unique([storeId, code])
}

model Tag {
  id         String  @id @default(cuid())
  storeId    String
  gatewayId  String
  hardwareId String  @unique
  size       TagSize                       // T154 | T213 | T290 | T420 | T750 | T1020
  skuId      String?

  desiredVersion Int     @default(0)
  desiredHash    String?
  desiredPayload Json?

  reportedVersion Int    @default(0)
  reportedHash    String?
  reportedAt      DateTime?

  batteryPct Int?
  rssi       Int?

  store    Store    @relation(fields: [storeId], references: [id])
  gateway  Gateway  @relation(fields: [gatewayId], references: [id])
  sku      Sku?     @relation(fields: [skuId], references: [id])
  targets  CommandTarget[]
}

model Command {
  id          String @id @default(cuid())
  gatewayId   String
  status      CommandStatus @default(PENDING)
  attempt     Int      @default(0)
  createdAt   DateTime @default(now())
  dispatchedAt DateTime?
  settledAt   DateTime?
  gateway     Gateway  @relation(fields: [gatewayId], references: [id])
  targets     CommandTarget[]
}

model CommandTarget {
  id        String @id @default(cuid())
  commandId String
  tagId     String
  version   Int
  hash      String
  payload   Json
  status    TargetStatus @default(PENDING)
  ackedAt   DateTime?
  failure   String?
  command   Command @relation(fields: [commandId], references: [id])
  tag       Tag     @relation(fields: [tagId], references: [id])
  @@unique([commandId, tagId])    // ack idempotency
}

model PriceEvent {
  id           String   @id @default(cuid())
  skuId        String
  oldPriceMinor Int
  newPriceMinor Int
  source       String              // "pos" | "manual" | "promo"
  createdAt    DateTime @default(now())
  sku          Sku      @relation(fields: [skuId], references: [id])
}

enum GatewayStatus  { ONLINE OFFLINE DEGRADED }
enum CommandStatus  { PENDING DISPATCHED SETTLED FAILED }
enum TargetStatus   { PENDING ACKED FAILED SUPERSEDED }
enum TagSize        { T154 T213 T290 T420 T750 T1020 }
```

### Four details that matter
1. **Money as integer minor units.** Never a float, anywhere, ever.
2. **Desired and reported live on the same row.** This makes the divergence query a single index scan rather than a join.
3. **A partial index does the heavy lifting.** Prisma cannot express this, so put it in a migration by hand:
   ```sql
   CREATE INDEX idx_tag_diverged
     ON "Tag" ("gatewayId")
     WHERE "desiredVersion" > "reportedVersion";
   ```
4. **PriceEvent is the audit trail.** Essential receipt when a customer disputes a price.

---

## 05 Services & Roles
- **api**: GraphQL via Pothos and Prisma. Device registry, SKU catalog, dashboard queries and subscriptions. Hosts mock POS REST webhook receiver. Scales to zero.
- **sync-engine**: Continuous loop: detect divergence, compute payloads, collapse, batch, rate-limit, dispatch, handle acks and timeouts. Scales on pending-command backlog.
- **gateway-hub**: Holds WebSocket connections. Stateless frame translation.
- **esl-sim**: Fleet emulator CLI & chaos API.

### Redis Responsibilities
- `gw:conn:{gatewayId}` → replica id, TTL 30s refreshed by heartbeat.
- Pub/sub channel per replica for dispatch.
- `gw:bucket:{gatewayId}` → token bucket enforcing rate limits.
- Short-TTL ack dedup key.

---

## 06 The Seven Hard Problems
1. **Staleness and ordering**: Monotonic versioning with `STALE_VERSION` rejection on gateway and cloud.
2. **Collapse**: Select only latest version per tag, marking superseded targets `SUPERSEDED`.
3. **Battery-aware skip**: SHA-256 payload hashing; if desired matches reported hash, bump version without radio dispatch.
4. **Backpressure**: Token bucket per gateway in Redis refilled at `maxTagsPerSec`.
5. **Offline and reconnect**: Reconcile from full inventory diff in `hello` frame instead of event replay.
6. **Idempotent acks**: Unique `(commandId, tagId)` + reported version checks.
7. **Partial batch failure**: Target-level settlement; failed targets stay diverged.

---

## 07 Build Order
- **Week 1 — the model**: Prisma schema, migrations, partial index, desired-state computation, version bumping, unit tests.
- **Week 2 — the wire**: Protocol types, gateway-hub WebSocket server, esl-sim v1.
- **Week 3 — the loop**: sync-engine (divergence query, hash skip, collapse, batching, dispatch, ack settlement).
- **Week 4 — failure**: Offline and reconnect reconciliation, timeouts, retries, token buckets, chaos API.
- **Week 5 — the surface**: Next.js dashboard, mock POS panel, chaos controls.
- **Week 6 — proof**: Azure Container Apps, structured logging, KQL dashboards, alerts, metrics verification.
