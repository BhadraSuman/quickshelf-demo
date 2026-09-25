import { db, TagSize, GatewayStatus, Role } from './index.js';
import { computePayloadHash } from '@quickshelf/esl-protocol';
import crypto from 'node:crypto';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  console.log('Seeding Multi-Tenant Quickshelf data...');

  // 1. Create Organization (Retailer)
  const org = await db.organization.upsert({
    where: { code: 'MORE-RET' },
    update: {},
    create: {
      code: 'MORE-RET',
      name: 'More Retail Private Limited',
      gstin: '29AABCM1234F1Z5',
      technicalContactEmail: 'tech@moreretail.in',
    },
  });
  console.log(`Organization: ${org.name} (${org.code})`);

  // 2. Create Certified Partner (Installer / Field Services)
  const partner = await db.partner.upsert({
    where: { code: 'APEX-INST' },
    update: {},
    create: {
      code: 'APEX-INST',
      name: 'Apex Field Services Pvt Ltd',
      contactEmail: 'operations@apextech.in',
    },
  });
  console.log(`Partner: ${partner.name} (${partner.code})`);

  // 3. Create Geographic Region
  const region = await db.region.upsert({
    where: {
      orgId_code: {
        orgId: org.id,
        code: 'BLR-SOUTH',
      },
    },
    update: {},
    create: {
      code: 'BLR-SOUTH',
      name: 'Bengaluru South Zone',
      orgId: org.id,
    },
  });
  console.log(`Region: ${region.name} (${region.code})`);

  // 4. Create Store linked to Org, Region & Partner
  const store = await db.store.upsert({
    where: { id: 'store-blr-koramangala' },
    update: {
      orgId: org.id,
      regionId: region.id,
      partnerId: partner.id,
    },
    create: {
      id: 'store-blr-koramangala',
      name: 'Quickshelf Supermarket - Koramangala',
      city: 'Bengaluru',
      orgId: org.id,
      regionId: region.id,
      partnerId: partner.id,
    },
  });
  console.log(`Store: ${store.name} (${store.id})`);

  // 5. Store Layout Hierarchy (SOW STR-03: Zone -> Aisle -> Bay -> Shelf)
  const zone = await db.zone.upsert({
    where: { storeId_code: { storeId: store.id, code: 'Z-GROCERY' } },
    update: {},
    create: {
      storeId: store.id,
      code: 'Z-GROCERY',
      name: 'Packaged Foods & Beverages',
    },
  });

  const aisle = await db.aisle.upsert({
    where: { zoneId_code: { zoneId: zone.id, code: 'A-01' } },
    update: {},
    create: {
      zoneId: zone.id,
      code: 'A-01',
      name: 'Aisle 1 - Confectionery & Snacks',
    },
  });

  const bay = await db.bay.upsert({
    where: { aisleId_code: { aisleId: aisle.id, code: 'BAY-A' } },
    update: {},
    create: {
      aisleId: aisle.id,
      code: 'BAY-A',
      name: 'Bay A (Eye Level)',
    },
  });

  const shelf = await db.shelf.upsert({
    where: { bayId_code: { bayId: bay.id, code: 'SH-01' } },
    update: {},
    create: {
      bayId: bay.id,
      code: 'SH-01',
      name: 'Shelf Tier 1',
    },
  });

  // 6. Users & Roles (SOW Section 4 Permissions Matrix)
  const defaultPasswordHash = hashPassword('Quickshelf@2026');

  const usersToSeed = [
    {
      email: 'admin@quickshelf.io',
      name: 'Suman Bhadra (Super Admin)',
      role: Role.SUPER_ADMIN,
      orgId: null,
      partnerId: null,
      storeId: null,
    },
    {
      email: 'ops@quickshelf.io',
      name: 'Operations Manager',
      role: Role.OPERATIONS_MANAGER,
      orgId: null,
      partnerId: null,
      storeId: null,
    },
    {
      email: 'support@quickshelf.io',
      name: 'Tier-2 Support Engineer',
      role: Role.SUPPORT_ENGINEER,
      orgId: null,
      partnerId: null,
      storeId: null,
    },
    {
      email: 'partner.lead@apextech.in',
      name: 'Apex Field Partner Admin',
      role: Role.PARTNER_ADMIN,
      orgId: null,
      partnerId: partner.id,
      storeId: null,
    },
    {
      email: 'tech.ramesh@apextech.in',
      name: 'Ramesh Kumar (Certified Technician)',
      role: Role.FIELD_TECHNICIAN,
      orgId: null,
      partnerId: partner.id,
      storeId: store.id,
    },
    {
      email: 'owner@moreretail.in',
      name: 'Vikram Mehta (Retail Org Owner)',
      role: Role.RETAIL_OWNER,
      orgId: org.id,
      partnerId: null,
      storeId: null,
    },
    {
      email: 'pricing@moreretail.in',
      name: 'Priya Sharma (Pricing & Merchandising)',
      role: Role.PRICING_MANAGER,
      orgId: org.id,
      partnerId: null,
      storeId: null,
    },
    {
      email: 'store.manager@moreretail.in',
      name: 'Anand Verma (Store Manager)',
      role: Role.STORE_MANAGER,
      orgId: org.id,
      partnerId: null,
      storeId: store.id,
    },
    {
      email: 'staff.floor@moreretail.in',
      name: 'Kavita Rao (Store Staff / Floor Associate)',
      role: Role.STORE_STAFF,
      orgId: org.id,
      partnerId: null,
      storeId: store.id,
    },
  ];

  for (const u of usersToSeed) {
    const user = await db.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        orgId: u.orgId,
        partnerId: u.partnerId,
        storeId: u.storeId,
      },
      create: {
        email: u.email,
        name: u.name,
        passwordHash: defaultPasswordHash,
        role: u.role,
        orgId: u.orgId,
        partnerId: u.partnerId,
        storeId: u.storeId,
      },
    });
    console.log(`User created: ${user.email} [${user.role}]`);
  }

  // 7. Seed POS API Key for More Retail
  await db.apiKey.upsert({
    where: { key: 'qs_live_more_retail_pos_webhook_key_2026' },
    update: {},
    create: {
      name: 'SAP Retail ERP Webhook Key',
      key: 'qs_live_more_retail_pos_webhook_key_2026',
      orgId: org.id,
    },
  });

  // 8. Seed Gateway
  const gateway = await db.gateway.upsert({
    where: { hardwareId: 'gw-blr-01' },
    update: { storeId: store.id },
    create: {
      hardwareId: 'gw-blr-01',
      firmware: 'v1.0.0',
      status: GatewayStatus.OFFLINE,
      maxTagsPerSec: 50,
      storeId: store.id,
    },
  });
  console.log(`Gateway: ${gateway.hardwareId} (${gateway.id})`);

  // 9. Create Sample SKUs
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
      update: {
        shelfId: shelf.id,
      },
      create: {
        hardwareId: tagHardwareId,
        storeId: store.id,
        gatewayId: gateway.id,
        skuId: sku.id,
        shelfId: shelf.id,
        size: item.size,
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

  console.log(`Seeded ${sampleSkus.length} SKUs with layout assignment & diverged tags.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
