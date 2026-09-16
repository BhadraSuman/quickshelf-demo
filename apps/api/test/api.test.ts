import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';
import type { FastifyInstance } from 'fastify';

describe('API Server Endpoints', () => {
  let app: FastifyInstance;

  before(async () => {
    app = await createServer();
    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  it('should return 200 healthy on /health', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.status, 'healthy');
  });

  it('should reject invalid POS webhook payload', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/pos',
      payload: {
        storeId: 'store-1',
        skuCode: 'SKU-1',
        newPriceMinor: 19.99, // INVALID: Minor units must be integer
      },
    });
    assert.equal(res.statusCode, 400);
  });
});
