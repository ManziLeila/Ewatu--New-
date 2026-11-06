# E-Watu HR ERP

Commercial multi-tenant HR ERP (HC Solutions / E-Watu). Sold **module by module**: Core Platform, Employee/HR, Leave, Payroll, Recruitment, Talent Pool, Performance.

## Stack

| Layer | Technology |
|-------|------------|
| Backend | NestJS 10, Prisma, PostgreSQL |
| Frontend | React, Vite, TypeScript |
| Auth | identity-service (JWT), `@ewatu/common-auth` |
| Local infra | Docker Compose (Postgres, MinIO, Mailpit) |

## Repository layout

```
libs/common-auth/     Shared JWT guards, roles, permissions
libs/module-sdk/      Product module catalog & manifest types (Phase 0+)
services/             Deployable NestJS services (one DB each in dev)
web/                  SPA
docs/                 Architecture, ADRs, module docs
scripts/              Dev setup, architecture checks
```

See [docs/architecture.md](docs/architecture.md) for service map and evolution plan.

## Quick start (local)

**Requirements:** Node 20+, Docker

```bash
npm install
npm run db:up              # Postgres :15432, MinIO, Mailpit
npm run db:prepare         # prisma generate, migrate all, seed dev
npm run dev                # identity, platform, payroll, recruitment, web, …
```

- Web: http://127.0.0.1:5173  
- **Real email** (signup activation): [docs/real-email-setup.md](docs/real-email-setup.md) — configure `services/notification-service/.env` (Resend or SMTP).  
- Optional fake inbox (Mailpit): http://127.0.0.1:8025 — only if using `SMTP_HOST=127.0.0.1` in notification `.env`.  
- Demo users & flow: [services/platform-service/FLOW.txt](services/platform-service/FLOW.txt)  
- Smoke check: `npm run check:dev`

Do **not** set `VITE_API_URL` to a single host unless an API gateway is running; the web app uses per-service URLs in `web/.env`.

## Product modules (logical)

| Module ID | Service(s) |
|-----------|------------|
| `core` | platform, identity, notification, document |
| `hr-employee`, `leave`, `payroll`, `performance` | payroll-service |
| `recruitment` | recruitment-service |
| `talent-pool` | talent-pool-service |

Catalog source: `libs/module-sdk/src/catalog.ts`. Per-module docs: [docs/modules/README.md](docs/modules/README.md).

## Scripts (root)

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start default dev stack |
| `npm run db:migrate:all` | Apply all service migrations |
| `npm run db:seed:dev` | Platform + identity + payroll + recruitment seeds |
| `npm run build:module-sdk` | Build module catalog library |
| `npm run check:architecture` | Phase 0 boundary & doc checks |

## CI

GitLab CI builds/typechecks services and web on path changes. Architecture job runs `check:architecture` when docs, module-sdk, or services change.

## License

Proprietary — HC Solutions / E-Watu.
