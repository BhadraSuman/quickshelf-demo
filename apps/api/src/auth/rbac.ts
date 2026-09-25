import type { FastifyRequest, FastifyReply } from 'fastify';
import { Role, db } from '@quickshelf/db';
import { verifyJwt, type AuthUserTokenPayload } from './jwt.js';

// Extend FastifyRequest type
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUserTokenPayload;
  }
}

// SOW Section 4 Permissions Matrix
export const PLATFORM_ROLES: Role[] = [
  Role.SUPER_ADMIN,
  Role.OPERATIONS_MANAGER,
  Role.SUPPORT_ENGINEER,
  Role.FIRMWARE_ENGINEER,
  Role.VIEWER,
];

export const PARTNER_ROLES: Role[] = [
  Role.PARTNER_ADMIN,
  Role.FIELD_TECHNICIAN,
];

export const RETAILER_ROLES: Role[] = [
  Role.RETAIL_OWNER,
  Role.PRICING_MANAGER,
  Role.STORE_MANAGER,
  Role.STORE_STAFF,
];

export const PRICE_WRITE_ROLES: Role[] = [
  Role.SUPER_ADMIN,
  Role.RETAIL_OWNER,
  Role.PRICING_MANAGER,
];

export const STORE_MANAGE_ROLES: Role[] = [
  Role.SUPER_ADMIN,
  Role.OPERATIONS_MANAGER,
  Role.PARTNER_ADMIN,
  Role.RETAIL_OWNER,
  Role.STORE_MANAGER,
];

/**
 * Authentication Hook:
 * Extracts Bearer JWT or x-api-key header and validates identity.
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  const apiKeyHeader = request.headers['x-api-key'] as string | undefined;

  // 1. API Key Authentication (e.g. POS systems / ERP webhooks)
  if (apiKeyHeader) {
    const apiKey = await db.apiKey.findUnique({
      where: { key: apiKeyHeader },
      include: { org: true },
    });

    if (!apiKey) {
      return reply.status(401).send({
        success: false,
        error: 'Invalid or revoked x-api-key.',
      });
    }

    // Update last used timestamp asynchronously
    db.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {});

    request.user = {
      userId: `api-key:${apiKey.id}`,
      email: apiKey.org.technicalContactEmail || `erp@${apiKey.org.code.toLowerCase()}.com`,
      name: apiKey.name,
      role: Role.RETAIL_OWNER, // POS API Key operates with retail owner privileges for price sync
      orgId: apiKey.orgId,
      exp: Math.floor(Date.now() / 1000) + 86400,
      iat: Math.floor(Date.now() / 1000),
    };
    return;
  }

  // 2. Bearer JWT Authentication
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({
      success: false,
      error: 'Missing or malformed Authorization header. Expected: Bearer <token>',
    });
  }

  const token = authHeader.substring(7).trim();
  const payload = verifyJwt(token);

  if (!payload) {
    return reply.status(401).send({
      success: false,
      error: 'Invalid or expired session token.',
    });
  }

  // SOW ACC-04: Time-bound Field Technician Verification
  if (payload.role === Role.FIELD_TECHNICIAN && payload.technicianJobId) {
    const session = await db.session.findFirst({
      where: {
        token,
        technicianJobId: payload.technicianJobId,
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      return reply.status(403).send({
        success: false,
        error: 'Technician access expired or job has been closed (SOW ACC-04).',
      });
    }
  }

  request.user = payload;
}

/**
 * Authorization Guard:
 * Asserts request user holds one of the required roles.
 */
export function authorize(allowedRoles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized: No active identity.',
      });
    }

    // Super Admin has global override
    if (request.user.role === Role.SUPER_ADMIN) {
      return;
    }

    if (!allowedRoles.includes(request.user.role)) {
      return reply.status(403).send({
        success: false,
        error: `Forbidden: Role '${request.user.role}' lacks sufficient privileges. Required: [${allowedRoles.join(', ')}]`,
      });
    }
  };
}

/**
 * SOW ACC-05: Support Consent Guard
 * Ensures Quickshelf platform operators (e.g. SUPPORT_ENGINEER, OPERATIONS_MANAGER)
 * cannot modify or access sensitive retailer data unless granted an active SupportConsent window.
 */
export async function assertSupportConsent(request: FastifyRequest, reply: FastifyReply, orgId: string) {
  if (!request.user) {
    return reply.status(401).send({ success: false, error: 'Unauthorized.' });
  }

  // Retailer org members always have access to their own org
  if (request.user.orgId === orgId) {
    return;
  }

  // Super Admin has global break-glass
  if (request.user.role === Role.SUPER_ADMIN) {
    return;
  }

  // For platform support/ops, check if active consent window exists
  const activeConsent = await db.supportConsent.findFirst({
    where: {
      orgId,
      active: true,
      expiresAt: { gt: new Date() },
    },
  });

  if (!activeConsent) {
    return reply.status(403).send({
      success: false,
      error: `Access Denied (SOW ACC-05): Retailer ${orgId} has not granted an active Support Consent Window.`,
    });
  }
}
