import { Redis } from 'ioredis';
import type { RenderBatchFrame } from '@quickshelf/esl-protocol';
import { ReconciliationController } from './reconciliation.js';
import { SettlementHandler } from './settlement.js';
import { InventoryReconciler } from './inventory.js';
import {
  RedisTokenBucket,
  InMemoryTokenBucket,
  type ITokenBucket,
} from './tokenBucket.js';

export interface SyncEngineOptions {
  redisUrl: string;
  intervalMs?: number;
}

export class SyncEngine {
  private redisUrl: string;
  private intervalMs: number;
  private redisPub: Redis | null = null;
  private redisSub: Redis | null = null;
  private tokenBucket: ITokenBucket;
  private reconciliationController: ReconciliationController | null = null;
  private settlementHandler: SettlementHandler;
  private inventoryReconciler: InventoryReconciler;
  private loopTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(options: SyncEngineOptions) {
    this.redisUrl = options.redisUrl;
    this.intervalMs = options.intervalMs ?? 1000;
    this.tokenBucket = new InMemoryTokenBucket(); // fallback until redis connects
    this.settlementHandler = new SettlementHandler();
    this.inventoryReconciler = new InventoryReconciler();
  }

  public async start(): Promise<void> {
    this.isRunning = true;

    try {
      this.redisPub = new Redis(this.redisUrl, {
        maxRetriesPerRequest: 2,
        lazyConnect: true,
      });
      this.redisSub = new Redis(this.redisUrl, {
        maxRetriesPerRequest: 2,
        lazyConnect: true,
      });

      await Promise.all([this.redisPub.connect(), this.redisSub.connect()]);
      this.tokenBucket = new RedisTokenBucket(this.redisPub);
      console.log(`[SyncEngine] Connected to Redis at ${this.redisUrl}`);
    } catch (err) {
      console.warn(
        `[SyncEngine] Redis connection failed, using in-memory token bucket and dispatcher mock.`
      );
      this.tokenBucket = new InMemoryTokenBucket();
    }

    // Set up dispatcher
    const dispatcher = {
      publishCommand: async (
        gatewayHwId: string,
        frame: RenderBatchFrame
      ): Promise<void> => {
        const payload = JSON.stringify(frame);
        if (this.redisPub) {
          await this.redisPub.publish(`gw:dispatch:${gatewayHwId}`, payload);
        }
      },
    };

    this.reconciliationController = new ReconciliationController(
      this.tokenBucket,
      dispatcher
    );

    // Subscribe to incoming settlement and events
    if (this.redisSub) {
      await this.redisSub.subscribe('gw:settlement', 'gw:events');
      this.redisSub.on('message', async (channel, message) => {
        try {
          const parsed = JSON.parse(message);
          if (channel === 'gw:settlement') {
            if (parsed.type === 'ack') {
              await this.settlementHandler.handleAck(parsed);
            } else if (parsed.type === 'nack') {
              await this.settlementHandler.handleNack(parsed);
            }
          } else if (channel === 'gw:events') {
            if (parsed.type === 'hello') {
              await this.inventoryReconciler.reconcileInventory(parsed);
            }
          }
        } catch (e) {
          console.error('[SyncEngine] Error processing redis message:', e);
        }
      });
    }

    this.startLoop();
  }

  private startLoop(): void {
    const tick = async () => {
      if (!this.isRunning) return;
      try {
        if (this.reconciliationController) {
          const stats = await this.reconciliationController.reconcilePass();
          if (stats.divergedCount > 0) {
            console.log(
              `[SyncEngine:Loop] Diverged: ${stats.divergedCount}, Skipped (Hash Match): ${stats.skippedHashCount}, Dispatched: ${stats.dispatchedCount}`
            );
          }
        }
      } catch (err) {
        console.error('[SyncEngine:Loop] Error during reconciliation pass:', err);
      } finally {
        if (this.isRunning) {
          this.loopTimer = setTimeout(tick, this.intervalMs);
        }
      }
    };

    this.loopTimer = setTimeout(tick, this.intervalMs);
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
    if (this.redisPub) await this.redisPub.quit();
    if (this.redisSub) await this.redisSub.quit();
  }
}
