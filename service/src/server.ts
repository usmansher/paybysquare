import { buildApp } from './app.js';

const DEFAULT_PORT = 8080;

function resolvePort(): number {
  const fromEnv = process.env.PORT;
  if (fromEnv === undefined || fromEnv === '') {
    return DEFAULT_PORT;
  }
  const parsed = Number(fromEnv);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65535) {
    throw new Error(`invalid PORT "${fromEnv}"`);
  }
  return parsed;
}

const app = buildApp({ logger: true });

app.listen({ port: resolvePort(), host: '0.0.0.0' }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
