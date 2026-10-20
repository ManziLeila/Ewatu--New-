#!/usr/bin/env node
/**
 * Install only the Vite web app UI dependencies without running service postinstall
 * (prisma generate), which fails on Windows when query_engine DLLs are locked.
 */
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

console.log('install-web-deps: freeing dev ports (stops node on 3011–5173)…');
execSync('node scripts/free-dev-ports.mjs', { cwd: root, stdio: 'inherit' });

console.log('install-web-deps: npm install -w web --ignore-scripts …');
execSync('npm install -w web --ignore-scripts', { cwd: root, stdio: 'inherit', env: process.env });

console.log('install-web-deps: done. Run npm run dev when ready.');
