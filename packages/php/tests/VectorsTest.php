<?php

declare(strict_types=1);

namespace PayBySquare\Tests;

use PayBySquare\Payment;
use PayBySquare\PayBySquare;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class VectorsTest extends TestCase
{
    /** @return iterable<string, array{array<string, mixed>, string}> */
    public static function vectorProvider(): iterable
    {
        foreach (SpecHelper::vectors() as $vector) {
            yield $vector['name'] => [$vector['input'], $vector['tsv']];
        }
    }

    /** @param array<string, mixed> $input */
    #[DataProvider('vectorProvider')]
    public function testDataStringMatchesSpecByteForByte(array $input, string $tsv): void
    {
        self::assertSame($tsv, Payment::fromArray($input)->toDataString());
    }

    /** @param array<string, mixed> $input */
    #[DataProvider('vectorProvider')]
    public function testPayloadDecodesViaReferenceVerifier(array $input, string $tsv): void
    {
        $payload = PayBySquare::generatePayload($input);
        self::assertMatchesRegularExpression('/^[0-9A-V]+$/', $payload);
        self::assertSame($tsv, SpecHelper::referenceDecode($payload));
    }

    // That each vector's `payloadReference` (liblzma output, which contains real
    // matches) decodes to its `tsv` is a property of the vector file itself, not
    // of this implementation. It is asserted once by the language-neutral spec
    // self-check (spec/tools/selfcheck.py), so this suite needs no Python
    // runtime and runs standalone in the subtree-split repo.
}
