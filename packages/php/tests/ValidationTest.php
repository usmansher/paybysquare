<?php

declare(strict_types=1);

namespace PayBySquare\Tests;

use PayBySquare\PayBySquare;
use PayBySquare\ValidationException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class ValidationTest extends TestCase
{
    private const VALID = [
        'amount' => 10,
        'iban' => 'SK7283300000009111111118',
        'beneficiaryName' => 'John Doe',
        'date' => '2026-07-21',
    ];

    public function testAcceptsIbanWithSpacesAndLowercase(): void
    {
        $payload = PayBySquare::generatePayload(
            ['iban' => 'sk72 8330 0000 0091 1111 1118'] + self::VALID,
        );
        self::assertMatchesRegularExpression('/^[0-9A-V]+$/', $payload);
    }

    public function testDefaultsDateToTodayWhenOmitted(): void
    {
        $input = self::VALID;
        unset($input['date']);
        $payload = PayBySquare::generatePayload($input);
        self::assertMatchesRegularExpression('/^[0-9A-V]+$/', $payload);
    }

    /** @return iterable<string, array{array<string, mixed>, string}> */
    public static function rejectedProvider(): iterable
    {
        yield 'missing beneficiary name' => [['beneficiaryName' => ''] + self::VALID, 'beneficiaryName'];
        yield 'whitespace beneficiary name' => [['beneficiaryName' => '   '] + self::VALID, 'beneficiaryName'];
        yield 'zero amount' => [['amount' => 0] + self::VALID, 'amount'];
        yield 'negative amount' => [['amount' => -5] + self::VALID, 'amount'];
        yield 'amount with 3 decimals' => [['amount' => 1.005] + self::VALID, 'amount'];
        yield 'bad IBAN' => [['iban' => 'NOT-AN-IBAN'] + self::VALID, 'iban'];
        yield 'bad SWIFT' => [['swift' => 'X'] + self::VALID, 'swift'];
        yield 'bad currency' => [['currency' => 'EURO'] + self::VALID, 'currency'];
        yield 'non-numeric variable symbol' => [['variableSymbol' => '12A'] + self::VALID, 'variableSymbol'];
        yield 'variable symbol too long' => [['variableSymbol' => '12345678901'] + self::VALID, 'variableSymbol'];
        yield 'constant symbol too long' => [['constantSymbol' => '12345'] + self::VALID, 'constantSymbol'];
        yield 'note too long' => [['note' => str_repeat('x', 141)] + self::VALID, 'note'];
        yield 'amount too large' => [['amount' => 0xFFFFFFFF + 1] + self::VALID, 'amount'];
        yield 'beneficiary name too long' => [['beneficiaryName' => str_repeat('x', 71)] + self::VALID, 'beneficiaryName'];
        yield 'tab in note' => [['note' => "a\tb"] + self::VALID, 'note'];
        yield 'newline in note' => [['note' => "a\nb"] + self::VALID, 'note'];
        yield 'tab in beneficiary name' => [['beneficiaryName' => "Evil\tDE89"] + self::VALID, 'beneficiaryName'];
        yield 'carriage return in address1' => [['beneficiaryAddress1' => "a\rb"] + self::VALID, 'beneficiaryAddress1'];
        yield 'control char in address2' => [['beneficiaryAddress2' => "a\x07b"] + self::VALID, 'beneficiaryAddress2'];
        yield 'malformed date string' => [['date' => '21.07.2026'] + self::VALID, 'date'];
        yield 'impossible date' => [['date' => '2026-13-45'] + self::VALID, 'date'];
    }

    /** @param array<string, mixed> $input */
    #[DataProvider('rejectedProvider')]
    public function testRejectsInvalidInput(array $input, string $field): void
    {
        try {
            PayBySquare::generatePayload($input);
            self::fail('expected ValidationException');
        } catch (ValidationException $exception) {
            self::assertSame($field, $exception->field);
        }
    }

    public function testRejectsUnsupportedDocumentType(): void
    {
        try {
            PayBySquare::generatePayload(self::VALID, 'standing_order');
            self::fail('expected ValidationException');
        } catch (ValidationException $exception) {
            self::assertSame('documentType', $exception->field);
        }
    }

    public function testDefaultsToPaymentDocumentType(): void
    {
        self::assertSame(
            PayBySquare::generatePayload(self::VALID),
            PayBySquare::generatePayload(self::VALID, 'payment'),
        );
    }
}
