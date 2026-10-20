# Module: Leave Management

**ID:** `leave`  
**Depends on:** `core`, `hr-employee`

## Host

`payroll-service` (Prisma: `leave_types`, `leave_requests`, `leave_balances`).

## UI

Web routes under `/leave/*`.

## Events

- Publishes: `LeaveApproved.v1` (planned)
- Consumes: —

## Standalone

With payroll disabled, leave may still run for HR-only clients; payroll module must treat missing payroll entitlement as “no pay impact” when events arrive.
