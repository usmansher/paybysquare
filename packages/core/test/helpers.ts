import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export { referenceDecode } from './lzma-decode.js';

export interface TestVector {
  name: string;
  description: string;
  input: {
    amount: number;
    iban: string;
    beneficiaryName: string;
    date: string;
    currency?: string;
    swift?: string;
    variableSymbol?: string;
    constantSymbol?: string;
    specificSymbol?: string;
    note?: string;
    beneficiaryAddress1?: string;
    beneficiaryAddress2?: string;
  };
  tsv: string;
  payloadReference: string;
}

export function repoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  while (!existsSync(join(dir, 'spec', 'test-vectors.json'))) {
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error('could not locate repo root (spec/test-vectors.json)');
    }
    dir = parent;
  }
  return dir;
}

export function loadVectors(): TestVector[] {
  const path = join(repoRoot(), 'spec', 'test-vectors.json');
  return (JSON.parse(readFileSync(path, 'utf8')) as { vectors: TestVector[] })
    .vectors;
}

export interface CorpusEntry {
  name: string;
  input: TestVector['input'];
  tsv: string;
  payload: string;
}

export function loadCorpus(): CorpusEntry[] {
  const path = join(repoRoot(), 'spec', 'conformance-corpus.json');
  return (JSON.parse(readFileSync(path, 'utf8')) as { entries: CorpusEntry[] })
    .entries;
}
