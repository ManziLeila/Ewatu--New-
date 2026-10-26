#!/usr/bin/env node
/**
 * Generate Prisma clients for every service (uses root prisma CLI — no npx).
 * Each service uses output = "../node_modules/.prisma/client" (imports stay `@prisma/client`).
 */
import { existsSync, readFileSync, readdirSync, cpSync, rmSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rootPrismaPkg = join(root, 'node_modules', 'prisma');
const rootPrismaCli = join(rootPrismaPkg, 'build', 'index.js');
const vanillaStub = join(root, 'node_modules', '@prisma', 'client');

if (!existsSync(rootPrismaCli)) {
  console.error('Missing prisma CLI. Run: npm install (from repo root)');
  process.exit(1);
}

// Wrong hoisted client (e.g. platform Tenant) breaks every service under services/
const poisonPrisma = join(root, 'services', 'node_modules', '@prisma');
if (existsSync(poisonPrisma)) {
  try {
    rmSync(poisonPrisma, { recursive: true, force: true });
    console.log('Removed services/node_modules/@prisma (hoisted client breaks other services)\n');
  } catch {
    console.warn(
      'Warning: could not delete services/node_modules/@prisma (stop npm run dev, delete that folder, re-run db:generate:all)\n',
    );
  }
}

const serviceNames = [
  'identity-service',
  'platform-service',
  'recruitment-service',
  'notification-service',
  'talent-pool-service',
  'payroll-service',
  'procurement-service',
  'lending-service',
];

function firstModelName(schemaPath) {
  const text = readFileSync(schemaPath, 'utf8');
  const m = text.match(/^model\s+(\w+)\s/m);
  return m?.[1] ?? null;
}

function clientHasModel(serviceDir, modelName) {
  const dts =
    join(serviceDir, 'node_modules', '.prisma', 'client', 'index.d.ts');
  if (!existsSync(dts)) return false;
  const body = readFileSync(dts, 'utf8');
  return body.includes(`export type ${modelName} `) || body.includes(`$${modelName}Payload`);
}

/** Prisma generate resolves prisma + @prisma/client from the schema folder; both must live under the same service node_modules (not root-hoisted CLI + local client). */
function ensureLocalPrismaCli(serviceDir) {
  const target = join(serviceDir, 'node_modules', 'prisma');
  rmSync(target, { recursive: true, force: true });
  mkdirSync(join(serviceDir, 'node_modules'), { recursive: true });
  cpSync(rootPrismaPkg, target, { recursive: true });
  return join(target, 'build', 'index.js');
}

function ensureVanillaStub(serviceDir) {
  if (!existsSync(vanillaStub)) {
    throw new Error('Missing root node_modules/@prisma/client — run npm install at repo root');
  }
  const pkg = JSON.parse(readFileSync(join(vanillaStub, 'package.json'), 'utf8'));
  if (pkg.name !== '@prisma/client') {
    throw new Error(
      'Root @prisma/client is a generated client, not the npm stub. Reinstall: npm install @prisma/client@5.22.0 at repo root',
    );
  }
  const target = join(serviceDir, 'node_modules', '@prisma', 'client');
  rmSync(target, { recursive: true, force: true });
  mkdirSync(dirname(target), { recursive: true });
  cpSync(vanillaStub, target, { recursive: true });
}

let failed = 0;

for (const name of serviceNames) {
  const serviceDir = join(root, 'services', name);
  const schema = join(serviceDir, 'prisma', 'schema.prisma');
  if (!existsSync(schema)) continue;

  const expectModel = firstModelName(schema);
  process.stdout.write(`\n→ ${name}: prisma generate … `);

  let servicePrismaCli;
  try {
    ensureVanillaStub(serviceDir);
    servicePrismaCli = ensureLocalPrismaCli(serviceDir);
  } catch (e) {
    console.log('failed (stub)');
    console.error(e instanceof Error ? e.message : e);
    failed += 1;
    continue;
  }

  const postinstall = join(serviceDir, 'node_modules', '@prisma', 'client', 'scripts', 'postinstall.js');
  if (existsSync(postinstall)) {
    spawnSync(process.execPath, [postinstall], {
      cwd: serviceDir,
      env: process.env,
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 120_000,
    });
  }

  const r = spawnSync(process.execPath, [servicePrismaCli, 'generate'], {
    cwd: serviceDir,
    env: { ...process.env, PRISMA_GENERATE_SKIP_AUTOINSTALL: '1' },
    stdio: 'pipe',
    encoding: 'utf8',
    timeout: 120_000,
  });

  if (r.status !== 0) {
    console.log('failed');
    if (r.stderr) console.error(r.stderr.trim());
    if (r.stdout) console.error(r.stdout.trim());
    failed += 1;
    continue;
  }

  if (expectModel && !clientHasModel(serviceDir, expectModel)) {
    console.log(`failed (client missing model ${expectModel})`);
    failed += 1;
    continue;
  }

  console.log('ok');
}

if (failed) {
  console.error(`\n✗ ${failed} service(s) failed prisma generate`);
  process.exit(1);
}

console.log('\n✓ All Prisma clients generated');
