import { db, CommandStatus, TargetStatus } from '@quickshelf/db';
import type { RenderBatchFrame, TagRenderPayload } from '@quickshelf/esl-protocol';
import { nanoid } from 'nanoid';
import type { ITokenBucket } from './tokenBucket.js';

export interface Dispatcher {
  publishCommand(gatewayHardwareId: string, frame: RenderBatchFrame): Promise<void>;
}

export class ReconciliationController {
  private tokenBucket: ITokenBucket;
  private dispatcher: Dispatcher;

  constructor(tokenBucket: ITokenBucket, dispatcher: Dispatcher) {
    this.tokenBucket = tokenBucket;
    this.dispatcher = dispatcher;
  }

  /**
   * Executes one pass of the reconciliation loop across all diverged tags.
   */
  public async reconcilePass(): Promise<{
    divergedCount: number;
    skippedHashCount: number;
    dispatchedCount: number;
  }> {
    // 1. Query diverged tags (utilizes partial index idx_tag_diverged)
    const divergedTags = await db.tag.findMany({
      where: {
        desiredVersion: {
          gt: db.tag.fields.reportedVersion,
        },
      },
      include: {
        gateway: true,
      },
    });

    if (divergedTags.length === 0) {
      return { divergedCount: 0, skippedHashCount: 0, dispatchedCount: 0 };
    }

    let skippedHashCount = 0;
    let dispatchedCount = 0;

    // 2. Battery-Aware Hash Skip (Hard Problem 3)
    const tagsNeedingRadio: typeof divergedTags = [];

    for (const tag of divergedTags) {
      if (
        tag.desiredHash &&
        tag.reportedHash &&
        tag.desiredHash === tag.reportedHash
      ) {
        // Hash matches! Bump reportedVersion directly without waking the BLE radio.
        await db.tag.update({
          where: { id: tag.id },
          data: {
            reportedVersion: tag.desiredVersion,
            reportedAt: new Date(),
          },
        });
        skippedHashCount++;
      } else {
        tagsNeedingRadio.push(tag);
      }
    }

    // 3. Group by Gateway
    const gatewayMap = new Map<string, typeof tagsNeedingRadio>();
    for (const tag of tagsNeedingRadio) {
      const gwId = tag.gateway.hardwareId;
      if (!gatewayMap.has(gwId)) {
        gatewayMap.set(gwId, []);
      }
      gatewayMap.get(gwId)!.push(tag);
    }

    // 4. Rate-limit and Dispatch per Gateway
    for (const [gatewayHwId, tags] of gatewayMap) {
      const gateway = tags[0].gateway;

      // Token bucket check
      const tokensGranted = await this.tokenBucket.takeTokens(
        gatewayHwId,
        tags.length,
        gateway.maxTagsPerSec
      );

      if (tokensGranted <= 0) {
        // Gateway bucket empty, skip this gateway until tokens refill
        continue;
      }

      const tagsToDispatch = tags.slice(0, tokensGranted);
      const commandId = `cmd-${nanoid(8)}`;

      // 5. Collapse & Mark older pending targets as SUPERSEDED (Hard Problem 2)
      await db.$transaction(async (tx) => {
        // Create Command
        const command = await tx.command.create({
          data: {
            id: commandId,
            gatewayId: gateway.id,
            status: CommandStatus.PENDING,
          },
        });

        const targetsPayload = [];

        for (const tag of tagsToDispatch) {
          // Supersede any earlier pending targets for this tag
          await tx.commandTarget.updateMany({
            where: {
              tagId: tag.id,
              status: TargetStatus.PENDING,
            },
            data: {
              status: TargetStatus.SUPERSEDED,
            },
          });

          // Create new target
          await tx.commandTarget.create({
            data: {
              commandId: command.id,
              tagId: tag.id,
              version: tag.desiredVersion,
              hash: tag.desiredHash ?? '',
              payload: tag.desiredPayload ?? {},
              status: TargetStatus.PENDING,
            },
          });

          targetsPayload.push({
            tagId: tag.hardwareId,
            version: tag.desiredVersion,
            hash: tag.desiredHash ?? '',
            payload: tag.desiredPayload as unknown as TagRenderPayload,
          });
        }

        // 6. Build RenderBatchFrame and dispatch
        const frame: RenderBatchFrame = {
          type: 'render_batch',
          commandId: command.id,
          targets: targetsPayload,
        };

        await this.dispatcher.publishCommand(gatewayHwId, frame);

        await tx.command.update({
          where: { id: command.id },
          data: {
            status: CommandStatus.DISPATCHED,
            dispatchedAt: new Date(),
          },
        });

        dispatchedCount += targetsPayload.length;
      });
    }

    return {
      divergedCount: divergedTags.length,
      skippedHashCount,
      dispatchedCount,
    };
  }
}
