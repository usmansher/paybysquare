<?php

declare(strict_types=1);

namespace PayBySquare\Laravel\Tests;

use BaconQrCode\Writer;
use PayBySquare\Laravel\Facades\PayBySquare;

final class QrSvgTest extends TestCase
{
    private const PAYMENT = [
        'amount' => 12.34,
        'iban' => 'SK7700000000000000000000',
        'beneficiaryName' => 'Example s.r.o.',
        'date' => '2026-01-15',
    ];

    public function testQrSvgReturnsInlineSvg(): void
    {
        if (!class_exists(Writer::class)) {
            $this->markTestSkipped('bacon/bacon-qr-code is not installed.');
        }

        $svg = PayBySquare::qrSvg(self::PAYMENT, 200);

        $this->assertStringContainsString('<svg', $svg);
        $this->assertStringContainsString('width="200"', $svg);
    }
}
