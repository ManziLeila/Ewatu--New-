# @ewatu/module-sdk

Shared **product module** definitions for E-Watu ERP (commercial, sell-by-module).

## Purpose

- Stable **module IDs** and **manifest** shape for licensing (Phase 1+).
- **Catalog** of dependencies, host services, permissions, menus, and domain events.
- No runtime Nest/Prisma dependencies — safe to import from any service or the web app later.

## Usage

```typescript
import { MODULE_CATALOG, DEMO_TENANT_DEFAULT_MODULES, getModuleManifest } from '@ewatu/module-sdk';

const payroll = getModuleManifest('payroll');
```

## Build

From repo root:

```bash
npm run build:module-sdk
```

## Module READMEs

See [docs/modules/README.md](../../docs/modules/README.md) for per-module ownership and boundaries.
