import { getConfig } from '@quickshelf/config';
import { GatewayHubServer } from './server.js';
import { HubRedisClient, InMemoryHubRedis } from './redis.js';

const config = getConfig();

async function bootstrap() {
  console.log('Bootstrapping Gateway Hub...');

  let redis;
  try {
    const liveRedis = new HubRedisClient(config.REDIS_URL);
    await liveRedis.connect();
    redis = liveRedis;
    console.log(`Connected to Redis at ${config.REDIS_URL}`);
  } catch (err) {
    console.warn(
      `Could not connect to Redis at ${config.REDIS_URL}, using in-memory pub/sub fallback for local testing.`
    );
    redis = new InMemoryHubRedis();
  }

  const server = new GatewayHubServer({
    port: config.GATEWAY_HUB_PORT,
    host: '0.0.0.0',
    redis,
  });

  await server.start();

  const shutdown = async () => {
    console.log('\nShutting down Gateway Hub...');
    await server.stop();
    await redis.disconnect();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  console.error('Fatal Gateway Hub error:', err);
  process.exit(1);
});
