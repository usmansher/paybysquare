import Fastify, { type FastifyInstance } from 'fastify';

import { registerAuth } from './auth.js';
import { registerErrorHandler } from './errors.js';
import { registerPlayground } from './playground.js';
import { registerRateLimit, resolveRateLimit } from './rateLimit.js';
import { registerRoutes } from './routes.js';

export interface AppOptions {
  /**
   * Bearer token required on POST endpoints. Defaults to
   * process.env.AUTH_TOKEN; when absent the API is open.
   */
  authToken?: string;
  /**
   * Max requests per minute. Defaults to process.env.RATE_LIMIT or 60.
   * Pass `false` to disable rate limiting (used by tests).
   */
  rateLimit?: number | false;
  /** Fastify logger option; disabled by default (tests, embedding). */
  logger?: boolean;
  /**
   * Serve the interactive dev playground at / and /playground.
   * Defaults to true; set PLAYGROUND=false (or pass false) to disable.
   */
  playground?: boolean;
}

/** Build the Fastify application (exported separately for tests). */
export function buildApp(opts: AppOptions = {}): FastifyInstance {
  const app = Fastify({ logger: opts.logger ?? false });

  registerRateLimit(app, resolveRateLimit(opts.rateLimit));
  registerAuth(app, opts.authToken ?? process.env.AUTH_TOKEN);
  registerErrorHandler(app);
  registerPlayground(app, opts.playground ?? process.env.PLAYGROUND !== 'false');
  registerRoutes(app);

  return app;
}
