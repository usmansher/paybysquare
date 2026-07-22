<?php

declare(strict_types=1);

namespace PayBySquare\Laravel\Tests;

use PayBySquare\PayBySquare as LibraryPayBySquare;
use PayBySquare\Payment;
use PayBySquare\ValidationException;
use PayBySquare\Laravel\Facades\PayBySquare;

final class PayloadTest extends TestCase
{
    private const PAYMENT = [
        'amount' => 12.34,
        'iban' => 'SK7700000000000000000000',
        'beneficiaryName' => 'Example s.r.o.',
        'currency' => 'EUR',
        'date' => '2026-01-15',
        'variableSymbol' => '123',
    ];

    public function testFacadePayloadMatchesLibraryOutput(): void
    {
        $expected = LibraryPayBySquare::generatePayload(self::PAYMENT);

        $this->assertSame($expected, PayBySquare::payload(self::PAYMENT));
    }

    public function testFacadeAcceptsPaymentObject(): void
    {
        $payment = Payment::fromArray(self::PAYMENT);

        $this->assertSame(
            LibraryPayBySquare::generatePayload($payment),
            PayBySquare::payload($payment),
        );
    }

    public function testConfigDefaultsAreMergedForMissingKeys(): void
    {
        config()->set('paybysquare.iban', 'SK7700000000000000000000');
        config()->set('paybysquare.beneficiary_name', 'Config Beneficiary');

        $expected = LibraryPayBySquare::generatePayload([
            'amount' => 5,
            'iban' => 'SK7700000000000000000000',
            'beneficiaryName' => 'Config Beneficiary',
            'currency' => 'EUR',
            'date' => '2026-01-15',
        ]);

        $this->assertSame(
            $expected,
            PayBySquare::payload(['amount' => 5, 'date' => '2026-01-15']),
        );
    }

    public function testExplicitValuesWinOverConfigDefaults(): void
    {
        config()->set('paybysquare.iban', 'SK9900000000000000000099');
        config()->set('paybysquare.beneficiary_name', 'Config Beneficiary');

        $expected = LibraryPayBySquare::generatePayload(self::PAYMENT);

        $this->assertSame($expected, PayBySquare::payload(self::PAYMENT));
    }

    public function testValidationExceptionPropagates(): void
    {
        $this->expectException(ValidationException::class);

        try {
            PayBySquare::payload([
                'amount' => 10,
                'iban' => 'not-an-iban',
                'beneficiaryName' => 'Example',
            ]);
        } catch (ValidationException $e) {
            $this->assertSame('iban', $e->field);
            throw $e;
        }
    }
}
