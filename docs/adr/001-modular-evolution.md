# ADR 001: Modular evolution (monolith-ready modules on current microservices)

**Status:** Accepted  
**Date:** 2026-10-16  
**Context:** E-Watu is sold module-by-module. The repo already runs as **multiple NestJS services** with **separate databases**, while Leave and Performance live inside **payroll-service**. A greenfield modular monolith would discard working payroll and ATS code.

## Decision

1. **Define logical product modules** in `@ewatu/module-sdk` (catalog, IDs, manifests, events) independent of deploy topology.
2. **Keep current services** as deployment units for Phase 0–1; add **tenant module entitlements** in platform-service (Phase 1).
3. **Refactor payroll-service internally** into `src/modules/{employee,leave,payroll,performance}` before splitting databases or services.
4. **Integrate modules** with versioned **domain events** and outbox (Phase 1 skeleton, Phase 6 hardening); keep **internal HTTP** for synchronous reads (tenant lookup, presign).
5. **Enforce boundaries** with automated checks (`npm run check:architecture`) expanding to dependency rules as folders land.

## Alternatives considered

| Option | Rejected because |
|--------|------------------|
| Big-bang single Nest monolith | High risk; parallel teams and existing CI per service |
| Split leave microservice now | No entitlements or in-service boundaries yet; duplicate employee coupling |
| Module licensing only in UI | Unsafe; APIs must enforce entitlements |

## Consequences

- **Positive:** Aligns product SKUs with code; extraction path without rewrite.
- **Negative:** Temporary duplication (manifest in SDK + future DB entitlements) until Phase 1 wires them together.
- **Follow-up:** ADR for RLS; ADR for outbox broker choice; gateway ADR when public single URL is required.

## References

- `libs/module-sdk/src/catalog.ts`
- `docs/capabilities-design.md`
