<?php

declare(strict_types=1);

namespace PayBySquare\Tests;

use PayBySquare\Lzma\Lzma1Encoder;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class LzmaRoundTripTest extends TestCase
{
    /** @return iterable<string, array{string}> */
    public static function caseProvider(): iterable
    {
        yield 'empty input' => [''];
        yield 'single byte' => ['A'];
        yield 'ascii text' => ['hello pay by square'];
        yield 'utf-8 diacritics' => ['Žltá ľalia — úhrada č. 47'];
        yield 'all byte values' => [implode('', array_map('chr', range(0, 255)))];
        yield 'repetitive data' => [str_repeat("\t", 50) . str_repeat('AAAA', 100)];

        $pseudorandom = '';
        for ($i = 0; $i < 1000; $i++) {
            $pseudorandom .= chr(($i * 2654435761) % 256);
        }
        yield 'pseudorandom bytes' => [$pseudorandom];
    }

    #[DataProvider('caseProvider')]
    public function testRoundTripThroughReferenceDecoder(string $input): void
    {
        $compressed = Lzma1Encoder::compress($input);
        self::assertSame(
            $input,
            Lzma1Decoder::decompressRaw($compressed, strlen($input)),
        );
    }
}
