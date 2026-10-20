# Capabilities API — Phase 1 design

Phase 0 defines types and catalog only. Phase 1 implements persistence and HTTP.

## Goals

- One call after login tells the **web app** which modules, menus, and effective permissions apply.
- Each **service** can cache entitlements by `tenant_id` and reject disabled modules.

## Data model (platform-service)

```
ModuleCatalog          — id, version, displayName (seed from MODULE_CATALOG)
TenantModuleEntitlement — tenantId, moduleId, enabled, validFrom, validTo, limitsJson
```

Default entitlements: derived from `Tenant.plan` + overrides. Demo tenant seeds all modules in `DEMO_TENANT_DEFAULT_MODULES`.

## API

### `GET /api/v1/my/capabilities`

**Auth:** Bearer JWT (tenant user).

**Response (example):**

```json
{
  "data": {
    "tenantId": "uuid",
    "enabledModules": ["core", "hr-employee", "leave", "payroll", "recruitment", "talent-pool", "performance"],
    "permissions": ["employee:read", "payroll:run", "leave:approve"],
    "menus": [
      { "id": "payroll", "label": "Payroll", "pathPrefix": "/payroll" }
    ]
  }
}
```

**Rules:**

- `permissions` = intersection of JWT role permissions and permissions belonging to **enabled** modules (unless role is tenant admin).
- `menus` filtered from module manifests by enabled modules + permission.

### Platform admin

- `PUT /api/v1/tenants/:id/modules` — enable/disable module IDs (platform super admin or billing integration later).

## Service enforcement

- Nest decorator `@RequiresModule('payroll')` in `common-auth` or `module-sdk` nest adapter (Phase 1).
- Error: `403` body `{ code: 'MODULE_DISABLED', moduleId: 'payroll' }`.

## Web

- Fetch capabilities in `AuthSessionRefresh` or app bootstrap; store in React context.
- `ProtectedRoute` / nav builders filter by `enabledModules` and `pathPrefix`.

## Caching

- TTL 60–300s in memory per service; invalidate on admin entitlement change (future: pub/sub or poll version counter on tenant).

## Out of scope for Phase 1

- External customer API gateway aggregation
- Webhooks
- Per-user module overrides (tenant-level only first)
