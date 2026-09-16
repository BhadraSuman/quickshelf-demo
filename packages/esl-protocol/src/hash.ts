import { createHash } from 'node:crypto';
import type { TagRenderPayload } from './frames.js';

/**
 * Computes a deterministic SHA-256 hash of a TagRenderPayload.
 * Keys are canonically sorted so key order never influences the hash.
 */
export function computePayloadHash(payload: TagRenderPayload): string {
  const canonical = {
    mrpMinor: payload.mrpMinor,
    name: payload.name,
    priceMinor: payload.priceMinor,
    promoBadge: payload.promoBadge ?? null,
    size: payload.size,
    skuCode: payload.skuCode,
  };

  const json = JSON.stringify(canonical);
  return createHash('sha256').update(json).digest('hex');
}
