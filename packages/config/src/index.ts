import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load .env from workspace root if available
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().default('postgresql://quickshelf:quickshelf_dev@localhost:5432/quickshelf?schema=public'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  GATEWAY_HUB_HOST: z.string().default('localhost'),
  GATEWAY_HUB_PORT: z.coerce.number().default(8080),
  API_PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Config = z.infer<typeof envSchema>;

let cachedConfig: Config | null = null;

export function getConfig(): Config {
  if (!cachedConfig) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      console.error('Invalid environment configuration:', result.error.format());
      throw new Error('Invalid environment configuration');
    }
    cachedConfig = result.data;
  }
  return cachedConfig;
}
