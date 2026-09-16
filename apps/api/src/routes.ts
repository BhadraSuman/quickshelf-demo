import type { FastifyInstance } from 'fastify';
import { db } from '@quickshelf/db';
import { PosPriceUpdateSchema, processPosPriceUpdate } from './webhook.js';

export async function registerRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    return { status: 'healthy', timestamp: new Date().toISOString() };
  });

  // POS Webhook Ingestion
  app.post('/webhooks/pos', async (request, reply) => {
    try {
      const parsed = PosPriceUpdateSchema.parse(request.body);
      const result = await processPosPriceUpdate(parsed);
      return reply.status(200).send({ success: true, ...result });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(400).send({
        success: false,
        error: err.message ?? 'Invalid request payload',
      });
    }
  });

  // Fleet & Divergence Metrics
  app.get('/api/fleet/status', async () => {
    const [storeCount, gatewayCount, totalTags, divergedTags] = await Promise.all([
      db.store.count(),
      db.gateway.count(),
      db.tag.count(),
      db.tag.count({
        where: {
          desiredVersion: {
            gt: db.tag.fields.reportedVersion,
          },
        },
      }),
    ]);

    return {
      storeCount,
      gatewayCount,
      totalTags,
      divergedTags,
      convergedTags: totalTags - divergedTags,
      convergencePct: totalTags > 0 ? ((totalTags - divergedTags) / totalTags) * 100 : 100,
    };
  });

  // All Tags with current e-ink state
  app.get('/api/tags', async () => {
    const tags = await db.tag.findMany({
      include: {
        gateway: true,
        sku: true,
      },
      orderBy: { hardwareId: 'asc' },
    });

    return tags.map((t) => {
      const isDiverged = t.desiredVersion > t.reportedVersion;
      return {
        id: t.id,
        hardwareId: t.hardwareId,
        size: t.size,
        gatewayHardwareId: t.gateway.hardwareId,
        gatewayStatus: t.gateway.status,
        sku: t.sku ? {
          id: t.sku.id,
          code: t.sku.code,
          name: t.sku.name,
          priceMinor: t.sku.priceMinor,
          mrpMinor: t.sku.mrpMinor,
          promoBadge: t.sku.promoBadge,
          version: t.sku.version,
        } : null,
        desiredVersion: t.desiredVersion,
        desiredPayload: t.desiredPayload,
        reportedVersion: t.reportedVersion,
        reportedAt: t.reportedAt,
        batteryPct: t.batteryPct ?? 95,
        rssi: t.rssi ?? -65,
        isDiverged,
        divergenceDelta: Math.max(0, t.desiredVersion - t.reportedVersion),
      };
    });
  });

  // List SKUs
  app.get('/api/skus', async () => {
    return await db.sku.findMany({
      orderBy: { code: 'asc' },
    });
  });

  // Quick Flash Sale Trigger (Bulk discount)
  app.post('/api/pos/flash-sale', async (request, reply) => {
    const body = (request.body as any) || {};
    const discountPct = Number(body.discountPct ?? 15);
    const promoBadge = body.promoBadge ?? `Flash Sale ${discountPct}% OFF`;

    const skus = await db.sku.findMany();
    const updated = [];

    for (const sku of skus) {
      const discountedPrice = Math.round(sku.mrpMinor * (1 - discountPct / 100));
      const res = await processPosPriceUpdate({
        storeId: sku.storeId,
        skuCode: sku.code,
        newPriceMinor: discountedPrice,
        mrpMinor: sku.mrpMinor,
        promoBadge,
        source: 'promo',
      });
      updated.push(res);
    }

    return reply.status(200).send({
      success: true,
      message: `Triggered flash sale on ${updated.length} SKUs`,
      updated,
    });
  });

  // Reset Prices to default
  app.post('/api/pos/reset-prices', async (_request, reply) => {
    const skus = await db.sku.findMany();
    const updated = [];

    for (const sku of skus) {
      const res = await processPosPriceUpdate({
        storeId: sku.storeId,
        skuCode: sku.code,
        newPriceMinor: sku.mrpMinor,
        mrpMinor: sku.mrpMinor,
        promoBadge: null,
        source: 'manual',
      });
      updated.push(res);
    }

    return reply.status(200).send({
      success: true,
      message: `Reset prices on ${updated.length} SKUs`,
      updated,
    });
  });
}
