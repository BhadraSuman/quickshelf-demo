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

  // Get currently diverged tags
  app.get('/api/tags/diverged', async () => {
    const diverged = await db.tag.findMany({
      where: {
        desiredVersion: {
          gt: db.tag.fields.reportedVersion,
        },
      },
      include: {
        gateway: true,
        sku: true,
      },
    });

    return {
      count: diverged.length,
      tags: diverged.map((t) => ({
        tagId: t.hardwareId,
        gatewayId: t.gateway.hardwareId,
        skuCode: t.sku?.code,
        desiredVersion: t.desiredVersion,
        reportedVersion: t.reportedVersion,
        divergenceDelta: t.desiredVersion - t.reportedVersion,
      })),
    };
  });
}
