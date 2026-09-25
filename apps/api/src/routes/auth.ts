import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'node:crypto';
import { db, Role } from '@quickshelf/db';
import { signJwt, verifyPassword, hashPassword } from '../auth/jwt.js';
import { authenticate, authorize, assertSupportConsent } from '../auth/rbac.js';

export async function registerAuthRoutes(app: FastifyInstance) {
  // ==========================================
  // 1. User Login (Email + Password)
  // ==========================================
  app.post('/api/auth/login', async (request, reply) => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(1),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues });
    }

    const { email, password } = parsed.data;

    const user = await db.user.findUnique({
      where: { email },
      include: {
        org: true,
        partner: true,
        store: true,
      },
    });

    if (!user || !user.active) {
      return reply.status(401).send({
        success: false,
        error: 'Invalid email credentials or inactive account.',
      });
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return reply.status(401).send({
        success: false,
        error: 'Invalid password credentials.',
      });
    }

    // 24-hour session
    const sessionTtl = 86400;
    const expiresAt = new Date(Date.now() + sessionTtl * 1000);

    const token = signJwt(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        orgId: user.orgId,
        partnerId: user.partnerId,
        storeId: user.storeId,
      },
      sessionTtl
    );

    await db.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    return reply.status(200).send({
      success: true,
      token,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organization: user.org ? { id: user.org.id, name: user.org.name, code: user.org.code } : null,
        partner: user.partner ? { id: user.partner.id, name: user.partner.name, code: user.partner.code } : null,
        store: user.store ? { id: user.store.id, name: user.store.name } : null,
      },
    });
  });

  // ==========================================
  // 2. Identity / Session Info (GET /api/auth/me)
  // ==========================================
  app.get(
    '/api/auth/me',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const authUser = request.user!;

      const user = await db.user.findUnique({
        where: { id: authUser.userId.replace('api-key:', '') },
        include: {
          org: true,
          partner: true,
          store: true,
        },
      });

      return reply.status(200).send({
        success: true,
        user: user
          ? {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              organization: user.org,
              partner: user.partner,
              store: user.store,
            }
          : authUser,
        claims: authUser,
      });
    }
  );

  // ==========================================
  // 3. Time-Bound Field Technician Token (SOW ACC-04)
  // ==========================================
  app.post(
    '/api/auth/technician-token',
    { preHandler: [authenticate, authorize([Role.SUPER_ADMIN, Role.PARTNER_ADMIN])] },
    async (request, reply) => {
      const schema = z.object({
        technicianUserId: z.string().min(1),
        storeId: z.string().min(1),
        jobId: z.string().min(1),
        durationHours: z.number().int().min(1).max(24).default(8),
      });

      const parsed = schema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ success: false, error: parsed.error.issues });
      }

      const { technicianUserId, storeId, jobId, durationHours } = parsed.data;

      const techUser = await db.user.findUnique({
        where: { id: technicianUserId },
      });

      if (!techUser || techUser.role !== Role.FIELD_TECHNICIAN) {
        return reply.status(404).send({
          success: false,
          error: `User ${technicianUserId} is not a registered FIELD_TECHNICIAN.`,
        });
      }

      const ttlSeconds = durationHours * 3600;
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

      const token = signJwt(
        {
          userId: techUser.id,
          email: techUser.email,
          name: techUser.name,
          role: Role.FIELD_TECHNICIAN,
          partnerId: techUser.partnerId,
          storeId,
          technicianJobId: jobId,
        },
        ttlSeconds
      );

      const session = await db.session.create({
        data: {
          userId: techUser.id,
          token,
          technicianJobId: jobId,
          expiresAt,
        },
      });

      return reply.status(201).send({
        success: true,
        message: `Issued time-bound technician token for job ${jobId} valid for ${durationHours} hours.`,
        token,
        jobId,
        expiresAt: expiresAt.toISOString(),
      });
    }
  );

  // ==========================================
  // 4. Support Consent Window (SOW ACC-05)
  // ==========================================
  app.post(
    '/api/auth/support-consent',
    { preHandler: [authenticate, authorize([Role.RETAIL_OWNER])] },
    async (request, reply) => {
      const schema = z.object({
        reason: z.string().min(5),
        durationHours: z.number().int().min(1).max(72).default(24),
        storeId: z.string().optional(),
      });

      const parsed = schema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ success: false, error: parsed.error.issues });
      }

      const { reason, durationHours, storeId } = parsed.data;
      const orgId = request.user!.orgId;

      if (!orgId) {
        return reply.status(400).send({ success: false, error: 'User does not belong to an organization.' });
      }

      const expiresAt = new Date(Date.now() + durationHours * 3600 * 1000);

      const consent = await db.supportConsent.create({
        data: {
          orgId,
          storeId: storeId ?? null,
          grantedByUserId: request.user!.userId,
          reason,
          expiresAt,
          active: true,
        },
      });

      return reply.status(201).send({
        success: true,
        message: `Granted Quickshelf Support Consent for ${durationHours} hours (SOW ACC-05).`,
        consent,
      });
    }
  );

  // List Active Support Consents
  app.get(
    '/api/auth/support-consents',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const user = request.user!;

      const consents = await db.supportConsent.findMany({
        where: {
          ...(user.role === Role.SUPER_ADMIN || user.role === Role.SUPPORT_ENGINEER
            ? {}
            : { orgId: user.orgId ?? undefined }),
          active: true,
          expiresAt: { gt: new Date() },
        },
        include: {
          org: true,
          grantedBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return reply.status(200).send({
        success: true,
        consents,
      });
    }
  );

  // ==========================================
  // 5. API Keys (For ERP / POS Integration)
  // ==========================================
  app.post(
    '/api/auth/api-keys',
    { preHandler: [authenticate, authorize([Role.SUPER_ADMIN, Role.RETAIL_OWNER])] },
    async (request, reply) => {
      const schema = z.object({
        name: z.string().min(1),
        orgId: z.string().optional(),
      });

      const parsed = schema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ success: false, error: parsed.error.issues });
      }

      const targetOrgId = parsed.data.orgId || request.user!.orgId;
      if (!targetOrgId) {
        return reply.status(400).send({ success: false, error: 'Target organization ID is required.' });
      }

      const keyPrefix = 'qs_live_';
      const randomSecret = crypto.randomBytes(24).toString('hex');
      const apiKeyString = `${keyPrefix}${randomSecret}`;

      const apiKey = await db.apiKey.create({
        data: {
          name: parsed.data.name,
          key: apiKeyString,
          orgId: targetOrgId,
        },
      });

      return reply.status(201).send({
        success: true,
        apiKey: {
          id: apiKey.id,
          name: apiKey.name,
          key: apiKey.key, // Only returned once on creation
          createdAt: apiKey.createdAt,
        },
      });
    }
  );
}
