import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseWireFrame,
  parseGatewayToCloudFrame,
  parseCloudToGatewayFrame,
  computePayloadHash,
  type TagRenderPayload,
} from '../src/index.js';

describe('Protocol Validation', () => {
  it('should parse valid hello frame', () => {
    const raw = {
      type: 'hello',
      gatewayId: 'gw-blr-01',
      firmware: 'v1.2.4',
      tags: [
        {
          tagId: 'tag-001',
          version: 41,
          hash: 'a1b2c3d4e5f6',
          battery: 92,
        },
      ],
    };
    const parsed = parseGatewayToCloudFrame(raw);
    assert.equal(parsed.type, 'hello');
    if (parsed.type === 'hello') {
      assert.equal(parsed.gatewayId, 'gw-blr-01');
      assert.equal(parsed.tags.length, 1);
    }
  });

  it('should reject price with floats (minor units required)', () => {
    const raw = {
      type: 'render_batch',
      commandId: 'cmd-1',
      targets: [
        {
          tagId: 'tag-001',
          version: 1,
          hash: 'abc',
          payload: {
            skuCode: 'SKU-1',
            name: 'Item',
            priceMinor: 10.99, // INVALID: Must be integer
            mrpMinor: 1200,
            size: 'T213',
          },
        },
      ],
    };
    assert.throws(() => parseCloudToGatewayFrame(raw));
  });

  it('should parse valid render_batch and ack frames', () => {
    const renderBatch = {
      type: 'render_batch',
      commandId: 'cmd-100',
      targets: [
        {
          tagId: 'tag-001',
          version: 42,
          hash: 'hash-val',
          payload: {
            skuCode: 'CAD-SILK-150',
            name: 'Cadbury Dairy Milk Silk 150g',
            priceMinor: 17500,
            mrpMinor: 19500,
            promoBadge: 'Save ₹20',
            size: 'T213',
          },
        },
      ],
    };
    const parsedBatch = parseCloudToGatewayFrame(renderBatch);
    assert.equal(parsedBatch.type, 'render_batch');

    const ack = {
      type: 'ack',
      commandId: 'cmd-100',
      tagId: 'tag-001',
      appliedVersion: 42,
      hash: 'hash-val',
      battery: 95,
      rssi: -62,
    };
    const parsedAck = parseGatewayToCloudFrame(ack);
    assert.equal(parsedAck.type, 'ack');
  });

  it('should parse valid nack frame with valid reason', () => {
    const nack = {
      type: 'nack',
      commandId: 'cmd-100',
      tagId: 'tag-001',
      reason: 'STALE_VERSION',
    };
    const parsed = parseGatewayToCloudFrame(nack);
    assert.equal(parsed.type, 'nack');
  });

  it('should reject nack with invalid reason', () => {
    const invalidNack = {
      type: 'nack',
      commandId: 'cmd-100',
      tagId: 'tag-001',
      reason: 'RANDOM_ERROR',
    };
    assert.throws(() => parseGatewayToCloudFrame(invalidNack));
  });

  it('should compute deterministic SHA-256 hash irrespective of property key order', () => {
    const p1: TagRenderPayload = {
      skuCode: 'SKU-A',
      name: 'Product A',
      priceMinor: 500,
      mrpMinor: 600,
      promoBadge: 'Sale',
      size: 'T290',
    };
    const p2: TagRenderPayload = {
      size: 'T290',
      name: 'Product A',
      promoBadge: 'Sale',
      mrpMinor: 600,
      priceMinor: 500,
      skuCode: 'SKU-A',
    };
    assert.equal(computePayloadHash(p1), computePayloadHash(p2));
  });
});
