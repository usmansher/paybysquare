import { base32hexEncode } from './base32hex.js';
import { crc32 } from './crc32.js';
import { BY_SQUARE_VERSION, documentFor } from './document.js';
import { lzma1Compress } from './lzma/encoder.js';
import type { PaymentInput } from './payment.js';
import type { DocumentType } from './document.js';

export { buildDataString, ValidationError } from './payment.js';
export type { PaymentInput } from './payment.js';
export type { DocumentType } from './document.js';

/**
 * Generate a Pay By Square payload string for a single payment order.
 *
 * The result is the text to put into a QR code, e.g. with the `qrcode`
 * package: `QRCode.toDataURL(generatePayload(payment))`.
 *
 * `documentType` selects the By Square document; v1 supports only `'payment'`
 * (the default). It is surfaced now so additional document types can be added
 * without changing this signature.
 */
export function generatePayload(
  input: PaymentInput,
  documentType: DocumentType = 'payment',
): string {
  const document = documentFor(documentType);
  const data = new TextEncoder().encode(document.buildDataString(input));

  const checksum = crc32(data);
  const total = new Uint8Array(4 + data.length);
  new DataView(total.buffer).setUint32(0, checksum, true);
  total.set(data, 4);

  if (total.length > 0xffff) {
    throw new RangeError('payment data too large for Pay By Square frame');
  }

  const compressed = lzma1Compress(total);

  // Frame header: document type code, version, then the uncompressed length as
  // a little-endian uint16 (spec/SPEC.md section 2).
  const framed = new Uint8Array(4 + compressed.length);
  framed[0] = document.typeCode;
  framed[1] = BY_SQUARE_VERSION;
  new DataView(framed.buffer).setUint16(2, total.length, true);
  framed.set(compressed, 4);

  return base32hexEncode(framed);
}
