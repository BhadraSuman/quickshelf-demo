import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { registerRoutes } from './routes.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerOnboardingRoutes } from './routes/onboarding.js';

export async function createServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  });

  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  await registerAuthRoutes(app);
  await registerOnboardingRoutes(app);
  await registerRoutes(app);
  return app;
}
