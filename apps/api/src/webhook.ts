import { z } from 'zod';
import { db } from '@quickshelf/db';
import { computePayloadHash, type TagRenderPayload } from '@quickshelf/esl-protocol';

export const PosPriceUpdateSchema = z.object({
  storeId: z.string().min(1),
  skuCode: z.string().min(1),
  newPriceMinor: z.number().int().nonnegative(), // minor units only
  mrpMinor: z.number().int().nonnegative().optional(),
  promoBadge: z.string().nullable().optional(),
  source: z.enum(['pos', 'manual', 'promo']).default('pos'),
});

export type PosPriceUpdateInput = z.infer<typeof PosPriceUpdateSchema>;

export async function processPosPriceUpdate(input: PosPriceUpdateInput) {
  const { storeId, skuCode, newPriceMinor, mrpMinor, promoBadge, source } = input;

  return await db.$transaction(async (tx) => {
    // 1. Fetch SKU
    const sku = await tx.sku.findUnique({
      where: {
        storeId_code: {
          storeId,
          code: skuCode,
        },
      },
    });

    if (!sku) {
      throw new Error(`SKU not found: ${skuCode} in store ${storeId}`);
    }

    const oldPriceMinor = sku.priceMinor;
    const updatedMrp = mrpMinor ?? sku.mrpMinor;
    const updatedPromo = promoBadge !== undefined ? promoBadge : sku.promoBadge;
    const nextVersion = sku.version + 1;

    // 2. Append to PriceEvent audit trail
    await tx.priceEvent.create({
      data: {
        skuId: sku.id,
        oldPriceMinor,
        newPriceMinor,
        source,
      },
    });

    // 3. Bump SKU version and update commercial attributes
    const updatedSku = await tx.sku.update({
      where: { id: sku.id },
      data: {
        priceMinor: newPriceMinor,
        mrpMinor: updatedMrp,
        promoBadge: updatedPromo,
        version: nextVersion,
      },
    });

    // 4. Find all Tags bound to this SKU
    const pairedTags = await tx.tag.findMany({
      where: { skuId: sku.id },
    });

    for (const tag of pairedTags) {
      const renderPayload: TagRenderPayload = {
        skuCode: updatedSku.code,
        name: updatedSku.name,
        priceMinor: updatedSku.priceMinor,
        mrpMinor: updatedSku.mrpMinor,
        promoBadge: updatedSku.promoBadge,
        size: tag.size as any,
      };

      const desiredHash = computePayloadHash(renderPayload);

      // 5. Update Tag desired state (now diverged from hardware reported state)
      await tx.tag.update({
        where: { id: tag.id },
        data: {
          desiredVersion: nextVersion,
          desiredHash,
          desiredPayload: renderPayload as any,
        },
      });
    }

    return {
      skuId: updatedSku.id,
      skuCode: updatedSku.code,
      oldPriceMinor,
      newPriceMinor,
      version: nextVersion,
      affectedTagsCount: pairedTags.length,
    };
  });
}
