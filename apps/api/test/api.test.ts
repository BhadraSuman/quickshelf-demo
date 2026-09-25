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

  it('should return 200 on /api/fleet/status', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/fleet/status',
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.ok(typeof body.totalTags === 'number');
    assert.ok(typeof body.divergedTags === 'number');
  });

  it('should return 200 on /api/stores', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/stores',
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.ok(Array.isArray(body));
  });

  it('should return 200 on /api/gateways', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/gateways',
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.ok(Array.isArray(body));
  });

  it('should return 200 on /api/tags', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/tags',
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.ok(Array.isArray(body));
  });

  it('should return 200 on /api/skus', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/skus',
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.ok(Array.isArray(body));
  });

  it('should return 200 on /api/audit', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/audit',
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.ok(Array.isArray(body));
  });

  it('should return 200 on /api/chaos/metrics', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/chaos/metrics',
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.ok(typeof body.totalCommands === 'number');
  });
});
