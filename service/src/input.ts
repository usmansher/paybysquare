import { ValidationError, type PaymentInput } from '@paybysquare/core';

const STRING_FIELDS = [
  'iban',
  'beneficiaryName',
  'currency',
  'swift',
  'variableSymbol',
  'constantSymbol',
  'specificSymbol',
  'note',
  'beneficiaryAddress1',
  'beneficiaryAddress2',
] as const;

type StringField = (typeof STRING_FIELDS)[number];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function asRecord(body: unknown): Record<string, unknown> {
  if (body === undefined || body === null) {
    return {};
  }
  if (typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('request body must be a JSON object', 'body');
  }
  return body as Record<string, unknown>;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new ValidationError(`${field} must be a string`, field);
  }
  return value;
}

/**
 * Convert an untrusted JSON body (camelCase, /v1 endpoints) into a
 * {@link PaymentInput}. Only fields present in the body are set, so the
 * core library keeps its own defaults (currency EUR, date = today).
 */
export function parsePaymentInput(body: unknown): PaymentInput {
  const raw = asRecord(body);

  if (raw.amount !== undefined && typeof raw.amount !== 'number') {
    throw new ValidationError('amount must be a number', 'amount');
  }

  const input: PaymentInput = {
    // Core validates positivity, decimal places and IBAN/name contents.
    amount: raw.amount as number,
    iban: raw.iban === undefined ? '' : requireString(raw.iban, 'iban'),
    beneficiaryName:
      raw.beneficiaryName === undefined
        ? ''
        : requireString(raw.beneficiaryName, 'beneficiaryName'),
  };

  for (const field of STRING_FIELDS) {
    if (field === 'iban' || field === 'beneficiaryName') {
      continue;
    }
    const value = raw[field];
    if (value !== undefined) {
      input[field as Exclude<StringField, 'iban' | 'beneficiaryName'>] =
        requireString(value, field);
    }
  }

  if (raw.date !== undefined) {
    const date = requireString(raw.date, 'date');
    if (!DATE_RE.test(date)) {
      throw new ValidationError('date must be a string in YYYY-MM-DD format', 'date');
    }
    input.date = date;
  }

  return input;
}

export interface QrOptions {
  format: 'png' | 'svg';
  size: number;
}

export const QR_SIZE_MIN = 64;
export const QR_SIZE_MAX = 1024;
export const QR_SIZE_DEFAULT = 256;

/** Validate the /v1/qr query parameters. */
export function parseQrOptions(query: Record<string, unknown>): QrOptions {
  const format = query.format ?? 'png';
  if (format !== 'png' && format !== 'svg') {
    throw new ValidationError('format must be "png" or "svg"', 'format');
  }

  let size = QR_SIZE_DEFAULT;
  if (query.size !== undefined) {
    const parsed = Number(query.size);
    if (
      !Number.isInteger(parsed) ||
      parsed < QR_SIZE_MIN ||
      parsed > QR_SIZE_MAX
    ) {
      throw new ValidationError(
        `size must be an integer between ${QR_SIZE_MIN} and ${QR_SIZE_MAX}`,
        'size',
      );
    }
    size = parsed;
  }

  return { format, size };
}
