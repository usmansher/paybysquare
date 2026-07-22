"""Generate spec/test-vectors.json from the reference Python implementation.

The reference implementation is the `pay_by_square` PyPI library
(liblzma-backed), the independent known-good encoder the vectors were
originally generated from.

Each vector pins an explicit date so output is deterministic. Vectors carry:
  - input:  the canonical (camelCase) input object used by all implementations
  - tsv:    the exact tab-separated data string BEFORE checksum/compression
            (normative: every implementation must produce this byte-for-byte)
  - payloadReference: the payload produced by liblzma (informative: other
            implementations may emit different — still valid — LZMA streams;
            correctness is asserted by decoding, see spec/tools/verify.py)

Run: venv/bin/python spec/tools/generate_vectors.py
"""
import json
import sys
from datetime import date
from pathlib import Path

import pay_by_square


def build_tsv(case: dict) -> str:
    """Mirror of the normative field layout (see spec/SPEC.md section 3)."""
    return '\t'.join([
        '',
        '1',
        '1',
        f"{case['amount']:.2f}",
        case.get('currency', 'EUR'),
        date.fromisoformat(case['date']).strftime('%Y%m%d'),
        case.get('variableSymbol', ''),
        case.get('constantSymbol', ''),
        case.get('specificSymbol', ''),
        '',
        case.get('note', ''),
        '1',
        case['iban'],
        case.get('swift', ''),
        '0',
        '0',
        case['beneficiaryName'],
        case.get('beneficiaryAddress1', ''),
        case.get('beneficiaryAddress2', ''),
    ])


CASES = [
    {
        'name': 'minimal',
        'description': 'Only required fields; defaults everywhere else',
        'input': {
            'amount': 10,
            'iban': 'SK7283300000009111111118',
            'beneficiaryName': 'John Doe',
            'date': '2026-07-21',
        },
    },
    {
        'name': 'all-fields',
        'description': 'Every supported field populated',
        'input': {
            'amount': 1234.56,
            'currency': 'EUR',
            'iban': 'SK7283300000009111111118',
            'swift': 'FIOZSKBAXXX',
            'variableSymbol': '2026001',
            'constantSymbol': '0308',
            'specificSymbol': '99',
            'note': 'Invoice FA20260103',
            'beneficiaryName': 'Acme s.r.o.',
            'beneficiaryAddress1': 'Hlavna 1',
            'beneficiaryAddress2': '811 01 Bratislava',
            'date': '2026-01-03',
        },
    },
    {
        'name': 'diacritics',
        'description': 'Slovak diacritics exercise UTF-8 encoding before CRC/LZMA',
        'input': {
            'amount': 25.5,
            'iban': 'SK7283300000009111111118',
            'beneficiaryName': 'Žltá ľalia, s.r.o.',
            'note': 'Faktúra č. 47 — úhrada',
            'date': '2026-07-21',
        },
    },
    {
        'name': 'amount-rounding',
        'description': 'Amount formats to exactly two decimals',
        'input': {
            'amount': 0.1,
            'iban': 'SK7283300000009111111118',
            'beneficiaryName': 'Rounding Test',
            'date': '2026-07-21',
        },
    },
    {
        'name': 'large-amount',
        'description': 'Large amount, long variable symbol (max 10 digits)',
        'input': {
            'amount': 9999999.99,
            'iban': 'SK7283300000009111111118',
            'swift': 'FIOZSKBAXXX',
            'variableSymbol': '1234567890',
            'beneficiaryName': 'Big Corp a.s.',
            'date': '2026-12-31',
        },
    },
]


def main() -> None:
    vectors = []
    for case in CASES:
        inp = case['input']
        payload = pay_by_square.generate(
            amount=inp['amount'],
            iban=inp['iban'],
            swift=inp.get('swift', ''),
            date=date.fromisoformat(inp['date']),
            beneficiary_name=inp['beneficiaryName'],
            currency=inp.get('currency', 'EUR'),
            variable_symbol=inp.get('variableSymbol', ''),
            constant_symbol=inp.get('constantSymbol', ''),
            specific_symbol=inp.get('specificSymbol', ''),
            note=inp.get('note', ''),
            beneficiary_address_1=inp.get('beneficiaryAddress1', ''),
            beneficiary_address_2=inp.get('beneficiaryAddress2', ''),
        )
        vectors.append({
            'name': case['name'],
            'description': case['description'],
            'input': inp,
            'tsv': build_tsv(inp),
            'payloadReference': payload,
        })

    out = Path(__file__).resolve().parent.parent / 'test-vectors.json'
    out.write_text(
        json.dumps({'version': 1, 'vectors': vectors}, ensure_ascii=False, indent=2)
        + '\n',
        encoding='utf-8',
    )
    print(f'Wrote {len(vectors)} vectors to {out}', file=sys.stderr)


if __name__ == '__main__':
    main()
