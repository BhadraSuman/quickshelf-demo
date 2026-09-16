import { WebSocket } from 'ws';
import {
  parseCloudToGatewayFrame,
  type CloudToGatewayFrame,
  type GatewayToCloudFrame,
  type HelloFrame,
  type HeartbeatFrame,
  type AckFrame,
  type NackFrame,
} from '@quickshelf/esl-protocol';
import { VirtualTag } from './tag.js';

export interface VirtualGatewayOptions {
  gatewayId: string;
  firmware?: string;
  hubUrl: string;
  heartbeatMs?: number;
  simulatedLatencyMs?: number;
}

export class VirtualGateway {
  public readonly gatewayId: string;
  public readonly firmware: string;
  public readonly hubUrl: string;
  public heartbeatMs: number;
  public simulatedLatencyMs: number;

  private tags: Map<string, VirtualTag> = new Map();
  private ws: WebSocket | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private startTime: number = Date.now();
  private isRunning: boolean = false;
  private reconnectAttempts: number = 0;

  constructor(options: VirtualGatewayOptions) {
    this.gatewayId = options.gatewayId;
    this.firmware = options.firmware ?? 'v1.0.0';
    this.hubUrl = options.hubUrl;
    this.heartbeatMs = options.heartbeatMs ?? 15000;
    this.simulatedLatencyMs = options.simulatedLatencyMs ?? 20;
  }

  public registerTag(tag: VirtualTag): void {
    this.tags.set(tag.tagId, tag);
  }

  public getTag(tagId: string): VirtualTag | undefined {
    return this.tags.get(tagId);
  }

  public getAllTags(): VirtualTag[] {
    return Array.from(this.tags.values());
  }

  public start(): void {
    this.isRunning = true;
    this.startTime = Date.now();
    this.connect();
  }

  public stop(): void {
    this.isRunning = false;
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private connect(): void {
    if (!this.isRunning) return;

    console.log(`[${this.gatewayId}] Connecting to Gateway Hub at ${this.hubUrl}...`);
    const ws = new WebSocket(this.hubUrl);
    this.ws = ws;

    ws.on('open', () => {
      console.log(`[${this.gatewayId}] Connected. Sending 'hello' frame...`);
      this.reconnectAttempts = 0;
      this.sendHello();
      this.startHeartbeat();
    });

    ws.on('message', async (data: Buffer | string) => {
      try {
        const raw = data.toString('utf-8');
        const frame = parseCloudToGatewayFrame(raw);
        await this.handleFrame(frame);
      } catch (err) {
        console.error(`[${this.gatewayId}] Failed to handle frame:`, err);
      }
    });

    ws.on('close', () => {
      this.stopHeartbeat();
      console.warn(`[${this.gatewayId}] Connection closed.`);
      if (this.isRunning) {
        this.scheduleReconnect();
      }
    });

    ws.on('error', (err) => {
      console.error(`[${this.gatewayId}] Socket error:`, err.message);
    });
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 15000);
    console.log(`[${this.gatewayId}] Reconnecting in ${(delay / 1000).toFixed(1)}s...`);
    setTimeout(() => {
      if (this.isRunning) {
        this.connect();
      }
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.heartbeatMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  public sendFrame(frame: GatewayToCloudFrame): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(frame));
    }
  }

  private sendHello(): void {
    const inventory = Array.from(this.tags.values()).map((t) => t.toInventory());
    const hello: HelloFrame = {
      type: 'hello',
      gatewayId: this.gatewayId,
      firmware: this.firmware,
      tags: inventory,
    };
    this.sendFrame(hello);
  }

  private sendHeartbeat(): void {
    const uptimeSec = Math.floor((Date.now() - this.startTime) / 1000);
    const heartbeat: HeartbeatFrame = {
      type: 'heartbeat',
      gatewayId: this.gatewayId,
      uptime: uptimeSec,
      connectedTagCount: this.tags.size,
    };
    this.sendFrame(heartbeat);
  }

  private async handleFrame(frame: CloudToGatewayFrame): Promise<void> {
    switch (frame.type) {
      case 'sync_request': {
        console.log(`[${this.gatewayId}] Received 'sync_request'. Sending fresh 'hello'...`);
        this.sendHello();
        break;
      }

      case 'config': {
        console.log(`[${this.gatewayId}] Received 'config':`, frame);
        if (frame.heartbeatMs && frame.heartbeatMs !== this.heartbeatMs) {
          this.heartbeatMs = frame.heartbeatMs;
          this.startHeartbeat();
        }
        break;
      }

      case 'render_batch': {
        console.log(
          `[${this.gatewayId}] Received 'render_batch' (cmd: ${frame.commandId}, targets: ${frame.targets.length})`
        );
        for (const target of frame.targets) {
          const tag = this.tags.get(target.tagId);
          if (!tag) {
            const nack: NackFrame = {
              type: 'nack',
              commandId: frame.commandId,
              tagId: target.tagId,
              reason: 'TAG_UNREACHABLE',
            };
            this.sendFrame(nack);
            continue;
          }

          const result = await tag.applyRender(
            frame.commandId,
            target.version,
            target.hash,
            target.payload,
            this.simulatedLatencyMs
          );

          if (result.success) {
            const ack: AckFrame = {
              type: 'ack',
              ...result.ack,
            };
            this.sendFrame(ack);
          } else {
            const nack: NackFrame = {
              type: 'nack',
              ...result.nack,
            };
            this.sendFrame(nack);
          }
        }
        break;
      }
    }
  }
}
