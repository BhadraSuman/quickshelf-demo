import { db, TagSize, GatewayStatus } from './index.js';
import { computePayloadHash } from '@quickshelf/esl-protocol';

async function main() {
  console.log('Seeding initial data...');

  // 1. Create or find default Store
  const store = await db.store.upsert({
    where: { id: 'store-blr-koramangala' },
    update: {},
    create: {
      id: 'store-blr-koramangala',
      name: 'Quickshelf Supermarket - Koramangala',
      city: 'Bengaluru',
    },
  });
  console.log(`Store: ${store.name} (${store.id})`);

  // 2. Create Gateway
  const gateway = await db.gateway.upsert({
    where: { hardwareId: 'gw-blr-01' },
    update: {},
    create: {
      hardwareId: 'gw-blr-01',
      firmware: 'v1.0.0',
      status: GatewayStatus.OFFLINE,
      maxTagsPerSec: 50,
      storeId: store.id,
    },
  });
  console.log(`Gateway: ${gateway.hardwareId} (${gateway.id})`);

  // 3. Create Sample SKUs
  const sampleSkus = [
    {
      code: 'CAD-SILK-150',
      name: 'Cadbury Dairy Milk Silk 150g',
      priceMinor: 17500, // ₹175.00
      mrpMinor: 19500,   // ₹195.00
      promoBadge: 'Save ₹20',
      size: TagSize.T213,
    },
    {
      code: 'AMUL-MILK-500',
      name: 'Amul Taaza Milk 500ml',
      priceMinor: 2700,  // ₹27.00
      mrpMinor: 2700,    // ₹27.00
      promoBadge: null,
      size: TagSize.T154,
    },
    {
      code: 'MAGGI-NOODLE-4P',
      name: 'Maggi 2-Minute Noodles 4-Pack',
      priceMinor: 5600,  // ₹56.00
      mrpMinor: 6000,    // ₹60.00
      promoBadge: 'Special Offer',
      size: TagSize.T290,
    },
    {
      code: 'COKE-ZERO-300',
      name: 'Coca-Cola Zero Sugar Can 300ml',
      priceMinor: 4000,  // ₹40.00
      mrpMinor: 4000,    // ₹40.00
      promoBadge: null,
      size: TagSize.T154,
    },
    {
      code: 'LAYS-MAGIC-MASALA',
      name: "Lay's India's Magic Masala 50g",
      priceMinor: 2000,  // ₹20.00
      mrpMinor: 2000,    // ₹20.00
      promoBadge: null,
      size: TagSize.T154,
    },
  ];

  for (let i = 0; i < sampleSkus.length; i++) {
    const item = sampleSkus[i];
    const sku = await db.sku.upsert({
      where: {
        storeId_code: {
          storeId: store.id,
          code: item.code,
        },
      },
      update: {},
      create: {
        storeId: store.id,
        code: item.code,
        name: item.name,
        priceMinor: item.priceMinor,
        mrpMinor: item.mrpMinor,
        promoBadge: item.promoBadge,
        version: 1,
      },
    });

    const payload = {
      skuCode: sku.code,
      name: sku.name,
      priceMinor: sku.priceMinor,
      mrpMinor: sku.mrpMinor,
      promoBadge: sku.promoBadge,
      size: item.size,
    };
    const hash = computePayloadHash(payload);

    const tagHardwareId = `tag-${String(i + 1).padStart(3, '0')}`;
    await db.tag.upsert({
      where: { hardwareId: tagHardwareId },
      update: {},
      create: {
        hardwareId: tagHardwareId,
        storeId: store.id,
        gatewayId: gateway.id,
        skuId: sku.id,
        size: item.size,
        // Start in diverged state (desiredVersion = 1, reportedVersion = 0)
        // so reconciliation engine can immediately pick it up!
        desiredVersion: 1,
        desiredHash: hash,
        desiredPayload: payload,
        reportedVersion: 0,
        reportedHash: null,
        batteryPct: 95,
        rssi: -65,
      },
    });
  }

  console.log(`Seeded ${sampleSkus.length} SKUs and paired diverged Tags.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
