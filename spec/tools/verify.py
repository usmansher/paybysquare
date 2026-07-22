"""Reference verifier for Pay By Square payloads.

Decodes a payload string back to the tab-separated data and validates the
CRC32 checksum. Used by every implementation's test suite as the normative
decoder (any valid LZMA1 stream is accepted, so implementations are free to
produce different bytes than the reference as long as they decode correctly).

Usage:
  python3 spec/tools/verify.py <payload>            # prints decoded TSV
  echo '<payload>' | python3 spec/tools/verify.py   # same, from stdin

Exits non-zero (with a message on stderr) if the payload is malformed.
"""
import binascii
import lzma
import sys

SUBST = '0123456789ABCDEFGHIJKLMNOPQRSTUV'


def decode(payload: str) -> str:
    bits = ''.join(bin(SUBST.index(ch))[2:].zfill(5) for ch in payload)
    # Drop right-side zero padding to a whole number of bytes
    nbytes = len(bits) // 8
    raw = bytes(int(bits[8 * i: 8 * i + 8], 2) for i in range(nbytes))

    if len(raw) < 4 or raw[0:2] != b'\x00\x00':
        raise ValueError('bad header: expected 2 zero bytes')
    total_len = int.from_bytes(raw[2:4], 'little')
    compressed = raw[4:]

    decompressor = lzma.LZMADecompressor(
        format=lzma.FORMAT_RAW,
        filters=[{
            'id': lzma.FILTER_LZMA1,
            'lc': 3,
            'lp': 0,
            'pb': 2,
            'dict_size': 128 * 1024,
        }],
    )
    total = decompressor.decompress(compressed, max_length=total_len)
    if len(total) != total_len:
        raise ValueError(
            f'decompressed length {len(total)} != header length {total_len}'
        )

    checksum, data = total[:4], total[4:]
    expected = binascii.crc32(data).to_bytes(4, 'little')
    if checksum != expected:
        raise ValueError('CRC32 mismatch')

    return data.decode('utf-8')


def main() -> None:
    payload = sys.argv[1] if len(sys.argv) > 1 else sys.stdin.read().strip()
    try:
        print(decode(payload))
    except (ValueError, lzma.LZMAError, IndexError) as exc:
        print(f'verify failed: {exc}', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
