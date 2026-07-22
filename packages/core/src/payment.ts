/** Input for a single simple payment order (spec/SPEC.md section 1). */
export interface PaymentInput {
  /** Payment amount; must be positive with at most 2 decimal places. */
  amount: number;
  /** Beneficiary account IBAN (spaces allowed, removed before encoding). */
  iban: string;
  /** Beneficiary name; required by this suite. */
  beneficiaryName: string;
  /** ISO 4217 code; defaults to EUR. */
  currency?: string;
  /** Payment date; defaults to today. Accepts Date or "YYYY-MM-DD". */
  date?: Date | string;
  /** BIC/SWIFT of the beneficiary bank (8 or 11 characters). */
  swift?: string;
  /** Variable symbol, up to 10 digits. */
  variableSymbol?: string;
  /** Constant symbol, up to 4 digits. */
  constantSymbol?: string;
  /** Specific symbol, up to 10 digits. */
  specificSymbol?: string;
  /** Free-form note, up to 140 characters. */
  note?: string;
  /** Beneficiary address line 1, up to 70 characters. */
  beneficiaryAddress1?: string;
  /** Beneficiary address line 2, up to 70 characters. */
  beneficiaryAddress2?: string;
}

/** Thrown when a {@link PaymentInput} violates the spec constraints. */
export class ValidationError extends Error {
  constructor(
    message: string,
    readonly field: string,
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

const IBAN_RE = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/;
const SWIFT_RE = /^[A-Z0-9]{8}([A-Z0-9]{3})?$/;
const CURRENCY_RE = /^[A-Z]{3}$/;

interface NormalizedPayment {
  amount: string;
  currency: string;
  date: string;
  variableSymbol: string;
  constantSymbol: string;
  specificSymbol: string;
  note: string;
  iban: string;
  swift: string;
  beneficiaryName: string;
  beneficiaryAddress1: string;
  beneficiaryAddress2: string;
}

function requireDigits(
  value: string,
  field: string,
  maxLength: number,
): string {
  if (value === '') {
    return value;
  }
  if (!/^[0-9]+$/.test(value) || value.length > maxLength) {
    throw new ValidationError(
      `${field} must be up to ${maxLength} digits, got "${value}"`,
      field,
    );
  }
  return value;
}

function requireMaxLength(
  value: string,
  field: string,
  maxLength: number,
): string {
  if (value.length > maxLength) {
    throw new ValidationError(
      `${field} must be at most ${maxLength} characters`,
      field,
    );
  }
  return value;
}

// Free-text fields are joined with tabs into the data string; a tab, newline,
// or carriage return would inject or shift fields (e.g. override the IBAN a
// consuming bank app reads). Reject all control characters at the boundary.
// eslint-disable-next-line no-control-regex
const CONTROL_CHAR_RE = /[\u0000-\u001f\u007f]/;

function requireNoControlChars(value: string, field: string): string {
  if (CONTROL_CHAR_RE.test(value)) {
    throw new ValidationError(
      `${field} must not contain control characters`,
      field,
    );
  }
  return value;
}

function formatAmount(amount: number): string {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    throw new ValidationError('amount must be a positive number', 'amount');
  }
  const cents = amount * 100;
  if (Math.abs(cents - Math.round(cents)) > 1e-6) {
    throw new ValidationError(
      'amount must have at most 2 decimal places',
      'amount',
    );
  }
  const rounded = Math.round(cents);
  if (rounded > 0xffffffff * 100) {
    throw new ValidationError('amount is too large', 'amount');
  }
  const whole = Math.floor(rounded / 100);
  const frac = rounded % 100;
  return `${whole}.${String(frac).padStart(2, '0')}`;
}

function formatDate(input: Date | string | undefined): string {
  if (input === undefined) {
    return formatDate(new Date());
  }
  if (typeof input === 'string') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      throw new ValidationError('date string must be YYYY-MM-DD', 'date');
    }
    const parsed = new Date(`${input}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) {
      throw new ValidationError(`invalid date "${input}"`, 'date');
    }
    return input.replaceAll('-', '');
  }
  if (Number.isNaN(input.getTime())) {
    throw new ValidationError('invalid Date object', 'date');
  }
  // Use UTC components so a Date and its equivalent "YYYY-MM-DD" string (which
  // is parsed as UTC above) always format to the same calendar date,
  // regardless of the server timezone.
  const y = input.getUTCFullYear();
  const m = String(input.getUTCMonth() + 1).padStart(2, '0');
  const d = String(input.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

export function normalizePayment(input: PaymentInput): NormalizedPayment {
  const iban = (input.iban ?? '').replaceAll(' ', '').toUpperCase();
  if (!IBAN_RE.test(iban)) {
    throw new ValidationError(`invalid IBAN "${input.iban}"`, 'iban');
  }

  const beneficiaryName = (input.beneficiaryName ?? '').trim();
  if (beneficiaryName === '') {
    throw new ValidationError('beneficiaryName is required', 'beneficiaryName');
  }
  requireMaxLength(beneficiaryName, 'beneficiaryName', 70);
  requireNoControlChars(beneficiaryName, 'beneficiaryName');

  const swift = (input.swift ?? '').toUpperCase();
  if (swift !== '' && !SWIFT_RE.test(swift)) {
    throw new ValidationError(`invalid SWIFT/BIC "${input.swift}"`, 'swift');
  }

  const currency = input.currency ?? 'EUR';
  if (!CURRENCY_RE.test(currency)) {
    throw new ValidationError(
      `currency must be a 3-letter ISO 4217 code, got "${currency}"`,
      'currency',
    );
  }

  return {
    amount: formatAmount(input.amount),
    currency,
    date: formatDate(input.date),
    variableSymbol: requireDigits(
      input.variableSymbol ?? '',
      'variableSymbol',
      10,
    ),
    constantSymbol: requireDigits(
      input.constantSymbol ?? '',
      'constantSymbol',
      4,
    ),
    specificSymbol: requireDigits(
      input.specificSymbol ?? '',
      'specificSymbol',
      10,
    ),
    note: requireNoControlChars(
      requireMaxLength(input.note ?? '', 'note', 140),
      'note',
    ),
    iban,
    swift,
    beneficiaryName,
    beneficiaryAddress1: requireNoControlChars(
      requireMaxLength(
        input.beneficiaryAddress1 ?? '',
        'beneficiaryAddress1',
        70,
      ),
      'beneficiaryAddress1',
    ),
    beneficiaryAddress2: requireNoControlChars(
      requireMaxLength(
        input.beneficiaryAddress2 ?? '',
        'beneficiaryAddress2',
        70,
      ),
      'beneficiaryAddress2',
    ),
  };
}

/**
 * Build the normative tab-separated data string
 * (spec/SPEC.md section 3) for a validated payment.
 */
export function buildDataString(input: PaymentInput): string {
  const p = normalizePayment(input);
  return [
    '',
    '1',
    '1',
    p.amount,
    p.currency,
    p.date,
    p.variableSymbol,
    p.constantSymbol,
    p.specificSymbol,
    '',
    p.note,
    '1',
    p.iban,
    p.swift,
    '0',
    '0',
    p.beneficiaryName,
    p.beneficiaryAddress1,
    p.beneficiaryAddress2,
  ].join('\t');
}
