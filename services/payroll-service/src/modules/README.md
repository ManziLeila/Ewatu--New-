# Payroll-service — logical modules

This service hosts **four product modules** (same DB today):

| Folder (planned) | Module ID | Notes |
|------------------|-----------|--------|
| `employee/` | `hr-employee` | Master data, contracts, teams |
| `leave/` | `leave` | Types, requests, balances |
| `payroll/` | `payroll` | Runs, periods, config, payslips |
| `performance/` | `performance` | Goals, cycles, appraisals |

## Migration plan (Phase 2+)

Move existing `src/employees`, `src/leave`, etc. into these folders **without behavior change**. Cross-module imports only via `*.facade.ts` in each module’s root.

## Architecture check

`npm run check:architecture` will gain rules forbidding `leave/` → `payroll/infrastructure` direct imports once folders exist.

See [docs/architecture.md](../../../../docs/architecture.md).
