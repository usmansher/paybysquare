<?php

declare(strict_types=1);

namespace PayBySquare;

use PayBySquare\Lzma\Lzma1Encoder;
use RuntimeException;

final class PayBySquare
{
    /** By Square document version encoded in the second header byte. */
    private const BY_SQUARE_VERSION = 0;

    /**
     * Frame header type code per supported document type. v1 implements only
     * the simple payment order; further types slot in here without a breaking
     * change (see spec/SPEC.md).
     */
    private const DOCUMENT_TYPE_CODES = [
        'payment' => 0x00,
    ];

    /**
     * Generate a Pay By Square payload string for a single payment order.
     *
     * The result is the text to put into a QR code, e.g. with bacon/qr-code
     * or any other QR library.
     *
     * `$documentType` selects the By Square document; v1 supports only
     * `'payment'` (the default).
     *
     * @param Payment|array<string, mixed> $payment
     */
    public static function generatePayload(Payment|array $payment, string $documentType = 'payment'): string
    {
        if (!isset(self::DOCUMENT_TYPE_CODES[$documentType])) {
            throw new ValidationException("unsupported document type \"{$documentType}\"", 'documentType');
        }
        $typeCode = self::DOCUMENT_TYPE_CODES[$documentType];

        if (is_array($payment)) {
            $payment = Payment::fromArray($payment);
        }

        $data = $payment->toDataString();
        $total = pack('V', crc32($data)) . $data;

        if (strlen($total) > 0xFFFF) {
            throw new RuntimeException('payment data too large for Pay By Square frame');
        }

        $compressed = Lzma1Encoder::compress($total);

        // Frame header: document type code, version, then the uncompressed
        // length as a little-endian uint16 (spec/SPEC.md section 2).
        $framed = chr($typeCode) . chr(self::BY_SQUARE_VERSION) . pack('v', strlen($total)) . $compressed;

        return Base32Hex::encode($framed);
    }
}
