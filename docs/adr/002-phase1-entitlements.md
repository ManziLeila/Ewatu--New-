# ADR 002: Phase 1 tenant module entitlements and enforcement

**Status:** Accepted  
**Date:** 2026-10-16  
**Context:** Product modules are defined in `@ewatu/module-sdk`, but tenants must only use modules they purchased. UI role checks alone are insufficient.

## Decision

1. **Persist entitlements** in platform-service as `tenant_module_entitlements` (tenant + module_id + enabled + optional validity window).
2. **Expose capabilities** to the SPA via authenticated `GET /api/v1/my/capabilities` (enabled modules, filtered permissions, menu contributions from the catalog).
3. **Expose entitlements to services** via internal `GET /api/v1/internal/tenants/:id/modules` (`x-internal-key`), cached per service.
4. **Enforce on APIs** with `@RequiresModule(moduleId)` + `ModuleGuard` in `@ewatu/common-auth`; platform super-admin bypasses checks.
5. **Enforce in UI** with `CapabilitiesProvider`, `RequireModule` route wrappers, and admin nav gated by `hasModule`.

## Defaults

- Demo tenant seed upserts `DEMO_TENANT_DEFAULT_MODULES`.
- If a tenant has **no** entitlement rows, services fall back to demo defaults (dev-friendly); production onboarding should call `syncDefaultEntitlements` explicitly.

## Consequences

- **Positive:** Single source for “what this tenant bought”; backend and frontend stay aligned.
- **Negative:** Each service that enforces modules needs platform URL + internal key and a resolver provider.
- **Follow-up:** Admin API to toggle modules; extend guards to all module controllers; entitlement change events for cache invalidation.

## References

- `services/platform-service/src/entitlements/`
- `libs/common-auth/src/module.guard.ts`
- `docs/capabilities-design.md`
