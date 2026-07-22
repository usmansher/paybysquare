<?php

declare(strict_types=1);

namespace PayBySquare\Tests;

use RuntimeException;

final class SpecHelper
{
    /** @return list<array{name: string, description: string, input: array<string, mixed>, tsv: string, payloadReference: string}> */
    public static function vectors(): array
    {
        return self::loadJson(self::fixture('test-vectors.json'))['vectors'];
    }

    /** @return list<array{name: string, input: array<string, mixed>, tsv: string, payload: string}> */
    public static function corpus(): array
    {
        return self::loadJson(self::fixture('conformance-corpus.json'))['entries'];
    }

    /**
     * Decode a payload back to its TSV using the in-language reference decoder
     * (no Python/liblzma runtime needed; see Lzma1Decoder).
     */
    public static function referenceDecode(string $payload): string
    {
        return Lzma1Decoder::decode($payload);
    }

    /**
     * Resolve a shared spec fixture. There is a single canonical copy under the
     * monorepo's spec/ directory. When this package is extracted into its own
     * repository by the subtree split, split.yml vendors the same files into
     * tests/fixtures/ so the suite still runs standalone — that local copy wins
     * when present.
     */
    private static function fixture(string $name): string
    {
        $local = __DIR__ . '/fixtures/' . $name;
        if (is_file($local)) {
            return $local;
        }
        $dir = __DIR__;
        while (!is_file($dir . '/spec/' . $name)) {
            $parent = dirname($dir);
            if ($parent === $dir) {
                throw new RuntimeException("cannot locate spec fixture {$name}");
            }
            $dir = $parent;
        }
        return $dir . '/spec/' . $name;
    }

    /** @return array<string, mixed> */
    private static function loadJson(string $path): array
    {
        $json = file_get_contents($path);
        if ($json === false) {
            throw new RuntimeException("cannot read {$path}");
        }
        return json_decode($json, true, flags: JSON_THROW_ON_ERROR);
    }
}
