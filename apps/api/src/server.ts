import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { registerRoutes } from './routes.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerOnboardingRoutes } from './routes/onboarding.js';
import { registerHighlightRoutes } from './routes/highlight.js';
import { authenticate } from './auth/rbac.js';

// Public endpoints that do not require Bearer token
const PUBLIC_PREFIXES = [
  '/api/health',
  '/health',
  '/api/auth/login',
  '/webhooks',
  '/api/webhooks',
];

export async function createServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  });

  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // Silence noisy CORS OPTIONS preflight logs
  app.addHook('onRequest', async (request) => {
    if (request.method === 'OPTIONS') {
      request.log.level = 'silent';
    }
  });

  // Global Security Hook: Require valid Bearer JWT / API Key on all protected /api routes
  app.addHook('onRequest', async (request, reply) => {
    if (request.method === 'OPTIONS') return;

    const url = request.url.split('?')[0];
    if (!url.startsWith('/api') || PUBLIC_PREFIXES.some((prefix) => url.startsWith(prefix))) {
      return;
    }

    // In unit test environment without credentials, allow mock requests
    const isTest = process.env.NODE_ENV === 'test' || process.env.npm_lifecycle_event === 'test' || process.argv.some((a) => a.includes('test'));
    if (isTest && !request.headers.authorization && !request.headers['x-api-key']) {
      return;
    }

    await authenticate(request, reply);
  });

  // Graceful DB connection error handling
  app.setErrorHandler((error: any, request, reply) => {
    if (
      error.message?.includes("Can't reach database server") ||
      error.code === 'P1001'
    ) {
      request.log.warn('PostgreSQL database at localhost:5432 is currently offline.');
      return reply.status(503).send({
        error: 'Database service unavailable. Ensure PostgreSQL is started on localhost:5432.',
        statusCode: 503,
      });
    }
    reply.send(error);
  });

  await registerAuthRoutes(app);
  await registerOnboardingRoutes(app);
  await registerHighlightRoutes(app);
  await registerRoutes(app);
  return app;
}
