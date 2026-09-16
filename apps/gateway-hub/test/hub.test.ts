import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { GatewayHubServer } from '../src/server.js';
import { InMemoryHubRedis } from '../src/redis.js';
import { VirtualGateway } from 'esl-sim';
import { VirtualTag } from 'esl-sim';
import type { RenderBatchFrame, AckFrame } from '@quickshelf/esl-protocol';

describe('Gateway Hub Integration', () => {
  const TEST_PORT = 8999;
  const redis = new InMemoryHubRedis();
  const server = new GatewayHubServer({
    port: TEST_PORT,
    host: '127.0.0.1',
    redis,
    replicaId: 'test-hub-01',
  });

  let gateway: VirtualGateway;

  before(async () => {
    await server.start();
  });

  after(async () => {
    if (gateway) gateway.stop();
    await server.stop();
  });

  it('should accept connection from simulator and receive hello frame', async () => {
    let helloReceived = false;

    await redis.subscribe('gw:events', (msg) => {
      const parsed = JSON.parse(msg);
      if (parsed.type === 'hello' && parsed.gatewayId === 'gw-test-01') {
        helloReceived = true;
      }
    });

    gateway = new VirtualGateway({
      gatewayId: 'gw-test-01',
      hubUrl: `ws://127.0.0.1:${TEST_PORT}`,
      heartbeatMs: 5000,
      simulatedLatencyMs: 0,
    });

    const tag1 = new VirtualTag({ tagId: 'tag-101', version: 0, battery: 90 });
    gateway.registerTag(tag1);
    gateway.start();

    // Wait for connection and hello handshake
    await new Promise((res) => setTimeout(res, 500));
    assert.equal(helloReceived, true, 'Hub should have received hello frame');
  });

  it('should forward render_batch command to simulator and receive ack', async () => {
    let ackReceived: AckFrame | null = null;

    await redis.subscribe('gw:settlement', (msg) => {
      const parsed = JSON.parse(msg);
      if (parsed.type === 'ack' && parsed.commandId === 'cmd-test-100') {
        ackReceived = parsed;
      }
    });

    // Publish outbound command via Redis channel
    const command: RenderBatchFrame = {
      type: 'render_batch',
      commandId: 'cmd-test-100',
      targets: [
        {
          tagId: 'tag-101',
          version: 1,
          hash: 'hash-version-1',
          payload: {
            skuCode: 'TEST-SKU',
            name: 'Test Item',
            priceMinor: 2500,
            mrpMinor: 2500,
            size: 'T213',
          },
        },
      ],
    };

    await redis.publishEvent('gw:dispatch:gw-test-01', JSON.stringify(command));

    // Wait for simulator to process and emit ack
    await new Promise((res) => setTimeout(res, 300));

    assert.ok(ackReceived, 'Ack should have been forwarded to Redis settlement');
    assert.equal(ackReceived?.commandId, 'cmd-test-100');
    assert.equal(ackReceived?.tagId, 'tag-101');
    assert.equal(ackReceived?.appliedVersion, 1);
  });
});
