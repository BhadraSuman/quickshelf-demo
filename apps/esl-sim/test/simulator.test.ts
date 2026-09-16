import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { VirtualTag } from '../src/tag.js';
import type { TagRenderPayload } from '@quickshelf/esl-protocol';

describe('Virtual Tag Mechanics', () => {
  const samplePayload: TagRenderPayload = {
    skuCode: 'TEST-SKU',
    name: 'Test Item',
    priceMinor: 1000,
    mrpMinor: 1200,
    size: 'T213',
  };

  it('should successfully apply render and advance version', async () => {
    const tag = new VirtualTag({ tagId: 'tag-001', version: 1, battery: 90 });
    const result = await tag.applyRender('cmd-1', 2, 'new-hash', samplePayload, 0);

    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.ack.commandId, 'cmd-1');
      assert.equal(result.ack.appliedVersion, 2);
      assert.equal(result.ack.hash, 'new-hash');
    }
    assert.equal(tag.version, 2);
    assert.equal(tag.hash, 'new-hash');
  });

  it('should reject stale or equal version with STALE_VERSION', async () => {
    const tag = new VirtualTag({ tagId: 'tag-002', version: 5 });
    // Same version
    const resultEqual = await tag.applyRender('cmd-2', 5, 'hash-5', samplePayload, 0);
    assert.equal(resultEqual.success, false);
    if (!resultEqual.success) {
      assert.equal(resultEqual.nack.reason, 'STALE_VERSION');
    }

    // Older version
    const resultOlder = await tag.applyRender('cmd-3', 4, 'hash-4', samplePayload, 0);
    assert.equal(resultOlder.success, false);
    if (!resultOlder.success) {
      assert.equal(resultOlder.nack.reason, 'STALE_VERSION');
    }
  });

  it('should reject render if battery is below 15%', async () => {
    const tag = new VirtualTag({ tagId: 'tag-003', version: 1, battery: 14 });
    const result = await tag.applyRender('cmd-4', 2, 'hash-2', samplePayload, 0);

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.nack.reason, 'LOW_BATTERY');
    }
  });

  it('should reject render if marked unreachable', async () => {
    const tag = new VirtualTag({ tagId: 'tag-004', version: 1 });
    tag.unreachable = true;
    const result = await tag.applyRender('cmd-5', 2, 'hash-2', samplePayload, 0);

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.nack.reason, 'TAG_UNREACHABLE');
    }
  });

  it('should reject render if forceRenderFail is enabled', async () => {
    const tag = new VirtualTag({ tagId: 'tag-005', version: 1 });
    tag.forceRenderFail = true;
    const result = await tag.applyRender('cmd-6', 2, 'hash-2', samplePayload, 0);

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.nack.reason, 'RENDER_FAIL');
    }
  });

  it('should serialize tag state to hello inventory format', () => {
    const tag = new VirtualTag({
      tagId: 'tag-006',
      version: 10,
      hash: 'sample-hash',
      battery: 88,
    });
    const inv = tag.toInventory();
    assert.deepEqual(inv, {
      tagId: 'tag-006',
      version: 10,
      hash: 'sample-hash',
      battery: 88,
    });
  });
});
