import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db, TargetStatus, CommandStatus, GatewayStatus, TagSize } from '@quickshelf/db';
import { computePayloadHash, type TagRenderPayload } from '@quickshelf/esl-protocol';
import { PosPriceUpdateSchema, processPosPriceUpdate } from './webhook.js';
import { publishGatewayCommand } from './redis.js';

export async function registerRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    return { status: 'healthy', timestamp: new Date().toISOString() };
  });

  // ==========================================
  // POS Webhook Ingestion
  // ==========================================
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

  // ==========================================
  // Fleet & Divergence Metrics
  // ==========================================
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

  // ==========================================
  // Stores Management
  // ==========================================
  app.get('/api/stores', async () => {
    const stores = await db.store.findMany({
      include: {
        gateways: true,
        tags: true,
        skus: true,
      },
      orderBy: { name: 'asc' },
    });

    return stores.map((s) => {
      const totalTags = s.tags.length;
      const divergedTags = s.tags.filter((t) => t.desiredVersion > t.reportedVersion).length;
      const convergedTags = totalTags - divergedTags;
      return {
        id: s.id,
        name: s.name,
        city: s.city,
        gatewayCount: s.gateways.length,
        tagCount: totalTags,
        divergedTags,
        convergedTags,
        convergencePct: totalTags > 0 ? (convergedTags / totalTags) * 100 : 100,
        skuCount: s.skus.length,
      };
    });
  });

  app.post('/api/stores', async (request, reply) => {
    const schema = z.object({
      name: z.string().min(1),
      city: z.string().min(1),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues });
    }

    const store = await db.store.create({
      data: parsed.data,
    });

    return reply.status(201).send({ success: true, store });
  });

  // SOW §5 Mathematical Hardware Sizing & Auto-BOM Calculator
  app.post('/api/stores/bom-calculate', async (request, reply) => {
    const schema = z.object({
      floorAreaSqFt: z.number().positive(),
      totalLabels: z.number().int().positive(),
      coveragePerGatewaySqFt: z.number().positive().default(2500),
      capacityPerGateway: z.number().int().positive().default(3000),
      headroomFactor: z.number().min(0.1).max(1.0).default(0.7), // 30% capacity safety margin
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues });
    }

    const { floorAreaSqFt, totalLabels, coveragePerGatewaySqFt, capacityPerGateway, headroomFactor } = parsed.data;

    // Formula: N_gateways = max( ceil(A / a), ceil(L / (0.7 * C)) )
    const gatewaysByArea = Math.ceil(floorAreaSqFt / coveragePerGatewaySqFt);
    const effectiveCapacityPerGateway = capacityPerGateway * headroomFactor;
    const gatewaysByCapacity = Math.ceil(totalLabels / effectiveCapacityPerGateway);
    let totalGateways = Math.max(gatewaysByArea, gatewaysByCapacity);

    // Recommended: one extra gateway in stores above 1,500 labels if labels can fail over
    const extraGatewayRecommended = totalLabels > 1500;
    if (extraGatewayRecommended) {
      totalGateways += 1;
    }

    // Recommended Label Mix breakdown based on typical supermarket proportions
    const labelMix = {
      T154: Math.round(totalLabels * 0.15), // Spices, cosmetics
      T213: Math.round(totalLabels * 0.35), // Standard grocery
      T290: Math.round(totalLabels * 0.30), // Packaged goods
      T420: Math.round(totalLabels * 0.12), // Fresh, produce
      T750: Math.round(totalLabels * 0.05), // Endcaps, promo headers
      T1020: Math.max(0, totalLabels - Math.round(totalLabels * 0.97)), // Pallet bays
    };

    return reply.status(200).send({
      success: true,
      formula: 'N_gateways = max( ceil(A / a), ceil(L / (0.7 * C)) )',
      inputs: {
        floorAreaSqFt,
        totalLabels,
        coveragePerGatewaySqFt,
        capacityPerGateway,
        headroomMarginPct: Math.round((1 - headroomFactor) * 100),
      },
      results: {
        gatewaysByArea,
        gatewaysByCapacity,
        baseGatewaysNeeded: Math.max(gatewaysByArea, gatewaysByCapacity),
        extraGatewayForFailover: extraGatewayRecommended ? 1 : 0,
        totalGatewaysRecommended: totalGateways,
        recommendedSparesLabels: Math.ceil(totalLabels * 0.03), // 3% spares recommendation
        recommendedLabelMix: labelMix,
      },
    });
  });

  // ==========================================
  // Gateways (Access Points) Management
  // ==========================================
  app.get('/api/gateways', async () => {
    const gateways = await db.gateway.findMany({
      include: {
        store: true,
        tags: true,
      },
      orderBy: { hardwareId: 'asc' },
    });

    return gateways.map((gw) => {
      const totalTags = gw.tags.length;
      const divergedTags = gw.tags.filter((t) => t.desiredVersion > t.reportedVersion).length;
      return {
        id: gw.id,
        hardwareId: gw.hardwareId,
        firmware: gw.firmware,
        status: gw.status,
        lastSeenAt: gw.lastSeenAt,
        maxTagsPerSec: gw.maxTagsPerSec,
        store: {
          id: gw.store.id,
          name: gw.store.name,
          city: gw.store.city,
        },
        tagCount: totalTags,
        divergedCount: divergedTags,
        convergedCount: totalTags - divergedTags,
        convergencePct: totalTags > 0 ? ((totalTags - divergedTags) / totalTags) * 100 : 100,
      };
    });
  });

  app.put('/api/gateways/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({
      maxTagsPerSec: z.number().int().positive().optional(),
      status: z.nativeEnum(GatewayStatus).optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues });
    }

    const gateway = await db.gateway.findUnique({ where: { id } });
    if (!gateway) {
      return reply.status(404).send({ success: false, error: `Gateway ${id} not found` });
    }

    const updated = await db.gateway.update({
      where: { id },
      data: parsed.data,
    });

    // If transmission rate limit was adjusted, push config frame down to gateway over WebSocket
    if (parsed.data.maxTagsPerSec) {
      await publishGatewayCommand(gateway.hardwareId, {
        type: 'config',
        maxTagsPerSec: parsed.data.maxTagsPerSec,
      });
    }

    return reply.status(200).send({ success: true, gateway: updated });
  });

  // Force Sync Request (Drift reconciliation audit)
  app.post('/api/gateways/:id/sync', async (request, reply) => {
    const { id } = request.params as { id: string };
    const gateway = await db.gateway.findUnique({ where: { id } });
    if (!gateway) {
      return reply.status(404).send({ success: false, error: `Gateway ${id} not found` });
    }

    // Publish sync_request frame down to gateway
    const published = await publishGatewayCommand(gateway.hardwareId, {
      type: 'sync_request',
    });

    return reply.status(200).send({
      success: true,
      message: `Triggered inventory sync_request for gateway ${gateway.hardwareId}`,
      deliveredToBus: published,
    });
  });

  // Provision new Gateway (Access Point)
  app.post('/api/gateways', async (request, reply) => {
    const schema = z.object({
      hardwareId: z.string().min(1),
      storeId: z.string().min(1),
      firmware: z.string().default('v1.2.4'),
      maxTagsPerSec: z.number().int().positive().default(50),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues });
    }

    const { hardwareId, storeId, firmware, maxTagsPerSec } = parsed.data;

    const existing = await db.gateway.findUnique({ where: { hardwareId } });
    if (existing) {
      return reply.status(409).send({ success: false, error: `Gateway with hardware ID '${hardwareId}' already exists.` });
    }

    const created = await db.gateway.create({
      data: {
        hardwareId,
        storeId,
        firmware,
        maxTagsPerSec,
        status: GatewayStatus.ONLINE,
        lastSeenAt: new Date(),
      },
    });

    return reply.status(201).send({ success: true, gateway: created });
  });

  // ==========================================
  // Tags (Digital Shelf Labels) Management
  // ==========================================
  app.get('/api/tags', async () => {
    const tags = await db.tag.findMany({
      include: {
        store: true,
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
        storeId: t.storeId,
        storeName: t.store.name,
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
        desiredHash: t.desiredHash,
        reportedVersion: t.reportedVersion,
        reportedHash: t.reportedHash,
        reportedAt: t.reportedAt,
        batteryPct: t.batteryPct ?? 95,
        rssi: t.rssi ?? -65,
        isDiverged,
        divergenceDelta: Math.max(0, t.desiredVersion - t.reportedVersion),
      };
    });
  });

  // Detailed Tag Inspector
  app.get('/api/tags/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const tag = await db.tag.findFirst({
      where: {
        OR: [{ id }, { hardwareId: id }],
      },
      include: {
        store: true,
        gateway: true,
        sku: true,
        targets: {
          take: 10,
          orderBy: { command: { createdAt: 'desc' } },
          include: {
            command: true,
          },
        },
      },
    });

    if (!tag) {
      return reply.status(404).send({ success: false, error: `Tag ${id} not found` });
    }

    const isDiverged = tag.desiredVersion > tag.reportedVersion;

    return reply.status(200).send({
      id: tag.id,
      hardwareId: tag.hardwareId,
      size: tag.size,
      store: {
        id: tag.store.id,
        name: tag.store.name,
        city: tag.store.city,
      },
      gateway: {
        id: tag.gateway.id,
        hardwareId: tag.gateway.hardwareId,
        status: tag.gateway.status,
        firmware: tag.gateway.firmware,
        maxTagsPerSec: tag.gateway.maxTagsPerSec,
      },
      sku: tag.sku
        ? {
            id: tag.sku.id,
            code: tag.sku.code,
            name: tag.sku.name,
            priceMinor: tag.sku.priceMinor,
            mrpMinor: tag.sku.mrpMinor,
            promoBadge: tag.sku.promoBadge,
            version: tag.sku.version,
          }
        : null,
      desiredVersion: tag.desiredVersion,
      desiredHash: tag.desiredHash,
      desiredPayload: tag.desiredPayload,
      reportedVersion: tag.reportedVersion,
      reportedHash: tag.reportedHash,
      reportedAt: tag.reportedAt,
      batteryPct: tag.batteryPct ?? 95,
      rssi: tag.rssi ?? -65,
      isDiverged,
      divergenceDelta: Math.max(0, tag.desiredVersion - tag.reportedVersion),
      recentTargets: tag.targets.map((tgt) => ({
        id: tgt.id,
        commandId: tgt.commandId,
        version: tgt.version,
        hash: tgt.hash,
        status: tgt.status,
        ackedAt: tgt.ackedAt,
        failure: tgt.failure,
        createdAt: tgt.command.createdAt,
      })),
    });
  });

  // Re-pair SKU or change Size
  app.put('/api/tags/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({
      skuId: z.string().nullable().optional(),
      size: z.nativeEnum(TagSize).optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues });
    }

    const tag = await db.tag.findFirst({
      where: { OR: [{ id }, { hardwareId: id }] },
      include: { sku: true },
    });

    if (!tag) {
      return reply.status(404).send({ success: false, error: `Tag ${id} not found` });
    }

    const targetSize = parsed.data.size ?? tag.size;
    let targetSkuId = parsed.data.skuId !== undefined ? parsed.data.skuId : tag.skuId;

    let desiredPayload: any = null;
    let desiredHash: string | null = null;
    let nextDesiredVersion = tag.desiredVersion;

    if (targetSkuId) {
      const sku = await db.sku.findUnique({ where: { id: targetSkuId } });
      if (!sku) {
        return reply.status(400).send({ success: false, error: `Target SKU ${targetSkuId} not found` });
      }

      const renderPayload: TagRenderPayload = {
        skuCode: sku.code,
        name: sku.name,
        priceMinor: sku.priceMinor,
        mrpMinor: sku.mrpMinor,
        promoBadge: sku.promoBadge,
        size: targetSize as any,
      };

      desiredPayload = renderPayload;
      desiredHash = computePayloadHash(renderPayload);
      // Force divergence so sync engine picks up the re-pair
      nextDesiredVersion = Math.max(tag.desiredVersion, tag.reportedVersion) + 1;
    } else {
      // Unpaired tag
      targetSkuId = null;
      desiredPayload = null;
      desiredHash = null;
    }

    const updated = await db.tag.update({
      where: { id: tag.id },
      data: {
        skuId: targetSkuId,
        size: targetSize,
        desiredPayload,
        desiredHash,
        desiredVersion: nextDesiredVersion,
      },
      include: { sku: true },
    });

    return reply.status(200).send({
      success: true,
      message: `Tag ${tag.hardwareId} updated successfully.`,
      tag: updated,
    });
  });

  // Provision new tag
  app.post('/api/tags', async (request, reply) => {
    const schema = z.object({
      hardwareId: z.string().min(1),
      storeId: z.string().min(1),
      gatewayId: z.string().min(1),
      size: z.nativeEnum(TagSize).default(TagSize.T290),
      skuId: z.string().optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues });
    }

    const { hardwareId, storeId, gatewayId, size, skuId } = parsed.data;

    let desiredPayload: any = null;
    let desiredHash: string | null = null;
    let desiredVersion = 0;

    if (skuId) {
      const sku = await db.sku.findUnique({ where: { id: skuId } });
      if (!sku) {
        return reply.status(400).send({ success: false, error: `SKU ${skuId} not found` });
      }
      const renderPayload: TagRenderPayload = {
        skuCode: sku.code,
        name: sku.name,
        priceMinor: sku.priceMinor,
        mrpMinor: sku.mrpMinor,
        promoBadge: sku.promoBadge,
        size: size as any,
      };
      desiredPayload = renderPayload;
      desiredHash = computePayloadHash(renderPayload);
      desiredVersion = 1;
    }

    const created = await db.tag.create({
      data: {
        hardwareId,
        storeId,
        gatewayId,
        size,
        skuId: skuId ?? null,
        desiredPayload,
        desiredHash,
        desiredVersion,
        reportedVersion: 0,
      },
    });

    return reply.status(201).send({ success: true, tag: created });
  });

  // Trigger physical LED flash on label for 10 seconds (Locate Label / Pick-to-Light)
  app.post('/api/tags/:id/locate', async (request, reply) => {
    const { id } = request.params as { id: string };
    const tag = await db.tag.findFirst({
      where: { OR: [{ id }, { hardwareId: id }] },
      include: { gateway: true },
    });

    if (!tag) {
      return reply.status(404).send({ success: false, error: `Tag ${id} not found` });
    }

    // Publish locate frame to gateway bus
    await publishGatewayCommand(tag.gateway.hardwareId, {
      type: 'locate',
      tagHardwareId: tag.hardwareId,
      durationSeconds: 10,
    } as any);

    return reply.status(200).send({
      success: true,
      message: `Triggered 10-second LED flash sequence for tag ${tag.hardwareId}`,
      tagHardwareId: tag.hardwareId,
      gatewayHardwareId: tag.gateway.hardwareId,
    });
  });

  // Direct Quick Price Update from Label (Tag) View
  app.post('/api/tags/:id/quick-price', async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({
      priceMinor: z.number().int().nonnegative(),
      mrpMinor: z.number().int().nonnegative().optional(),
      promoBadge: z.string().nullable().optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues });
    }

    const tag = await db.tag.findFirst({
      where: { OR: [{ id }, { hardwareId: id }] },
      include: { sku: true, gateway: true },
    });

    if (!tag || !tag.sku) {
      return reply.status(404).send({ success: false, error: `Tag ${id} is not bound to any SKU.` });
    }

    const mrpMinor = parsed.data.mrpMinor ?? tag.sku.mrpMinor;
    if (parsed.data.priceMinor > mrpMinor) {
      return reply.status(400).send({
        success: false,
        error: `Commercial Guardrail Violation (PRC-04): Selling price (₹${(parsed.data.priceMinor / 100).toFixed(2)}) cannot exceed MRP (₹${(mrpMinor / 100).toFixed(2)}).`,
      });
    }

    // Update SKU and tag desired payload
    const nextVersion = tag.sku.version + 1;
    const updatedSku = await db.sku.update({
      where: { id: tag.sku.id },
      data: {
        priceMinor: parsed.data.priceMinor,
        mrpMinor,
        promoBadge: parsed.data.promoBadge !== undefined ? parsed.data.promoBadge : tag.sku.promoBadge,
        version: nextVersion,
      },
    });

    await db.priceEvent.create({
      data: {
        skuId: tag.sku.id,
        oldPriceMinor: tag.sku.priceMinor,
        newPriceMinor: parsed.data.priceMinor,
        source: 'manual',
      },
    });

    const renderPayload: TagRenderPayload = {
      skuCode: updatedSku.code,
      name: updatedSku.name,
      priceMinor: updatedSku.priceMinor,
      mrpMinor: updatedSku.mrpMinor,
      promoBadge: updatedSku.promoBadge,
      size: tag.size as any,
    };
    const desiredHash = computePayloadHash(renderPayload);

    const updatedTag = await db.tag.update({
      where: { id: tag.id },
      data: {
        desiredVersion: nextVersion,
        desiredHash,
        desiredPayload: renderPayload as any,
      },
      include: { sku: true, gateway: true },
    });

    return reply.status(200).send({
      success: true,
      message: `Updated price for tag ${tag.hardwareId} to ₹${(parsed.data.priceMinor / 100).toFixed(2)}. Label marked diverged for RF dispatch.`,
      tag: updatedTag,
    });
  });

  // ==========================================
  // Commercial SKU Management
  // ==========================================
  app.get('/api/skus', async () => {
    const skus = await db.sku.findMany({
      include: {
        store: true,
        tags: true,
      },
      orderBy: { code: 'asc' },
    });

    return skus.map((s) => ({
      id: s.id,
      storeId: s.storeId,
      storeName: s.store.name,
      code: s.code,
      name: s.name,
      priceMinor: s.priceMinor,
      mrpMinor: s.mrpMinor,
      promoBadge: s.promoBadge,
      version: s.version,
      tagCount: s.tags.length,
    }));
  });

  // Create new SKU
  app.post('/api/skus', async (request, reply) => {
    const schema = z.object({
      storeId: z.string().min(1),
      code: z.string().min(1),
      name: z.string().min(1),
      priceMinor: z.number().int().nonnegative(),
      mrpMinor: z.number().int().nonnegative(),
      promoBadge: z.string().nullable().optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues });
    }

    if (parsed.data.priceMinor > parsed.data.mrpMinor) {
      return reply.status(400).send({
        success: false,
        error: `Commercial Guardrail Violation (PRC-04): Selling price (₹${(parsed.data.priceMinor / 100).toFixed(2)}) cannot exceed MRP (₹${(parsed.data.mrpMinor / 100).toFixed(2)}).`,
      });
    }

    const created = await db.$transaction(async (tx) => {
      const sku = await tx.sku.create({
        data: {
          storeId: parsed.data.storeId,
          code: parsed.data.code,
          name: parsed.data.name,
          priceMinor: parsed.data.priceMinor,
          mrpMinor: parsed.data.mrpMinor,
          promoBadge: parsed.data.promoBadge ?? null,
          version: 1,
        },
      });

      await tx.priceEvent.create({
        data: {
          skuId: sku.id,
          oldPriceMinor: sku.priceMinor,
          newPriceMinor: sku.priceMinor,
          source: 'manual',
        },
      });

      return sku;
    });

    return reply.status(201).send({ success: true, sku: created });
  });

  // Update SKU Commercials
  app.put('/api/skus/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({
      name: z.string().min(1).optional(),
      priceMinor: z.number().int().nonnegative().optional(),
      mrpMinor: z.number().int().nonnegative().optional(),
      promoBadge: z.string().nullable().optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues });
    }

    const sku = await db.sku.findUnique({
      where: { id },
      include: { tags: true },
    });

    if (!sku) {
      return reply.status(404).send({ success: false, error: `SKU ${id} not found` });
    }

    const newPriceMinor = parsed.data.priceMinor ?? sku.priceMinor;
    const newMrpMinor = parsed.data.mrpMinor ?? sku.mrpMinor;
    const newName = parsed.data.name ?? sku.name;
    const newPromoBadge = parsed.data.promoBadge !== undefined ? parsed.data.promoBadge : sku.promoBadge;

    if (newPriceMinor > newMrpMinor) {
      return reply.status(400).send({
        success: false,
        error: `Commercial Guardrail Violation (PRC-04): Selling price (₹${(newPriceMinor / 100).toFixed(2)}) cannot exceed MRP (₹${(newMrpMinor / 100).toFixed(2)}).`,
      });
    }

    const nextVersion = sku.version + 1;

    const updated = await db.$transaction(async (tx) => {
      if (parsed.data.priceMinor !== undefined && parsed.data.priceMinor !== sku.priceMinor) {
        await tx.priceEvent.create({
          data: {
            skuId: sku.id,
            oldPriceMinor: sku.priceMinor,
            newPriceMinor: parsed.data.priceMinor,
            source: 'manual',
          },
        });
      }

      const updatedSku = await tx.sku.update({
        where: { id: sku.id },
        data: {
          name: newName,
          priceMinor: newPriceMinor,
          mrpMinor: newMrpMinor,
          promoBadge: newPromoBadge,
          version: nextVersion,
        },
      });

      // Update all tags bound to this SKU
      for (const tag of sku.tags) {
        const renderPayload: TagRenderPayload = {
          skuCode: updatedSku.code,
          name: updatedSku.name,
          priceMinor: updatedSku.priceMinor,
          mrpMinor: updatedSku.mrpMinor,
          promoBadge: updatedSku.promoBadge,
          size: tag.size as any,
        };

        const desiredHash = computePayloadHash(renderPayload);

        await tx.tag.update({
          where: { id: tag.id },
          data: {
            desiredVersion: nextVersion,
            desiredHash,
            desiredPayload: renderPayload as any,
          },
        });
      }

      return updatedSku;
    });

    return reply.status(200).send({
      success: true,
      message: `Updated SKU ${sku.code}. Re-rendered ${sku.tags.length} digital labels.`,
      sku: updated,
    });
  });

  // ==========================================
  // Price Change Audit Trail
  // ==========================================
  app.get('/api/audit', async () => {
    const events = await db.priceEvent.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: {
        sku: {
          include: {
            store: true,
          },
        },
      },
    });

    return events.map((e) => ({
      id: e.id,
      skuCode: e.sku.code,
      skuName: e.sku.name,
      storeName: e.sku.store.name,
      oldPriceMinor: e.oldPriceMinor,
      newPriceMinor: e.newPriceMinor,
      deltaMinor: e.newPriceMinor - e.oldPriceMinor,
      source: e.source,
      createdAt: e.createdAt,
    }));
  });

  // ==========================================
  // Quick Flash Sale / Reset Trigger
  // ==========================================
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

  app.post('/api/chaos/inject-fault', async (request, reply) => {
    const body = (request.body as any) || {};
    const tagId = body.tagId || 'tag-001';
    const faultType = body.faultType || 'LOW_BATTERY';

    const tag = await db.tag.findUnique({ where: { hardwareId: tagId } });
    if (!tag) {
      return reply.status(404).send({ success: false, error: `Tag ${tagId} not found` });
    }

    let batteryPct = 95;
    if (faultType === 'LOW_BATTERY') {
      batteryPct = 12;
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
