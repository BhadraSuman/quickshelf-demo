import { z } from 'zod';

export const TagSizeSchema = z.enum([
  'T154',
  'T213',
  'T290',
  'T420',
  'T750',
  'T1020',
]);

export const NackReasonSchema = z.enum([
  'STALE_VERSION',
  'TAG_UNREACHABLE',
  'LOW_BATTERY',
  'RENDER_FAIL',
]);

export const TagRenderPayloadSchema = z.object({
  skuCode: z.string().min(1),
  name: z.string().min(1),
  priceMinor: z.number().int().nonnegative(),
  mrpMinor: z.number().int().nonnegative(),
  promoBadge: z.string().nullable().optional(),
  size: TagSizeSchema,
});

export const HelloTagInventorySchema = z.object({
  tagId: z.string().min(1),
  version: z.number().int().nonnegative(),
  hash: z.string().min(1),
  battery: z.number().int().min(0).max(100),
});

export const TelemetryReadingSchema = z.object({
  tagId: z.string().min(1),
  battery: z.number().int().min(0).max(100),
  rssi: z.number().int(),
});

export const RenderBatchTargetSchema = z.object({
  tagId: z.string().min(1),
  version: z.number().int().positive(),
  hash: z.string().min(1),
  payload: TagRenderPayloadSchema,
});

// Gateway -> Cloud Schemas
export const HelloFrameSchema = z.object({
  type: z.literal('hello'),
  gatewayId: z.string().min(1),
  firmware: z.string().min(1),
  tags: z.array(HelloTagInventorySchema),
});

export const HeartbeatFrameSchema = z.object({
  type: z.literal('heartbeat'),
  gatewayId: z.string().min(1),
  uptime: z.number().int().nonnegative(),
  connectedTagCount: z.number().int().nonnegative(),
});

export const AckFrameSchema = z.object({
  type: z.literal('ack'),
  commandId: z.string().min(1),
  tagId: z.string().min(1),
  appliedVersion: z.number().int().positive(),
  hash: z.string().min(1),
  battery: z.number().int().min(0).max(100),
  rssi: z.number().int(),
});

export const NackFrameSchema = z.object({
  type: z.literal('nack'),
  commandId: z.string().min(1),
  tagId: z.string().min(1),
  reason: NackReasonSchema,
});

export const TelemetryFrameSchema = z.object({
  type: z.literal('telemetry'),
  gatewayId: z.string().min(1),
  readings: z.array(TelemetryReadingSchema),
});

export const GatewayToCloudFrameSchema = z.discriminatedUnion('type', [
  HelloFrameSchema,
  HeartbeatFrameSchema,
  AckFrameSchema,
  NackFrameSchema,
  TelemetryFrameSchema,
]);

// Cloud -> Gateway Schemas
export const RenderBatchFrameSchema = z.object({
  type: z.literal('render_batch'),
  commandId: z.string().min(1),
  targets: z.array(RenderBatchTargetSchema).min(1),
});

export const SyncRequestFrameSchema = z.object({
  type: z.literal('sync_request'),
});

export const ConfigFrameSchema = z.object({
  type: z.literal('config'),
  heartbeatMs: z.number().int().positive().optional(),
  maxTagsPerSec: z.number().int().positive().optional(),
});

export const CloudToGatewayFrameSchema = z.discriminatedUnion('type', [
  RenderBatchFrameSchema,
  SyncRequestFrameSchema,
  ConfigFrameSchema,
]);

export const WireFrameSchema = z.discriminatedUnion('type', [
  HelloFrameSchema,
  HeartbeatFrameSchema,
  AckFrameSchema,
  NackFrameSchema,
  TelemetryFrameSchema,
  RenderBatchFrameSchema,
  SyncRequestFrameSchema,
  ConfigFrameSchema,
]);

export function parseWireFrame(raw: string | unknown) {
  const json = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return WireFrameSchema.parse(json);
}

export function parseGatewayToCloudFrame(raw: string | unknown) {
  const json = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return GatewayToCloudFrameSchema.parse(json);
}

export function parseCloudToGatewayFrame(raw: string | unknown) {
  const json = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return CloudToGatewayFrameSchema.parse(json);
}
