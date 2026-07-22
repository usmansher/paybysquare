import type { FastifyInstance } from 'fastify';
import { buildApp, type AppOptions } from '../src/app.js';

/** Valid camelCase input used across tests (explicit date → deterministic). */
export const VALID_INPUT = {
  amount: 12.34,
  iban: 'SK7283300000009111111118',
  beneficiaryName: 'Jane Doe',
  currency: 'EUR',
  date: '2024-06-01',
  variableSymbol: '47',
};

export const PNG_MAGIC = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

/** Build the app with rate limiting disabled (default for tests). */
export function buildTestApp(opts: AppOptions = {}): FastifyInstance {
  return buildApp({ rateLimit: false, ...opts });
}
