import type { FastifyInstance } from 'fastify';
import { db, TargetStatus, CommandStatus } from '@quickshelf/db';
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
        sku: t.sku
          ? {
              id: t.sku.id,
              code: t.sku.code,
              name: t.sku.name,
              priceMinor: t.sku.priceMinor,
              mrpMinor: t.sku.mrpMinor,
              promoBadge: t.sku.promoBadge,
              version: t.sku.version,
            }
          : null,
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

  // ==========================================
  // Chaos & 7 Hard Problems Endpoints
  // ==========================================

  // Chaos Metrics: Counts of Settled, Superseded, and Failed Command Targets
  app.get('/api/chaos/metrics', async () => {
    const [totalCommands, settledCommands, ackedTargets, supersededTargets, failedTargets] =
      await Promise.all([
        db.command.count(),
        db.command.count({ where: { status: CommandStatus.SETTLED } }),
        db.commandTarget.count({ where: { status: TargetStatus.ACKED } }),
        db.commandTarget.count({ where: { status: TargetStatus.SUPERSEDED } }),
        db.commandTarget.count({ where: { status: TargetStatus.FAILED } }),
      ]);

    return {
      totalCommands,
      settledCommands,
      ackedTargets,
      supersededTargets,
      failedTargets,
    };
  });

  // Hard Problem 3 Test: Battery-Aware Hash Skip
  // Bumps tag desiredVersion while keeping desiredHash equal to reportedHash
  app.post('/api/chaos/hash-skip-test', async (_request, reply) => {
    const tag = await db.tag.findFirst({
      where: {
        reportedHash: { not: null },
      },
      include: { sku: true },
    });

    if (!tag || !tag.reportedHash) {
      return reply.status(400).send({
        success: false,
        error: 'No tag with reportedHash found. Please allow at least 1 tag to converge first.',
      });
    }

    const nextDesiredVersion = Math.max(tag.desiredVersion, tag.reportedVersion) + 1;

    // Set desiredVersion higher but keep desiredHash exactly equal to reportedHash!
    const updated = await db.tag.update({
      where: { id: tag.id },
      data: {
        desiredVersion: nextDesiredVersion,
        desiredHash: tag.reportedHash,
      },
    });

    return reply.status(200).send({
      success: true,
      message: `Updated tag ${tag.hardwareId} with matching hash. Sync-engine will skip radio dispatch and advance reportedVersion in DB.`,
      tagId: updated.hardwareId,
      desiredVersion: updated.desiredVersion,
      reportedVersion: updated.reportedVersion,
      hash: updated.desiredHash,
    });
  });

  // Hard Problem 2 Test: Burst & Collapse (Rapid price overrides)
  // Rapidly triggers 3 price updates so older intermediate versions get marked SUPERSEDED
  app.post('/api/chaos/burst-collapse-test', async (request, reply) => {
    const body = (request.body as any) || {};
    const skuCode = body.skuCode || 'CAD-SILK-150';
    const store = await db.store.findFirst();

    if (!store) {
      return reply.status(400).send({ success: false, error: 'Store not found' });
    }

    const prices = [17000, 16500, 16000];
    const results = [];

    for (let i = 0; i < prices.length; i++) {
      const p = prices[i];
      const res = await processPosPriceUpdate({
        storeId: store.id,
        skuCode,
        newPriceMinor: p,
        promoBadge: `Burst #${i + 1}`,
        source: 'pos',
      });
      results.push(res);
    }

    return reply.status(200).send({
      success: true,
      message: `Dispatched 3 rapid updates for ${skuCode}. Intermediate targets will be marked SUPERSEDED.`,
      results,
    });
  });

  // Hard Problem 7 Test: Fault Injection (Low Battery or Revert)
  app.post('/api/chaos/inject-fault', async (request, reply) => {
    const body = (request.body as any) || {};
    const tagId = body.tagId || 'tag-001';
    const faultType = body.faultType || 'LOW_BATTERY'; // 'LOW_BATTERY' | 'RESTORE'

    const tag = await db.tag.findUnique({ where: { hardwareId: tagId } });
    if (!tag) {
      return reply.status(404).send({ success: false, error: `Tag ${tagId} not found` });
    }

    let batteryPct = 95;
    if (faultType === 'LOW_BATTERY') {
      batteryPct = 12; // < 15% triggers LOW_BATTERY NACK
    }

    const updated = await db.tag.update({
      where: { id: tag.id },
      data: { batteryPct },
    });

    return reply.status(200).send({
      success: true,
      message:
        faultType === 'LOW_BATTERY'
          ? `Injected low battery (12%) on ${tagId}. Next render command will NACK with LOW_BATTERY.`
          : `Restored battery (95%) on ${tagId}.`,
      tagId: updated.hardwareId,
      batteryPct: updated.batteryPct,
    });
  });
}
