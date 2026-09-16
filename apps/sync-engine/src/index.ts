import { getConfig } from '@quickshelf/config';
import { SyncEngine } from './engine.js';

const config = getConfig();

async function bootstrap() {
  console.log('Bootstrapping Sync Engine (Cloud Reconciliation Loop)...');

  const engine = new SyncEngine({
    redisUrl: config.REDIS_URL,
    intervalMs: 1000,
  });

  await engine.start();

  const shutdown = async () => {
    console.log('\nShutting down Sync Engine...');
    await engine.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  console.error('Fatal Sync Engine error:', err);
  process.exit(1);
});
