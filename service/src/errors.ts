import type { FastifyInstance, FastifyReply } from 'fastify';
import { ValidationError } from '@paybysquare/core';

function isValidationError(error: unknown): error is ValidationError {
  return (
    error instanceof ValidationError ||
    (error instanceof Error &&
      error.name === 'ValidationError' &&
      typeof (error as { field?: unknown }).field === 'string')
  );
}

export function sendUnauthorized(reply: FastifyReply): FastifyReply {
  return reply
    .code(401)
    .header('www-authenticate', 'Bearer')
    .send({ error: { message: 'unauthorized' } });
}

/**
 * Map thrown errors to the response envelope. Validation errors surface their
 * `field`; other client errors keep their message; anything else is logged
 * server-side and returned as a generic 500 so internals never leak.
 */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: Error, request, reply) => {
    if (isValidationError(error)) {
      return reply
        .code(400)
        .send({ error: { message: error.message, field: error.field } });
    }
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500) {
      return reply.code(statusCode).send({ error: { message: error.message } });
    }
    request.log.error(error);
    return reply.code(500).send({ error: { message: 'internal error' } });
  });
}
