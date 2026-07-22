<?php

declare(strict_types=1);

namespace PayBySquare;

use DateTimeImmutable;
use DateTimeInterface;
use DateTimeZone;

/**
 * A single simple payment order (spec/SPEC.md section 1).
 *
 * Immutable: validation happens in the constructor, so every instance
 * is guaranteed encodable.
 */
final readonly class Payment
{
    private const IBAN_RE = '/^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/';
    private const SWIFT_RE = '/^[A-Z0-9]{8}([A-Z0-9]{3})?$/';
    private const CURRENCY_RE = '/^[A-Z]{3}$/';

    /** Amount formatted with exactly two decimals, e.g. "10.00". */
    public string $formattedAmount;
    /** Date formatted as YYYYMMDD. */
    public string $formattedDate;
    public string $iban;
    public string $swift;
    public string $beneficiaryName;

    public function __construct(
        float|int $amount,
        string $iban,
        string $beneficiaryName,
        public string $currency = 'EUR',
        DateTimeInterface|string|null $date = null,
        string $swift = '',
        public string $variableSymbol = '',
        public string $constantSymbol = '',
        public string $specificSymbol = '',
        public string $note = '',
        public string $beneficiaryAddress1 = '',
        public string $beneficiaryAddress2 = '',
    ) {
        $this->formattedAmount = self::formatAmount($amount);
        $this->formattedDate = self::formatDate($date);

        $normalizedIban = strtoupper(str_replace(' ', '', $iban));
        if (preg_match(self::IBAN_RE, $normalizedIban) !== 1) {
            throw new ValidationException("invalid IBAN \"{$iban}\"", 'iban');
        }
        $this->iban = $normalizedIban;

        $trimmedName = trim($beneficiaryName);
        if ($trimmedName === '') {
            throw new ValidationException('beneficiaryName is required', 'beneficiaryName');
        }
        self::assertMaxLength($trimmedName, 'beneficiaryName', 70);
        self::assertNoControlChars($trimmedName, 'beneficiaryName');
        $this->beneficiaryName = $trimmedName;

        $normalizedSwift = strtoupper($swift);
        if ($normalizedSwift !== '' && preg_match(self::SWIFT_RE, $normalizedSwift) !== 1) {
            throw new ValidationException("invalid SWIFT/BIC \"{$swift}\"", 'swift');
        }
        $this->swift = $normalizedSwift;

        if (preg_match(self::CURRENCY_RE, $currency) !== 1) {
            throw new ValidationException(
                "currency must be a 3-letter ISO 4217 code, got \"{$currency}\"",
                'currency',
            );
        }

        self::assertDigits($variableSymbol, 'variableSymbol', 10);
        self::assertDigits($constantSymbol, 'constantSymbol', 4);
        self::assertDigits($specificSymbol, 'specificSymbol', 10);
        self::assertMaxLength($note, 'note', 140);
        self::assertNoControlChars($note, 'note');
        self::assertMaxLength($beneficiaryAddress1, 'beneficiaryAddress1', 70);
        self::assertNoControlChars($beneficiaryAddress1, 'beneficiaryAddress1');
        self::assertMaxLength($beneficiaryAddress2, 'beneficiaryAddress2', 70);
        self::assertNoControlChars($beneficiaryAddress2, 'beneficiaryAddress2');
    }

    /** @param array<string, mixed> $input Canonical camelCase keys (spec section 1). */
    public static function fromArray(array $input): self
    {
        return new self(
            amount: $input['amount'] ?? 0,
            iban: (string) ($input['iban'] ?? ''),
            beneficiaryName: (string) ($input['beneficiaryName'] ?? ''),
            currency: (string) ($input['currency'] ?? 'EUR'),
            date: $input['date'] ?? null,
            swift: (string) ($input['swift'] ?? ''),
            variableSymbol: (string) ($input['variableSymbol'] ?? ''),
            constantSymbol: (string) ($input['constantSymbol'] ?? ''),
            specificSymbol: (string) ($input['specificSymbol'] ?? ''),
            note: (string) ($input['note'] ?? ''),
            beneficiaryAddress1: (string) ($input['beneficiaryAddress1'] ?? ''),
            beneficiaryAddress2: (string) ($input['beneficiaryAddress2'] ?? ''),
        );
    }

    /** Build the normative tab-separated data string (spec/SPEC.md section 3). */
    public function toDataString(): string
    {
        return implode("\t", [
            '',
            '1',
            '1',
            $this->formattedAmount,
            $this->currency,
            $this->formattedDate,
            $this->variableSymbol,
            $this->constantSymbol,
            $this->specificSymbol,
            '',
            $this->note,
            '1',
            $this->iban,
            $this->swift,
            '0',
            '0',
            $this->beneficiaryName,
            $this->beneficiaryAddress1,
            $this->beneficiaryAddress2,
        ]);
    }

    private static function formatAmount(float|int $amount): string
    {
        if (!is_finite((float) $amount) || $amount <= 0) {
            throw new ValidationException('amount must be a positive number', 'amount');
        }
        $cents = $amount * 100;
        if (abs($cents - round($cents)) > 1e-6) {
            throw new ValidationException('amount must have at most 2 decimal places', 'amount');
        }
        $rounded = (int) round($cents);
        if ($rounded > 0xFFFFFFFF * 100) {
            throw new ValidationException('amount is too large', 'amount');
        }
        return sprintf('%d.%02d', intdiv($rounded, 100), $rounded % 100);
    }

    private static function formatDate(DateTimeInterface|string|null $date): string
    {
        // Dates are formatted from UTC calendar components so that a given
        // instant yields the same YYYYMMDD in every implementation regardless
        // of server timezone (mirrors the TypeScript core's getUTC* handling).
        $utc = new DateTimeZone('UTC');
        if ($date === null) {
            return (new DateTimeImmutable('now', $utc))->format('Ymd');
        }
        if ($date instanceof DateTimeInterface) {
            return DateTimeImmutable::createFromInterface($date)
                ->setTimezone($utc)
                ->format('Ymd');
        }
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) !== 1) {
            throw new ValidationException('date string must be YYYY-MM-DD', 'date');
        }
        $parsed = DateTimeImmutable::createFromFormat('!Y-m-d', $date);
        if ($parsed === false || $parsed->format('Y-m-d') !== $date) {
            throw new ValidationException("invalid date \"{$date}\"", 'date');
        }
        return $parsed->format('Ymd');
    }

    private static function assertDigits(string $value, string $field, int $maxLength): void
    {
        if ($value === '') {
            return;
        }
        if (preg_match('/^[0-9]+$/', $value) !== 1 || strlen($value) > $maxLength) {
            throw new ValidationException(
                "{$field} must be up to {$maxLength} digits, got \"{$value}\"",
                $field,
            );
        }
    }

    private static function assertMaxLength(string $value, string $field, int $maxLength): void
    {
        // Codepoint count via PCRE so ext-mbstring stays optional.
        if ((int) preg_match_all('/./us', $value) > $maxLength) {
            throw new ValidationException(
                "{$field} must be at most {$maxLength} characters",
                $field,
            );
        }
    }

    /**
     * Free-text fields are joined with tabs into the data string; a tab,
     * newline, or carriage return would inject or shift fields (e.g. override
     * the IBAN a consuming bank app reads). Reject C0 control characters and
     * DEL at the boundary.
     */
    private static function assertNoControlChars(string $value, string $field): void
    {
        if (preg_match('/[\x00-\x1f\x7f]/', $value) === 1) {
            throw new ValidationException(
                "{$field} must not contain control characters",
                $field,
            );
        }
    }
}
