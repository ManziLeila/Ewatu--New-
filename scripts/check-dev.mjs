#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const buildFirst = process.argv.includes('--build');

const envFiles = [
  {
    label: 'identity',
    path: 'services/identity-service/.env',
    keys: ['JWT_PRIVATE_KEY', 'JWT_PUBLIC_KEY', 'INTERNAL_API_KEY'],
  },
  {
    label: 'platform',
    path: 'services/platform-service/.env',
    keys: ['JWT_PUBLIC_KEY', 'INTERNAL_API_KEY', 'NOTIFICATION_SERVICE_URL'],
  },
  {
    label: 'recruitment',
    path: 'services/recruitment-service/.env',
    keys: ['JWT_PUBLIC_KEY', 'INTERNAL_API_KEY', 'PLATFORM_SERVICE_URL'],
  },
  {
    label: 'notification',
    path: 'services/notification-service/.env',
    keys: ['JWT_PUBLIC_KEY', 'INTERNAL_API_KEY'],
  },
  {
    label: 'document',
    path: 'services/document-service/.env',
    keys: ['JWT_PUBLIC_KEY'],
  },
  {
    label: 'web',
    path: 'web/.env',
    keys: [],
    optionalAny: ['VITE_API_URL', 'VITE_IDENTITY_API'],
  },
];

const services = [
  { name: 'identity', url: 'http://127.0.0.1:3011/api/v1/identity/health' },
  { name: 'platform', url: 'http://127.0.0.1:3012/api/v1/platform/health' },
  { name: 'recruitment', url: 'http://127.0.0.1:3013/api/v1/recruitment/health' },
  { name: 'talent-pool', url: 'http://127.0.0.1:3014/api/v1/talent-pool/health' },
  { name: 'notification', url: 'http://127.0.0.1:3015/api/v1/notifications/health' },
  { name: 'payroll', url: 'http://127.0.0.1:3016/api/v1/payroll/health' },
  { name: 'document', url: 'http://127.0.0.1:3018/api/v1/document/health' },
];

function parseEnv(filePath) {
  const full = join(root, filePath);
  if (!existsSync(full)) return null;
  const out = {};
  for (const line of readFileSync(full, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    out[t.slice(0, i)] = t.slice(i + 1).trim();
  }
  return out;
}

function fail(msg) {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`✓ ${msg}`);
}

function unwrap(body) {
  if (body && typeof body === 'object' && 'data' in body && 'meta' in body) {
    return body.data;
  }
  return body;
}

console.log('E-Watu dev check\n');

if (buildFirst) {
  console.log('Building services…');
  const r = spawnSync('npm', ['run', 'build:all'], { cwd: root, stdio: 'inherit', shell: true });
  if (r.status !== 0) fail('build:all failed');
}

const parsed = [];
for (const f of envFiles) {
  const env = parseEnv(f.path);
  if (!env) fail(`Missing ${f.path}`);
  if (f.optionalAny?.length) {
    const has = f.optionalAny.some((k) => env[k]);
    if (!has) fail(`${f.path}: set VITE_API_URL or legacy VITE_* service URLs`);
  }
  for (const key of f.keys ?? []) {
    if (!env[key]) fail(`${f.path}: missing ${key}`);
  }
  parsed.push({ ...f, env });
  ok(`${f.label}: ${f.path}`);
}

const publicKeys = parsed
  .map((p) => p.env.JWT_PUBLIC_KEY)
  .filter(Boolean);
if (new Set(publicKeys).size > 1) {
  fail('JWT_PUBLIC_KEY differs between services');
}

const internal = parsed
  .filter((p) => p.env.INTERNAL_API_KEY)
  .map((p) => p.env.INTERNAL_API_KEY);
if (new Set(internal).size > 1) fail('INTERNAL_API_KEY differs between services');

async function postgresReachable() {
  try {
    const { createConnection } = await import('node:net');
    return await new Promise((resolve) => {
      const socket = createConnection({ host: '127.0.0.1', port: 15432 });
      socket.setTimeout(2000);
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.on('error', () => resolve(false));
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
    });
  } catch {
    return false;
  }
}

console.log('\nPostgres (127.0.0.1:15432):');
if (!(await postgresReachable())) {
  fail(
    'Postgres not reachable. Start Docker Desktop, then run: npm run db:up\n' +
      '  (Services crash with P1001 until Postgres is up.)',
  );
}
ok('Postgres port 15432 is open');

console.log('\nHealth endpoints:');
for (const s of services) {
  try {
    const r = await fetch(s.url, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) fail(`${s.name}: ${s.url} → HTTP ${r.status}`);
    const body = unwrap(await r.json());
    if (body?.status !== 'ok') fail(`${s.name}: unexpected body`);
    ok(`${s.name} ${s.url}`);
  } catch {
    fail(
      `${s.name}: not reachable at ${s.url}\n` +
        '  Run npm run dev (or npm run dev:all) in another terminal (after npm run db:up).',
    );
  }
}

const loginUrl = 'http://127.0.0.1:3011/api/v1/auth/login';
try {
  const r = await fetch(loginUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@ewatu.dev', password: 'DevPassword12!' }),
    signal: AbortSignal.timeout(5000),
  });
  if (!r.ok) fail(`Login failed (${r.status}) — run npm run db:seed:dev`);
  const data = unwrap(await r.json());
  if (!data?.access_token || !data?.refresh_token) {
    fail('Login missing access_token or refresh_token');
  }
  ok('login admin@ewatu.dev → access + refresh tokens');
} catch (e) {
  fail(`Login request failed: ${e instanceof Error ? e.message : e}`);
}

console.log('\nAll checks passed.\n');
