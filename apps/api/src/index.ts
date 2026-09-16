import { getConfig } from '@quickshelf/config';
import { createServer } from './server.js';

const config = getConfig();

async function bootstrap() {
  const server = await createServer();

  try {
    await server.listen({ port: config.API_PORT, host: '0.0.0.0' });
    console.log(`[API] Server listening on http://0.0.0.0:${config.API_PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

bootstrap();
