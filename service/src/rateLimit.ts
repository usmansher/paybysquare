import { createRequire } from 'node:module';

import type { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';

const DEFAULT_MAX = 60;

/** Resolve the per-minute request cap from the option or RATE_LIMIT env var. */
export function resolveRateLimit(
  option: number | false | undefined,
): number | false {
  if (option !== undefined) {
    return option;
  }
  const fromEnv = process.env.RATE_LIMIT;
  if (fromEnv !== undefined && fromEnv !== '') {
    const parsed = Number(fromEnv);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_MAX;
}

/**
 * Choose the rate-limit store. With REDIS_URL set the limit is shared across
 * instances (correct behind a load balancer); otherwise it is in-memory and
 * therefore per-instance — which we log loudly so the advertised limit is never
 * silently multiplied by the replica count.
 */
function resolveStore(app: FastifyInstance): { redis?: unknown } {
  const url = process.env.REDIS_URL;
  if (url === undefined || url === '') {
    app.log.warn(
      'Rate limiting uses an in-memory store: the cap is enforced per instance, ' +
        'so behind N replicas the effective limit is N× the configured value. ' +
        'Set REDIS_URL to share one limit across instances.',
    );
    return {};
  }

  type RedisClient = { quit(): Promise<unknown> };
  let Redis: new (url: string, opts: Record<string, unknown>) => RedisClient;
  try {
    Redis = createRequire(import.meta.url)('ioredis');
  } catch {
    throw new Error(
      'REDIS_URL is set but the optional "ioredis" package is not installed. ' +
        'Run: npm install ioredis',
    );
  }
  const client = new Redis(url, {
    connectTimeout: 500,
    maxRetriesPerRequest: 1,
  });
  // Release the connection on shutdown so app.close() exits cleanly.
  app.addHook('onClose', async () => {
    await client.quit();
  });
  app.log.info('Rate limiting uses a shared Redis store (REDIS_URL).');
  return { redis: client };
}

/** Register global rate limiting unless disabled (`max === false`, used by tests). */
export function registerRateLimit(
  app: FastifyInstance,
  max: number | false,
): void {
  if (max === false) {
    return;
  }
  void app.register(rateLimit, {
    max,
    timeWindow: '1 minute',
    ...resolveStore(app),
  });
}
