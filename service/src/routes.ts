import type { FastifyInstance, FastifyReply } from 'fastify';
import QRCode from 'qrcode';
import { generatePayload } from '@paybysquare/core';

import { parsePaymentInput, parseQrOptions } from './input.js';
import { loadOpenApiDocument } from './openapi.js';

async function renderQr(
  reply: FastifyReply,
  payload: string,
  format: 'png' | 'svg',
  size: number,
): Promise<FastifyReply> {
  if (format === 'svg') {
    const svg = await QRCode.toString(payload, { type: 'svg' });
    return reply.type('image/svg+xml').send(svg);
  }
  const png = await QRCode.toBuffer(payload, { type: 'png', width: size });
  return reply.type('image/png').send(png);
}

/** Register the health, contract, and /v1 generation endpoints. */
export function registerRoutes(app: FastifyInstance): void {
  app.get('/healthz', async () => ({ status: 'ok' }));

  app.get('/v1/openapi.json', async () => loadOpenApiDocument());

  app.post('/v1/payload', async (request) => {
    const payload = generatePayload(parsePaymentInput(request.body));
    return { payload };
  });

  app.post('/v1/qr', async (request, reply) => {
    const { format, size } = parseQrOptions(
      request.query as Record<string, unknown>,
    );
    const payload = generatePayload(parsePaymentInput(request.body));
    return renderQr(reply, payload, format, size);
  });
}
