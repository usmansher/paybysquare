import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, parse } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const SPEC_RELATIVE_PATH = join('spec', 'openapi.yaml');

/**
 * Locate spec/openapi.yaml by walking up from this module's directory.
 * Works from dist/, dist-test/src/ and the Docker image layout alike.
 */
export function findSpecPath(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  const { root } = parse(dir);
  while (true) {
    const candidate = join(dir, SPEC_RELATIVE_PATH);
    if (existsSync(candidate)) {
      return candidate;
    }
    if (dir === root) {
      throw new Error(`could not locate ${SPEC_RELATIVE_PATH}`);
    }
    dir = dirname(dir);
  }
}

let cached: Record<string, unknown> | undefined;

/** Load and cache the OpenAPI contract as a plain JSON-ready object. */
export function loadOpenApiDocument(): Record<string, unknown> {
  if (cached === undefined) {
    cached = parseYaml(readFileSync(findSpecPath(), 'utf8')) as Record<
      string,
      unknown
    >;
  }
  return cached;
}
