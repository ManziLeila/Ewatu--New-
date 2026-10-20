# Module: Payroll

**ID:** `payroll`  
**Depends on:** `core`, `hr-employee`

## Host

`payroll-service` (periods, runs, configuration, Rwanda statutory calc, payslips).

## Public API

- `/api/v1/payroll/*`, periods, reports (see service)

## Events

- Publishes: `PayrollPeriodFinalized.v1` (planned)
- Consumes: `LeaveApproved.v1` (optional adjustments)

## Integrity

- Finalized periods immutable; rule/config snapshots on lock (roadmap in PHASE3.md).
