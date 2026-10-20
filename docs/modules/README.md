# Product modules

Logical modules for licensing and boundaries. **Source of truth for IDs and manifests:** `libs/module-sdk/src/catalog.ts`.

| Module ID | Display name | Host service (today) | Module README |
|-----------|--------------|----------------------|---------------|
| `core` | Core Platform | platform + identity + notification + document | [core.md](./core.md) |
| `hr-employee` | Employee / Core HR | payroll-service | [hr-employee.md](./hr-employee.md) |
| `leave` | Leave Management | payroll-service | [leave.md](./leave.md) |
| `payroll` | Payroll | payroll-service | [payroll.md](./payroll.md) |
| `performance` | Performance | payroll-service | [performance.md](./performance.md) |
| `recruitment` | Recruitment (ATS) | recruitment-service | [recruitment.md](./recruitment.md) |
| `talent-pool` | Talent Pool | talent-pool-service | [talent-pool.md](./talent-pool.md) |

**Not in product catalog (legacy / out of scope for modular SKU v1):** procurement-service, lending-service, express-core.

## Definition of done (per module)

See product brief: standalone operation, tenant enable/disable, own migrations (or tagged migrations), permissions, tests, README with public API and events.

Phase 0: README stubs only. Phase 1+: entitlements and enforcement.
