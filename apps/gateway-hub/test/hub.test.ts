import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { GatewayHubServer } from '../src/server.js';
import { InMemoryHubRedis } from '../src/redis.js';
import type { HelloFrame, AckFrame, RenderBatchFrame } from '@quickshelf/esl-protocol';

describe('Gateway Hub Integration', () => {
  const TEST_PORT = 8999;
  const redis = new InMemoryHubRedis();
  const server = new GatewayHubServer({
    port: TEST_PORT,
    host: '127.0.0.1',
    redis,
    replicaId: 'test-hub-01',
  });

  let ws: WebSocket;

  before(async () => {
    await server.start();
  });

  after(async () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
    await server.stop();
  });

  it('should accept connection from gateway client and receive hello frame', async () => {
    let helloReceived = false;

    await redis.subscribe('gw:events', (msg) => {
      const parsed = JSON.parse(msg);
      if (parsed.type === 'hello' && parsed.gatewayId === 'gw-test-01') {
        helloReceived = true;
      }
    });

    ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT}`);

    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => {
        const hello: HelloFrame = {
          type: 'hello',
          gatewayId: 'gw-test-01',
          firmware: 'v1.0.0-test',
          tags: [
            {
              tagId: 'tag-101',
              version: 0,
              hash: 'hash-0',
              battery: 90,
            },
          ],
        };
        ws.send(JSON.stringify(hello));
        resolve();
      });
      ws.on('error', reject);
    });

    // Wait for event routing to Redis
    await new Promise((res) => setTimeout(res, 500));
    assert.equal(helloReceived, true, 'Hub should have received hello frame');
  });

  it('should forward render_batch command to gateway and receive ack', async () => {
    let ackReceived: AckFrame | null = null;

    await redis.subscribe('gw:settlement', (msg) => {
      const parsed = JSON.parse(msg);
      if (parsed.type === 'ack' && parsed.commandId === 'cmd-test-100') {
        ackReceived = parsed;
      }
    });

    // Setup client listener to respond with ACK when command received
    ws.on('message', (data) => {
      const cmd = JSON.parse(data.toString());
      if (cmd.type === 'render_batch') {
        const ack: AckFrame = {
          type: 'ack',
          commandId: cmd.commandId,
          tagId: cmd.targets[0].tagId,
          appliedVersion: cmd.targets[0].version,
          hash: cmd.targets[0].hash,
          battery: 90,
          rssi: -65,
        };
        ws.send(JSON.stringify(ack));
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

    // Wait for client to process and emit ack
    await new Promise((res) => setTimeout(res, 400));

    assert.ok(ackReceived, 'Ack should have been forwarded to Redis settlement');
    assert.equal(ackReceived?.commandId, 'cmd-test-100');
    assert.equal(ackReceived?.tagId, 'tag-101');
    assert.equal(ackReceived?.appliedVersion, 1);
  });
});
