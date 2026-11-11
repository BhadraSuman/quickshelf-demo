import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';
import type { FastifyInstance } from 'fastify';

describe('Zero-Trust Security & Unauthorized Access Lock', () => {
  let app: FastifyInstance;
  let validToken: string;

  before(async () => {
    app = await createServer();
    await app.ready();

    // Login with seeded admin account to obtain valid JWT token
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'admin@quickshelf.io',
        password: 'Quickshelf@2026',
      },
    });

    assert.equal(loginRes.statusCode, 200);
    const body = JSON.parse(loginRes.payload);
    assert.ok(body.token, 'Expected login to return valid JWT token');
    validToken = body.token;
  });

  it('should allow public access to /api/health without authentication', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/health',
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.status, 'healthy');
  });

  it('should REJECT unauthenticated access with 401 when calling protected endpoint /api/auth/me', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
    });
    assert.equal(res.statusCode, 401);
  });

  it('should REJECT invalid or tampered JWT token with 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: {
        authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
      },
    });
    assert.equal(res.statusCode, 401);
  });

  it('should ALLOW access to protected endpoint when providing valid Bearer token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: {
        authorization: `Bearer ${validToken}`,
      },
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.user.email, 'admin@quickshelf.io');
  });
});
