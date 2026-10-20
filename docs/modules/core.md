# Module: Core Platform

**ID:** `core`  
**Always included** for every tenant.

## Owns

- Tenants, onboarding, tenant settings (platform-service)
- Authentication, users, JWT (identity-service)
- Notifications (notification-service)
- Document presign / storage (document-service)

## Public API (representative)

- `POST /api/v1/auth/login`, `GET /api/v1/me` (identity)
- `GET/PATCH /api/v1/my/tenant/settings` (platform)
- Internal: `/api/v1/internal/*` (shared secret)

## Events

- Publishes: `TenantActivated.v1` (planned)
- Consumes: —

## Permissions

- `tenant:settings`, `user:manage`, platform super-admin `*:*`
