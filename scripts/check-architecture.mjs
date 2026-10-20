#!/usr/bin/env node
/**
 * Phase 0 architecture checks — fast, no extra deps.
 * Expand with dependency-cruiser rules when payroll-service/src/modules/* lands.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');

const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function walkTsFiles(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dist') continue;
      walkTsFiles(p, acc);
    } else if (/\.tsx?$/.test(name)) {
      acc.push(p);
    }
  }
  return acc;
}

// --- Required Phase 0 artifacts ---
const requiredPaths = [
  'docs/architecture.md',
  'docs/adr/001-modular-evolution.md',
  'docs/capabilities-design.md',
  'docs/modules/README.md',
  'libs/module-sdk/package.json',
  'libs/module-sdk/src/catalog.ts',
  'services/payroll-service/src/modules/README.md',
];

for (const rel of requiredPaths) {
  assert(existsSync(join(root, rel)), `Missing required file: ${rel}`);
}

// --- Module SDK catalog sanity ---
const catalogPath = join(root, 'libs/module-sdk/src/catalog.ts');
if (existsSync(catalogPath)) {
  const catalogSrc = readFileSync(catalogPath, 'utf8');
  const requiredModules = [
    'core',
    'hr-employee',
    'leave',
    'payroll',
    'recruitment',
    'talent-pool',
    'performance',
  ];
  for (const id of requiredModules) {
    assert(
      catalogSrc.includes(`'${id}'`) || catalogSrc.includes(`"${id}"`),
      `MODULE_CATALOG missing entry: ${id}`,
    );
  }
}

// --- Cross-service source imports (forbidden) ---
const servicesDir = join(root, 'services');
const serviceNames = existsSync(servicesDir)
  ? readdirSync(servicesDir).filter((n) => statSync(join(servicesDir, n)).isDirectory())
  : [];

const importPattern =
  /from\s+['"](\.\.\/)+services\/([^/'"]+)|from\s+['"]@ewatu\/(?!common-auth|module-sdk)([^/'"]+)/g;

for (const svc of serviceNames) {
  const srcDir = join(servicesDir, svc, 'src');
  const files = walkTsFiles(srcDir);
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    let m;
    importPattern.lastIndex = 0;
    while ((m = importPattern.exec(content)) !== null) {
      const rel = relative(root, file);
      errors.push(`Cross-service import in ${rel}: ${m[0]}`);
    }
    // Direct relative hop into sibling service tree
    if (/from\s+['"]\.\.\/\.\.\/\.\.\/[^/]+-service/.test(content)) {
      errors.push(`Possible cross-service relative import in ${relative(root, file)}`);
    }
  }
}

// --- module-sdk build output (optional if not built yet) ---
const sdkDist = join(root, 'libs/module-sdk/dist/index.js');
if (!existsSync(sdkDist)) {
  console.warn('warn: libs/module-sdk/dist not found — run npm run build:module-sdk');
}

if (errors.length) {
  console.error('Architecture check failed:\n');
  for (const e of errors) console.error(`  • ${e}`);
  process.exit(1);
}

console.log('Architecture check passed (Phase 0).');
