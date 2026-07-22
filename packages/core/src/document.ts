import { buildDataString, ValidationError } from './payment.js';
import type { PaymentInput } from './payment.js';

/**
 * By Square document version encoded in the second header byte. v1 of this
 * suite emits version 0 only.
 */
export const BY_SQUARE_VERSION = 0;

/**
 * Supported By Square document types. v1 implements only the simple payment
 * order; the frame header and data-string builder are selected per type, so
 * further types (standing orders, direct debits, …) slot in here without a
 * breaking change (see spec/SPEC.md).
 */
export type DocumentType = 'payment';

export interface DocumentDescriptor<TInput> {
  /** Value of the frame header's first byte (the document type code). */
  readonly typeCode: number;
  /** Build the normative tab-separated data string for this document type. */
  readonly buildDataString: (input: TInput) => string;
}

const DOCUMENTS: { readonly payment: DocumentDescriptor<PaymentInput> } = {
  payment: { typeCode: 0x00, buildDataString },
};

/** Look up a document descriptor, rejecting unknown types at runtime. */
export function documentFor(type: DocumentType): DocumentDescriptor<PaymentInput> {
  const descriptor = DOCUMENTS[type];
  if (descriptor === undefined) {
    throw new ValidationError(
      `unsupported document type "${type}"`,
      'documentType',
    );
  }
  return descriptor;
}
