<?php

declare(strict_types=1);

namespace PayBySquare\Tests;

use PayBySquare\Payment;
use PayBySquare\PayBySquare;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * Differential conformance against the shared corpus. The `payload` field of
 * each entry is produced by the golden TypeScript encoder; asserting this PHP
 * implementation reproduces it byte-for-byte is what enforces cross-language
 * parity across the full input space (see spec/tools/generate_corpus.mjs).
 */
final class ConformanceTest extends TestCase
{
    /** @return iterable<string, array{array<string, mixed>, string, string}> */
    public static function corpusProvider(): iterable
    {
        foreach (SpecHelper::corpus() as $entry) {
            yield $entry['name'] => [$entry['input'], $entry['tsv'], $entry['payload']];
        }
    }

    /** @param array<string, mixed> $input */
    #[DataProvider('corpusProvider')]
    public function testDataStringMatches(array $input, string $tsv, string $payload): void
    {
        self::assertSame($tsv, Payment::fromArray($input)->toDataString());
    }

    /** @param array<string, mixed> $input */
    #[DataProvider('corpusProvider')]
    public function testPayloadIsByteIdenticalToGolden(array $input, string $tsv, string $payload): void
    {
        self::assertSame($payload, PayBySquare::generatePayload($input));
    }

    /** @param array<string, mixed> $input */
    #[DataProvider('corpusProvider')]
    public function testPayloadRoundTripsToTsv(array $input, string $tsv, string $payload): void
    {
        self::assertSame($tsv, SpecHelper::referenceDecode($payload));
    }
}
