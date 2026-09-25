import { Redis } from 'ioredis';
import { getConfig } from '@quickshelf/config';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;

  try {
    const config = getConfig();
    redisClient = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // don't loop endlessly if redis is not running
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    redisClient.on('error', (err) => {
      // suppress unhandled errors in local test environments
      console.warn('[API:Redis] Warning:', err?.message || 'Redis connection error');
    });

    return redisClient;
  } catch (err: any) {
    console.warn('[API:Redis] Could not initialize Redis client:', err?.message);
    return null;
  }
}

export async function publishGatewayCommand(gatewayHardwareId: string, frame: object): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    if (client.status !== 'ready' && client.status !== 'connecting') {
      await client.connect().catch(() => {});
    }
    if (client.status === 'ready') {
      const channel = `gw:dispatch:${gatewayHardwareId}`;
      await client.publish(channel, JSON.stringify(frame));
      return true;
    }
  } catch (err: any) {
    console.warn(`[API:Redis] Failed to publish command to ${gatewayHardwareId}:`, err?.message);
  }
  return false;
}
