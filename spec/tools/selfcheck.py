"""Language-neutral self-check for the shared spec artifacts.

Runs once in CI (it needs Python's liblzma binding) and owns the two checks
that require a *general* LZMA decoder, so the per-language test suites don't
need a Python runtime:

  1. Every test vector's `payloadReference` (liblzma output, which contains
     real matches) decodes back to its `tsv`. This validates the vector file
     itself, independently of any implementation.
  2. Every conformance-corpus `payload` (the golden TypeScript output) decodes
     back to its `tsv` via liblzma — an independent oracle confirming the
     golden corpus is genuinely valid LZMA, not just self-consistent.

Usage:  python3 spec/tools/selfcheck.py
Exits non-zero (listing every mismatch) on any failure.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from verify import decode  # noqa: E402

SPEC_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def check(label, path, payload_key):
    doc = json.load(open(os.path.join(SPEC_DIR, path), encoding="utf-8"))
    items = doc.get("vectors") or doc.get("entries") or []
    failures = []
    for item in items:
        name = item.get("name", "?")
        try:
            got = decode(item[payload_key])
        except Exception as exc:  # noqa: BLE001 - report and continue
            failures.append(f"{label} '{name}': decode failed: {exc}")
            continue
        if got != item["tsv"]:
            failures.append(f"{label} '{name}': decoded TSV != expected tsv")
    print(f"{label}: checked {len(items)} items, {len(failures)} failures")
    return failures


def main():
    failures = []
    failures += check("test-vectors", "test-vectors.json", "payloadReference")
    failures += check("conformance-corpus", "conformance-corpus.json", "payload")
    if failures:
        print("\n".join(failures), file=sys.stderr)
        sys.exit(1)
    print("spec self-check OK")


if __name__ == "__main__":
    main()
