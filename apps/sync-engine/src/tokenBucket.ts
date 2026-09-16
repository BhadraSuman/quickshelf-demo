import { Redis } from 'ioredis';

export interface ITokenBucket {
  takeTokens(gatewayId: string, count: number, ratePerSec: number): Promise<number>;
}

export class RedisTokenBucket implements ITokenBucket {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Evaluates token bucket atomically in Redis using a Lua script.
   */
  public async takeTokens(
    gatewayId: string,
    requestedTokens: number,
    ratePerSec: number
  ): Promise<number> {
    const key = `gw:bucket:${gatewayId}`;
    const now = Date.now();

    // Lua script to calculate refill and consume available tokens
    const luaScript = `
      local key = KEYS[1]
      local requested = tonumber(ARGV[1])
      local rate = tonumber(ARGV[2])
      local now = tonumber(ARGV[3])
      local capacity = rate

      local bucket = redis.call('HMGET', key, 'tokens', 'lastRefill')
      local currentTokens = tonumber(bucket[1])
      local lastRefill = tonumber(bucket[2])

      if not currentTokens or not lastRefill then
        currentTokens = capacity
        lastRefill = now
      else
        local elapsedMs = now - lastRefill
        local refill = math.floor((elapsedMs / 1000) * rate)
        if refill > 0 then
          currentTokens = math.min(capacity, currentTokens + refill)
          lastRefill = now
        end
      end

      local granted = math.min(requested, currentTokens)
      currentTokens = currentTokens - granted

      redis.call('HMSET', key, 'tokens', currentTokens, 'lastRefill', lastRefill)
      redis.call('EXPIRE', key, 60)

      return granted
    `;

    const granted = await this.redis.eval(luaScript, 1, key, requestedTokens, ratePerSec, now);
    return Number(granted);
  }
}

export class InMemoryTokenBucket implements ITokenBucket {
  private buckets: Map<string, { tokens: number; lastRefill: number }> = new Map();

  public async takeTokens(
    gatewayId: string,
    requestedTokens: number,
    ratePerSec: number
  ): Promise<number> {
    const now = Date.now();
    const capacity = ratePerSec;
    let b = this.buckets.get(gatewayId);

    if (!b) {
      b = { tokens: capacity, lastRefill: now };
      this.buckets.set(gatewayId, b);
    } else {
      const elapsedMs = now - b.lastRefill;
      const refill = (elapsedMs / 1000) * ratePerSec;
      if (refill > 0) {
        b.tokens = Math.min(capacity, b.tokens + refill);
        b.lastRefill = now;
      }
    }

    const granted = Math.min(requestedTokens, Math.floor(b.tokens));
    b.tokens -= granted;
    return granted;
  }
}
