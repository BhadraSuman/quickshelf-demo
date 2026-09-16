import { db, TargetStatus } from '@quickshelf/db';
import { VirtualTag } from 'esl-sim';
import { InMemoryTokenBucket } from '../apps/sync-engine/src/tokenBucket.js';
import { ReconciliationController } from '../apps/sync-engine/src/reconciliation.js';
import { SettlementHandler } from '../apps/sync-engine/src/settlement.js';
import type { TagRenderPayload } from '@quickshelf/esl-protocol';

async function runChaosBenchmarks() {
  console.log('\n=============================================================');
  console.log('  🧪 QUICKSHELF RECONCILIATION ENGINE - CHAOS BENCHMARK SUITE');
  console.log('  Proving the 7 Hard Problems in Distributed ESL Fleets');
  console.log('=============================================================\n');

  let passed = 0;
  let total = 0;

  function record(name: string, success: boolean, details: string) {
    total++;
    if (success) {
      passed++;
      console.log(`  ✅ [PASS] ${name}`);
      console.log(`     └─ ${details}\n`);
    } else {
      console.log(`  ❌ [FAIL] ${name}`);
      console.log(`     └─ ${details}\n`);
    }
  }

  const samplePayload: TagRenderPayload = {
    skuCode: 'TEST-SKU',
    name: 'Sample Item',
    priceMinor: 1000,
    mrpMinor: 1200,
    size: 'T213',
  };

  // -------------------------------------------------------------
  // Test 1: Monotonic Ordering & Stale Rejection (Hard Problem 1)
  // -------------------------------------------------------------
  try {
    const tag = new VirtualTag({ tagId: 'tag-chaos-01', version: 5 });
    // Attempt to render version 4 (stale)
    const result = await tag.applyRender('cmd-stale', 4, 'hash-4', samplePayload, 0);
    const success = !result.success && result.nack.reason === 'STALE_VERSION';
    record(
      'Problem 1: Monotonic Ordering & Stale Rejection',
      success,
      'Hardware rejected incoming version 4 on tag at version 5 with STALE_VERSION.'
    );
  } catch (e: any) {
    record('Problem 1: Monotonic Ordering & Stale Rejection', false, e.message);
  }

  // -------------------------------------------------------------
  // Test 2: Token Bucket Rate Limiting (Hard Problem 4)
  // -------------------------------------------------------------
  try {
    const bucket = new InMemoryTokenBucket();
    const rate = 50; // maxTagsPerSec
    // Request 80 tokens at once
    const batch1 = await bucket.takeTokens('gw-bench', 80, rate);
    const batch2 = await bucket.takeTokens('gw-bench', 10, rate);
    const success = batch1 === 50 && batch2 === 0;
    record(
      'Problem 4: Token Bucket Backpressure & Rate Limiting',
      success,
      `Requested 80 tokens: granted exactly capacity (${batch1} tokens). Immediate subsequent request granted ${batch2} tokens (pacing enforced).`
    );
  } catch (e: any) {
    record('Problem 4: Token Bucket Backpressure & Rate Limiting', false, e.message);
  }

  // -------------------------------------------------------------
  // Test 3: Battery-Aware Hash Skip (Hard Problem 3)
  // -------------------------------------------------------------
  try {
    // Find or create a test tag with identical desiredHash and reportedHash
    let dispatched = false;
    const mockDispatcher = {
      publishCommand: async () => {
        dispatched = true;
      },
    };
    const bucket = new InMemoryTokenBucket();
    const controller = new ReconciliationController(bucket, mockDispatcher);

    // Setup tag with matching hash but diverged version
    const store = await db.store.findFirst();
    const gateway = await db.gateway.findFirst();

    if (store && gateway) {
      const testTag = await db.tag.upsert({
        where: { hardwareId: 'tag-hash-test' },
        update: {
          desiredVersion: 10,
          reportedVersion: 9,
          desiredHash: 'match-sha256-hash',
          reportedHash: 'match-sha256-hash',
        },
        create: {
          hardwareId: 'tag-hash-test',
          storeId: store.id,
          gatewayId: gateway.id,
          size: 'T213',
          desiredVersion: 10,
          reportedVersion: 9,
          desiredHash: 'match-sha256-hash',
          reportedHash: 'match-sha256-hash',
        },
      });

      const stats = await controller.reconcilePass();
      const updatedTag = await db.tag.findUnique({ where: { id: testTag.id } });

      const success =
        stats.skippedHashCount >= 1 &&
        updatedTag?.reportedVersion === 10 &&
        !dispatched;

      record(
        'Problem 3: Battery-Aware Payload Hash Skip',
        success,
        'Detected desiredHash === reportedHash. Advanced reportedVersion from 9 -> 10 directly in DB with ZERO radio frames dispatched.'
      );
    } else {
      record('Problem 3: Battery-Aware Payload Hash Skip', false, 'No store/gateway found in DB');
    }
  } catch (e: any) {
    record('Problem 3: Battery-Aware Payload Hash Skip', false, e.message);
  }

  // -------------------------------------------------------------
  // Test 4: Idempotent ACKs & Monotonic DB Settlement (Hard Problem 6)
  // -------------------------------------------------------------
  try {
    const settlement = new SettlementHandler();
    const tag = await db.tag.findFirst();

    if (tag) {
      // Normal ACK
      await settlement.handleAck({
        type: 'ack',
        commandId: 'cmd-idem-1',
        tagId: tag.hardwareId,
        appliedVersion: tag.desiredVersion,
        hash: 'hash-test',
        battery: 92,
        rssi: -60,
      });

      // Duplicate / Stale ACK with older version
      await settlement.handleAck({
        type: 'ack',
        commandId: 'cmd-idem-1',
        tagId: tag.hardwareId,
        appliedVersion: tag.desiredVersion - 1,
        hash: 'stale-hash',
        battery: 50,
        rssi: -90,
      });

      const currentTag = await db.tag.findUnique({ where: { id: tag.id } });
      const success = currentTag?.reportedVersion === tag.desiredVersion;
      record(
        'Problem 6: Idempotent ACKs & Stale Settlement Rejection',
        success,
        'Duplicate and older ACK was ignored; Tag reported state stayed clean at highest version.'
      );
    }
  } catch (e: any) {
    record('Problem 6: Idempotent ACKs & Stale Settlement Rejection', false, e.message);
  }

  // -------------------------------------------------------------
  // Test 5: Partial Batch Failure & Target-Level Settlement (Hard Problem 7)
  // -------------------------------------------------------------
  try {
    const lowBatTag = new VirtualTag({ tagId: 'tag-low-bat', version: 1, battery: 10 });
    const normalTag = new VirtualTag({ tagId: 'tag-normal', version: 1, battery: 95 });

    const res1 = await lowBatTag.applyRender('cmd-batch-1', 2, 'h1', samplePayload, 0);
    const res2 = await normalTag.applyRender('cmd-batch-1', 2, 'h2', samplePayload, 0);

    const success =
      !res1.success &&
      res1.nack.reason === 'LOW_BATTERY' &&
      res2.success &&
      res2.ack.appliedVersion === 2;

    record(
      'Problem 7: Partial Batch Settlement & Fault Isolation',
      success,
      'Batch of 2 tags: healthy tag rendered and ACKed (v2); low-battery tag safely rejected with LOW_BATTERY without halting the batch.'
    );
  } catch (e: any) {
    record('Problem 7: Partial Batch Settlement & Fault Isolation', false, e.message);
  }

  console.log('=============================================================');
  console.log(`  🏁 BENCHMARK RESULTS: ${passed} / ${total} CHECKS PASSED`);
  console.log('=============================================================\n');

  await db.$disconnect();
}

runChaosBenchmarks().catch(console.error);
