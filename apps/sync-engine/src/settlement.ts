import { db, TargetStatus, CommandStatus } from '@quickshelf/db';
import type { AckFrame, NackFrame } from '@quickshelf/esl-protocol';

export class SettlementHandler {
  /**
   * Processes a successful ACK confirmation from a gateway.
   */
  public async handleAck(ack: AckFrame): Promise<void> {
    const { commandId, tagId, appliedVersion, hash, battery, rssi } = ack;

    await db.$transaction(async (tx) => {
      const tag = await tx.tag.findUnique({ where: { hardwareId: tagId } });
      if (!tag) {
        console.warn(`[Settlement] Tag not found for ACK: ${tagId}`);
        return;
      }

      // 1. Monotonic version invariant: ignore stale ACK if tag already has higher version
      if (appliedVersion < tag.reportedVersion) {
        console.warn(
          `[Settlement] Stale ACK ignored for tag ${tagId}. Applied: ${appliedVersion}, Current Reported: ${tag.reportedVersion}`
        );
        return;
      }

      // 2. Update Tag reported state
      await tx.tag.update({
        where: { id: tag.id },
        data: {
          reportedVersion: appliedVersion,
          reportedHash: hash,
          reportedAt: new Date(),
          batteryPct: battery,
          rssi: rssi,
        },
      });

      // 3. Update CommandTarget status
      const target = await tx.commandTarget.findUnique({
        where: {
          commandId_tagId: {
            commandId,
            tagId: tag.id,
          },
        },
      });

      if (target) {
        await tx.commandTarget.update({
          where: { id: target.id },
          data: {
            status: TargetStatus.ACKED,
            ackedAt: new Date(),
          },
        });

        // 4. Check if entire command is settled
        await this.checkAndSettleCommand(tx, commandId);
      }
    });
  }

  /**
   * Processes a NACK failure confirmation from a gateway.
   */
  public async handleNack(nack: NackFrame): Promise<void> {
    const { commandId, tagId, reason } = nack;

    await db.$transaction(async (tx) => {
      const tag = await tx.tag.findUnique({ where: { hardwareId: tagId } });
      if (!tag) return;

      const target = await tx.commandTarget.findUnique({
        where: {
          commandId_tagId: {
            commandId,
            tagId: tag.id,
          },
        },
      });

      if (target) {
        await tx.commandTarget.update({
          where: { id: target.id },
          data: {
            status: TargetStatus.FAILED,
            failure: reason,
          },
        });

        await this.checkAndSettleCommand(tx, commandId);
      }
    });
  }

  private async checkAndSettleCommand(tx: any, commandId: string): Promise<void> {
    const pendingTargets = await tx.commandTarget.count({
      where: {
        commandId,
        status: TargetStatus.PENDING,
      },
    });

    if (pendingTargets === 0) {
      await tx.command.update({
        where: { id: commandId },
        data: {
          status: CommandStatus.SETTLED,
          settledAt: new Date(),
        },
      });
    }
  }
}
