import { Redis } from 'ioredis';
import { EventEmitter } from 'node:events';

export interface IHubRedis {
  setConnection(gatewayId: string, metadata: { replicaId: string; connectedAt: string }, ttlSec: number): Promise<void>;
  refreshConnection(gatewayId: string, ttlSec: number): Promise<void>;
  removeConnection(gatewayId: string): Promise<void>;
  publishEvent(channel: string, message: string): Promise<void>;
  subscribe(channel: string, handler: (message: string) => void): Promise<void>;
  unsubscribe(channel: string): Promise<void>;
  disconnect(): Promise<void>;
}

export class HubRedisClient implements IHubRedis {
  private client: Redis;
  private subClient: Redis;
  private subscriptions: Map<string, (message: string) => void> = new Map();

  constructor(redisUrl: string) {
    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      retryStrategy: (times: number) => Math.min(times * 100, 3000),
      lazyConnect: true,
    });
    this.subClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      retryStrategy: (times: number) => Math.min(times * 100, 3000),
      lazyConnect: true,
    });

    this.subClient.on('message', (channel: string, message: string) => {
      const handler = this.subscriptions.get(channel);
      if (handler) {
        handler(message);
      }
    });
  }

  public async connect(): Promise<void> {
    await Promise.all([this.client.connect(), this.subClient.connect()]);
  }

  public async setConnection(
    gatewayId: string,
    metadata: { replicaId: string; connectedAt: string },
    ttlSec: number
  ): Promise<void> {
    const key = `gw:conn:${gatewayId}`;
    await this.client.set(key, JSON.stringify(metadata), 'EX', ttlSec);
  }

  public async refreshConnection(gatewayId: string, ttlSec: number): Promise<void> {
    const key = `gw:conn:${gatewayId}`;
    await this.client.expire(key, ttlSec);
  }

  public async removeConnection(gatewayId: string): Promise<void> {
    const key = `gw:conn:${gatewayId}`;
    await this.client.del(key);
  }

  public async publishEvent(channel: string, message: string): Promise<void> {
    await this.client.publish(channel, message);
  }

  public async subscribe(channel: string, handler: (message: string) => void): Promise<void> {
    this.subscriptions.set(channel, handler);
    await this.subClient.subscribe(channel);
  }

  public async unsubscribe(channel: string): Promise<void> {
    this.subscriptions.delete(channel);
    await this.subClient.unsubscribe(channel);
  }

  public async disconnect(): Promise<void> {
    await Promise.all([this.client.quit(), this.subClient.quit()]);
  }
}

/**
 * In-memory fallback for local integration tests without live Redis server.
 */
export class InMemoryHubRedis implements IHubRedis {
  private static emitter = new EventEmitter();
  private connections: Map<string, { meta: string; expiresAt: number }> = new Map();

  public async setConnection(
    gatewayId: string,
    metadata: { replicaId: string; connectedAt: string },
    ttlSec: number
  ): Promise<void> {
    this.connections.set(`gw:conn:${gatewayId}`, {
      meta: JSON.stringify(metadata),
      expiresAt: Date.now() + ttlSec * 1000,
    });
  }

  public async refreshConnection(gatewayId: string, ttlSec: number): Promise<void> {
    const conn = this.connections.get(`gw:conn:${gatewayId}`);
    if (conn) {
      conn.expiresAt = Date.now() + ttlSec * 1000;
    }
  }

  public async removeConnection(gatewayId: string): Promise<void> {
    this.connections.delete(`gw:conn:${gatewayId}`);
  }

  public async publishEvent(channel: string, message: string): Promise<void> {
    InMemoryHubRedis.emitter.emit(channel, message);
  }

  public async subscribe(channel: string, handler: (message: string) => void): Promise<void> {
    InMemoryHubRedis.emitter.on(channel, handler);
  }

  public async unsubscribe(channel: string): Promise<void> {
    InMemoryHubRedis.emitter.removeAllListeners(channel);
  }

  public async disconnect(): Promise<void> {
    this.connections.clear();
  }
}
