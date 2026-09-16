import Fastify, { type FastifyInstance } from 'fastify';
import { registerRoutes } from './routes.js';

export async function createServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  });

  await registerRoutes(app);
  return app;
}
