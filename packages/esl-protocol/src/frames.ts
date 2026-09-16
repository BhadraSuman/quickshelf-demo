/**
 * Wire Protocol Specification: Quickshelf Gateway Wire Protocol
 * Version: 0.1.0
 */

export type TagSize = 'T154' | 'T213' | 'T290' | 'T420' | 'T750' | 'T1020';

export type NackReason =
  | 'STALE_VERSION'
  | 'TAG_UNREACHABLE'
  | 'LOW_BATTERY'
  | 'RENDER_FAIL';

export interface TagRenderPayload {
  skuCode: string;
  name: string;
  priceMinor: number; // Integer paise/cents, never float
  mrpMinor: number;
  promoBadge?: string | null;
  size: TagSize;
}

export interface HelloTagInventory {
  tagId: string;
  version: number;
  hash: string;
  battery: number;
}

export interface TelemetryReading {
  tagId: string;
  battery: number;
  rssi: number;
}

export interface RenderBatchTarget {
  tagId: string;
  version: number;
  hash: string;
  payload: TagRenderPayload;
}

// Gateway -> Cloud Frames
export interface HelloFrame {
  type: 'hello';
  gatewayId: string;
  firmware: string;
  tags: HelloTagInventory[];
}

export interface HeartbeatFrame {
  type: 'heartbeat';
  gatewayId: string;
  uptime: number;
  connectedTagCount: number;
}

export interface AckFrame {
  type: 'ack';
  commandId: string;
  tagId: string;
  appliedVersion: number;
  hash: string;
  battery: number;
  rssi: number;
}

export interface NackFrame {
  type: 'nack';
  commandId: string;
  tagId: string;
  reason: NackReason;
}

export interface TelemetryFrame {
  type: 'telemetry';
  gatewayId: string;
  readings: TelemetryReading[];
}

// Cloud -> Gateway Frames
export interface RenderBatchFrame {
  type: 'render_batch';
  commandId: string;
  targets: RenderBatchTarget[];
}

export interface SyncRequestFrame {
  type: 'sync_request';
}

export interface ConfigFrame {
  type: 'config';
  heartbeatMs?: number;
  maxTagsPerSec?: number;
}

export type GatewayToCloudFrame =
  | HelloFrame
  | HeartbeatFrame
  | AckFrame
  | NackFrame
  | TelemetryFrame;

export type CloudToGatewayFrame =
  | RenderBatchFrame
  | SyncRequestFrame
  | ConfigFrame;

export type WireFrame = GatewayToCloudFrame | CloudToGatewayFrame;
