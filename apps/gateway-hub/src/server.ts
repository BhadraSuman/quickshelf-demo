import { WebSocketServer, WebSocket } from 'ws';
import { randomBytes } from 'node:crypto';
import {
  parseGatewayToCloudFrame,
  parseCloudToGatewayFrame,
  type GatewayToCloudFrame,
  type CloudToGatewayFrame,
} from '@quickshelf/esl-protocol';
import type { IHubRedis } from './redis.js';

export interface GatewayHubServerOptions {
  port: number;
  host?: string;
  redis: IHubRedis;
  replicaId?: string;
}

export class GatewayHubServer {
  public readonly port: number;
  public readonly host: string;
  public readonly replicaId: string;
  private redis: IHubRedis;
  private wss: WebSocketServer | null = null;
  private activeSockets: Map<string, WebSocket> = new Map();
  private socketToGateway: Map<WebSocket, string> = new Map();

  constructor(options: GatewayHubServerOptions) {
    this.port = options.port;
    this.host = options.host ?? '0.0.0.0';
    this.redis = options.redis;
    this.replicaId = options.replicaId ?? `hub-${randomBytes(4).toString('hex')}`;
  }

  public async start(): Promise<void> {
    return new Promise((resolve) => {
      this.wss = new WebSocketServer({ port: this.port, host: this.host }, () => {
        console.log(
          `[GatewayHub:${this.replicaId}] Listening on ws://${this.host}:${this.port}`
        );
        resolve();
      });

      this.wss.on('connection', (ws: WebSocket) => {
        this.handleConnection(ws);
      });
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      for (const [gatewayId] of this.activeSockets) {
        this.redis.removeConnection(gatewayId).catch(() => {});
        this.redis.unsubscribe(`gw:dispatch:${gatewayId}`).catch(() => {});
      }
      this.activeSockets.clear();
      this.socketToGateway.clear();

      if (this.wss) {
        this.wss.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  private handleConnection(ws: WebSocket): void {
    console.log(`[GatewayHub:${this.replicaId}] New client connected.`);

    ws.on('message', async (data: Buffer | string) => {
      try {
        const raw = data.toString('utf-8');
        const frame = parseGatewayToCloudFrame(raw);
        await this.handleGatewayFrame(ws, frame);
      } catch (err: any) {
        console.error(`[GatewayHub] Frame parse error:`, err?.message ?? err);
      }
    });

    ws.on('close', async () => {
      const gatewayId = this.socketToGateway.get(ws);
      if (gatewayId) {
        console.warn(
          `[GatewayHub:${this.replicaId}] Gateway disconnected: ${gatewayId}`
        );
        this.activeSockets.delete(gatewayId);
        this.socketToGateway.delete(ws);
        await this.redis.removeConnection(gatewayId);
        await this.redis.unsubscribe(`gw:dispatch:${gatewayId}`);
      }
    });

    ws.on('error', (err) => {
      console.error(`[GatewayHub] Socket error:`, err.message);
    });
  }

  private async handleGatewayFrame(
    ws: WebSocket,
    frame: GatewayToCloudFrame
  ): Promise<void> {
    switch (frame.type) {
      case 'hello': {
        const gatewayId = frame.gatewayId;
        console.log(
          `[GatewayHub:${this.replicaId}] Hello received from ${gatewayId} (firmware: ${frame.firmware}, tags: ${frame.tags.length})`
        );

        this.activeSockets.set(gatewayId, ws);
        this.socketToGateway.set(ws, gatewayId);

        // Register in Redis with 30s TTL
        await this.redis.setConnection(
          gatewayId,
          {
            replicaId: this.replicaId,
            connectedAt: new Date().toISOString(),
          },
          30
        );

        // Subscribe to commands dispatched to this gateway
        await this.redis.subscribe(
          `gw:dispatch:${gatewayId}`,
          (commandRaw: string) => {
            this.forwardCommandToGateway(gatewayId, commandRaw);
          }
        );

        // Notify sync-engine of hello inventory frame
        await this.redis.publishEvent('gw:events', JSON.stringify(frame));
        break;
      }

      case 'heartbeat': {
        const gatewayId = frame.gatewayId;
        // Refresh Redis key TTL
        await this.redis.refreshConnection(gatewayId, 30);
        break;
      }

      case 'ack':
      case 'nack': {
        // Forward settlement to sync-engine
        await this.redis.publishEvent('gw:settlement', JSON.stringify(frame));
        break;
      }

      case 'telemetry': {
        await this.redis.publishEvent('gw:telemetry', JSON.stringify(frame));
        break;
      }
    }
  }

  public forwardCommandToGateway(gatewayId: string, commandJson: string): void {
    const ws = this.activeSockets.get(gatewayId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(commandJson);
    } else {
      console.warn(
        `[GatewayHub:${this.replicaId}] Cannot forward command: Gateway ${gatewayId} socket not open.`
      );
    }
  }
}
