# Protocol Specification: Quickshelf Gateway Wire Protocol

Version: `0.1.0`  
Transport: WebSocket (JSON frames). Abstracted behind a `Transport` interface for future MQTT migration.

---

## 1. Frame Overview

Gateways maintain a persistent WebSocket connection to `gateway-hub`. Messages are exchanged as single JSON frames with a discriminating `type` field.

```
       Gateway                                       gateway-hub / Cloud
          │                                                   │
          │ ─── hello (full tag inventory) ─────────────────▶ │
          │ ◀── render_batch (diverged tag commands) ──────── │
          │ ─── ack (commandId, tagId, appliedVersion...) ──▶ │
          │ ─── nack (commandId, tagId, reason) ────────────▶ │
          │ ─── heartbeat (periodic liveness) ──────────────▶ │
          │ ◀── config (tuning limits, intervals) ─────────── │
          │ ◀── sync_request (force full drift sync) ──────── │
          │ ─── telemetry (batched RSSI/battery) ───────────▶ │
```

---

## 2. Gateway → Cloud Frames

### `hello`
Sent immediately upon WebSocket connection establishment. Announces gateway presence, firmware version, and full local tag inventory.
```json
{
  "type": "hello",
  "gatewayId": "gw-blr-01",
  "firmware": "v1.2.4",
  "tags": [
    {
      "tagId": "tag-001",
      "version": 41,
      "hash": "a1b2c3d4...",
      "battery": 92
    }
  ]
}
```

### `heartbeat`
Periodic liveness frame (e.g. every 15s). Refreshes Redis TTL key `gw:conn:{gatewayId}`.
```json
{
  "type": "heartbeat",
  "gatewayId": "gw-blr-01",
  "uptime": 86420,
  "connectedTagCount": 240
}
```

### `ack`
Confirms a render command successfully applied to a physical/simulated tag.
```json
{
  "type": "ack",
  "commandId": "cmd-xyz",
  "tagId": "tag-001",
  "appliedVersion": 42,
  "hash": "e5f6g7h8...",
  "battery": 91,
  "rssi": -65
}
```

### `nack`
Negative acknowledgement when a tag fails to render a command.
```json
{
  "type": "nack",
  "commandId": "cmd-xyz",
  "tagId": "tag-001",
  "reason": "STALE_VERSION"
}
```
**Nack Reasons:**
- `STALE_VERSION`: Incoming command version $\le$ tag applied version.
- `TAG_UNREACHABLE`: BLE transmission timed out / tag out of range.
- `LOW_BATTERY`: Tag battery below threshold (e.g. $< 15\%$) to safely complete e-ink write.
- `RENDER_FAIL`: CRC failure, corrupted payload, or driver error.

### `telemetry`
Batched background telemetry sent on a slow timer (e.g. every 10–30 mins).
```json
{
  "type": "telemetry",
  "gatewayId": "gw-blr-01",
  "readings": [
    { "tagId": "tag-001", "battery": 91, "rssi": -65 },
    { "tagId": "tag-002", "battery": 88, "rssi": -72 }
  ]
}
```

---

## 3. Cloud → Gateway Frames

### `render_batch`
The primary operational frame driving updates onto one or more tags assigned to this gateway.
```json
{
  "type": "render_batch",
  "commandId": "cmd-xyz",
  "targets": [
    {
      "tagId": "tag-001",
      "version": 42,
      "hash": "e5f6g7h8...",
      "payload": {
        "skuCode": "CAD-SILK-150",
        "name": "Cadbury Dairy Milk Silk 150g",
        "priceMinor": 17500,
        "mrpMinor": 19500,
        "promoBadge": "Save ₹20",
        "size": "T213"
      }
    }
  ]
}
```

### `sync_request`
Instructs the gateway to re-send its full inventory via a fresh `hello` frame.
```json
{
  "type": "sync_request"
}
```

### `config`
Allows dynamic runtime tuning of gateway limits without flashing firmware.
```json
{
  "type": "config",
  "heartbeatMs": 15000,
  "maxTagsPerSec": 50
}
```

---

## 4. State Invariants

1. **Strict Monotonic Ordering**:
   A tag only accepts `render_batch` target where `incomingVersion > currentVersion`.
   If `incomingVersion <= currentVersion`, the gateway MUST immediately respond with `nack(reason: "STALE_VERSION")`.

2. **Idempotent Acks**:
   The cloud records settlement on `CommandTarget(commandId, tagId)`. Duplicate ACKs are ignored safely.

3. **Payload Hash Match (Battery-Aware Skip)**:
   If `desiredHash == reportedHash`, the cloud skips radio transmission entirely, bumping `reportedVersion = desiredVersion` locally.
