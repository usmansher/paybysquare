import { generatePayload, ValidationError, type PaymentInput } from '@paybysquare/core';
import { QRCodeSVG } from 'qrcode.react';

export interface PayBySquareQrProps extends PaymentInput {
  /** Rendered QR width/height in pixels. */
  size?: number;
}

/**
 * Renders a Pay By Square payment QR entirely in the browser: it runs the
 * zero-dependency `@paybysquare/core` encoder to build the payload, then draws
 * the QR with `qrcode.react`. Invalid input surfaces the core's ValidationError
 * inline instead of a broken QR.
 */
export function PayBySquareQr({ size = 240, ...payment }: PayBySquareQrProps) {
  let payload: string;
  try {
    payload = generatePayload(payment);
  } catch (error) {
    const message =
      error instanceof ValidationError
        ? `${error.field}: ${error.message}`
        : error instanceof Error
          ? error.message
          : String(error);
    return (
      <div
        role="alert"
        style={{
          maxWidth: 320,
          padding: '0.75rem 1rem',
          border: '1px solid #d33',
          borderRadius: 8,
          color: '#b91c1c',
          background: '#fef2f2',
          font: '14px/1.5 system-ui, sans-serif',
        }}
      >
        <strong>Invalid payment</strong>
        <div style={{ marginTop: 4 }}>{message}</div>
      </div>
    );
  }

  return (
    <figure style={{ margin: 0, textAlign: 'center', font: '13px/1.5 system-ui, sans-serif' }}>
      <div style={{ display: 'inline-block', padding: 16, background: '#fff', borderRadius: 12 }}>
        <QRCodeSVG value={payload} size={size} level="M" />
      </div>
      <figcaption
        style={{
          marginTop: 12,
          maxWidth: size + 32,
          wordBreak: 'break-all',
          fontFamily: 'ui-monospace, monospace',
          fontSize: 11,
          opacity: 0.7,
        }}
      >
        {payload}
      </figcaption>
    </figure>
  );
}
