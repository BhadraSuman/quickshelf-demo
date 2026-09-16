import { db, GatewayStatus } from '@quickshelf/db';
import type { HelloFrame } from '@quickshelf/esl-protocol';

export class InventoryReconciler {
  /**
   * Reconciles gateway fleet inventory received in a `hello` frame on reconnect.
   */
  public async reconcileInventory(hello: HelloFrame): Promise<void> {
    const { gatewayId, firmware, tags } = hello;

    console.log(
      `[InventoryReconciler] Reconciling reconnect inventory for ${gatewayId} (${tags.length} tags)`
    );

    const gateway = await db.gateway.findUnique({
      where: { hardwareId: gatewayId },
    });

    if (!gateway) {
      console.warn(`[InventoryReconciler] Unknown gateway: ${gatewayId}`);
      return;
    }

    // 1. Mark gateway ONLINE and update firmware
    await db.gateway.update({
      where: { id: gateway.id },
      data: {
        status: GatewayStatus.ONLINE,
        firmware,
        lastSeenAt: new Date(),
      },
    });

    // 2. Diff tag inventory against database reported state
    for (const item of tags) {
      const tag = await db.tag.findUnique({
        where: { hardwareId: item.tagId },
      });

      if (!tag) continue;

      // If hardware actually has a newer version than our reportedVersion, advance it
      if (item.version > tag.reportedVersion) {
        await db.tag.update({
          where: { id: tag.id },
          data: {
            reportedVersion: item.version,
            reportedHash: item.hash,
            batteryPct: item.battery,
            reportedAt: new Date(),
          },
        });
      }
    }
  }
}
