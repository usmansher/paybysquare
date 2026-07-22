import { createHash, timingSafeEqual } from 'node:crypto';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { sendUnauthorized } from './errors.js';

/**
 * Constant-time bearer-token check. Both sides are SHA-256 hashed first so the
 * comparison is over fixed-length buffers, removing the length side-channel and
 * the byte-by-byte timing leak of a plain `!==` comparison.
 */
function isAuthorized(
  header: string | undefined,
  expectedToken: string,
): boolean {
  if (header === undefined || !header.startsWith('Bearer ')) {
    return false;
  }
  const provided = header.slice('Bearer '.length);
  const expectedHash = createHash('sha256').update(expectedToken).digest();
  const providedHash = createHash('sha256').update(provided).digest();
  return timingSafeEqual(expectedHash, providedHash);
}

/**
 * Require a bearer token on POST endpoints when `token` is set. When it is
 * absent the API is open — log a clear warning so an unauthenticated
 * deployment is never silent.
 */
export function registerAuth(
  app: FastifyInstance,
  token: string | undefined,
): void {
  if (token === undefined || token === '') {
    app.log.warn(
      'AUTH_TOKEN is not set: POST endpoints (/v1/payload, /v1/qr) are open to unauthenticated callers.',
    );
    return;
  }

  app.addHook(
    'onRequest',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (request.method !== 'POST') {
        return;
      }
      if (!isAuthorized(request.headers.authorization, token)) {
        return sendUnauthorized(reply);
      }
    },
  );
}
