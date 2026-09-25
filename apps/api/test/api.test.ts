import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';
import type { FastifyInstance } from 'fastify';
import { Role } from '@quickshelf/db';

describe('API Server & RBAC Endpoints', () => {
  let app: FastifyInstance;
  let ownerToken: string;
  let adminToken: string;
  let partnerAdminToken: string;

  before(async () => {
    app = await createServer();
    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  // ==========================================
  // Health & Core Smoke Tests
  // ==========================================
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

  // ==========================================
  // SOW §5 Auto-BOM Mathematical Calculator
  // ==========================================
  it('should calculate Auto-BOM hardware sizing matching SOW §5 formula', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/stores/bom-calculate',
      payload: {
        floorAreaSqFt: 10000,
        totalLabels: 2500,
        coveragePerGatewaySqFt: 2500,
        capacityPerGateway: 3000,
        headroomFactor: 0.7,
      },
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    // gatewaysByArea = ceil(10000 / 2500) = 4
    // effectiveCapacity = 3000 * 0.7 = 2100; gatewaysByCapacity = ceil(2500 / 2100) = 2
    // base = max(4, 2) = 4. totalLabels > 1500 => +1 failover gateway => 5 total
    assert.equal(body.results.gatewaysByArea, 4);
    assert.equal(body.results.gatewaysByCapacity, 2);
    assert.equal(body.results.baseGatewaysNeeded, 4);
    assert.equal(body.results.extraGatewayForFailover, 1);
    assert.equal(body.results.totalGatewaysRecommended, 5);
  });

  // ==========================================
  // Commercial Guardrail: PRC-04 (Price > MRP)
  // ==========================================
  it('should enforce PRC-04: reject SKU creation when price exceeds MRP', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/skus',
      payload: {
        storeId: 'store-blr-koramangala',
        code: 'TEST-GUARDRAIL-SKU',
        name: 'Guardrail Test Product',
        priceMinor: 25000, // ₹250.00
        mrpMinor: 20000,   // ₹200.00 (Selling price exceeds MRP!)
      },
    });
    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.body);
    assert.equal(body.success, false);
    assert.ok(body.error.includes('Commercial Guardrail Violation (PRC-04)'));
  });

  // ==========================================
  // SOW Section 4: RBAC & Authentication
  // ==========================================
  it('should reject login with invalid password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'owner@moreretail.in',
        password: 'WrongPassword!123',
      },
    });
    assert.equal(res.statusCode, 401);
  });

  it('should authenticate RETAIL_OWNER and return JWT token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'owner@moreretail.in',
        password: 'Quickshelf@2026',
      },
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.ok(body.token);
    assert.equal(body.user.role, Role.RETAIL_OWNER);
    assert.equal(body.user.organization.code, 'MORE-RET');
    ownerToken = body.token;
  });

  it('should authenticate SUPER_ADMIN', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'admin@quickshelf.io',
        password: 'Quickshelf@2026',
      },
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.user.role, Role.SUPER_ADMIN);
    adminToken = body.token;
  });

  it('should authenticate PARTNER_ADMIN', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'partner.lead@apextech.in',
        password: 'Quickshelf@2026',
      },
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.user.role, Role.PARTNER_ADMIN);
    partnerAdminToken = body.token;
  });

  it('should return session claims on GET /api/auth/me', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.equal(body.user.email, 'owner@moreretail.in');
    assert.equal(body.user.role, Role.RETAIL_OWNER);
  });

  it('should reject unauthenticated access to /api/auth/me', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
    });
    assert.equal(res.statusCode, 401);
  });

  // SOW ACC-04: Time-Bound Technician Token
  it('should allow PARTNER_ADMIN to issue time-bound technician token (SOW ACC-04)', async () => {
    // Look up technician user id
    const meRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'tech.ramesh@apextech.in',
        password: 'Quickshelf@2026',
      },
    });
    const techUser = JSON.parse(meRes.body).user;

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/technician-token',
      headers: {
        Authorization: `Bearer ${partnerAdminToken}`,
      },
      payload: {
        technicianUserId: techUser.id,
        storeId: 'store-blr-koramangala',
        jobId: 'JOB-2026-BLR-001',
        durationHours: 8,
      },
    });
    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.ok(body.token);
    assert.equal(body.jobId, 'JOB-2026-BLR-001');
  });

  // SOW ACC-05: Support Consent Window
  it('should allow RETAIL_OWNER to grant temporary Support Consent (SOW ACC-05)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/support-consent',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
      payload: {
        reason: 'Investigate gateway sync latency during evening peak',
        durationHours: 24,
      },
    });
    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.equal(body.consent.active, true);
  });

  it('should list active Support Consents on GET /api/auth/support-consents', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/support-consents',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.ok(body.consents.length >= 1);
  });

  // POS / ERP API Key Generation
  it('should allow RETAIL_OWNER to generate a POS ERP API Key', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/api-keys',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
      payload: {
        name: 'Oracle NetSuite POS Sync',
      },
    });
    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.ok(body.apiKey.key.startsWith('qs_live_'));
  });

  // Fleet & Store Core API
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

  // ==========================================
  // SOW §6 & §8 Store Onboarding Pipeline Tests
  // ==========================================
  it('should retrieve store layout hierarchy on GET /api/onboarding/:storeId/hierarchy', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/onboarding/store-blr-koramangala/hierarchy',
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.equal(body.store.id, 'store-blr-koramangala');
    assert.ok(Array.isArray(body.store.zones));
  });

  it('should batch configure layout hierarchy on POST /api/onboarding/:storeId/hierarchy (STR-03)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/onboarding/store-blr-koramangala/hierarchy',
      payload: {
        zones: [
          {
            code: 'Z-FRESH',
            name: 'Fresh Produce & Fruits',
            aisles: [
              {
                code: 'A-FRESH-1',
                name: 'Organic Fruits & Greens',
                baysCount: 3,
                shelvesPerBay: 3,
              },
            ],
          },
        ],
      },
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.ok(body.hierarchySummary.length >= 1);
  });

  it('should run Stage 8 RF burst stress test simulation', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/onboarding/store-blr-koramangala/stress-test',
      payload: {
        targetBurstCount: 200,
        targetThroughputTagsPerSec: 50,
      },
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.equal(body.benchmark.meetsSowRequirement, true);
    assert.ok(body.benchmark.packetSuccessRatePct >= 99);
  });

  it('should execute Stage 9 digital sign-off and issue Commissioning Certificate', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/onboarding/store-blr-koramangala/signoff',
      payload: {
        installerName: 'Ramesh Kumar',
        installerCompany: 'Apex Field Services Pvt Ltd',
        retailManagerName: 'Anand Verma',
        notes: 'Full store commissioned with 0% blind spots.',
      },
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.ok(body.certificate.certificateId.startsWith('CERT-ONB-'));
    assert.equal(body.certificate.status, 'ACTIVE_LIVE');
    assert.ok(body.certificate.installerSignoff.digitalFingerprint.startsWith('sha256:'));
  });
});
