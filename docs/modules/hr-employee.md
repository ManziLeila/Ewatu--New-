# Module: Employee / Core HR

**ID:** `hr-employee`  
**Depends on:** `core`

## Host

`payroll-service` (employees, contracts, teams, bulk upload).

## Public API

- `/api/v1/employees`, contracts, teams (see payroll-service controllers)

## Events

- Publishes: `EmployeeCreated.v1` (planned)
- Consumes: `EmployeeHired.v1` from recruitment (planned)

## Boundaries

- Does not own payroll runs or leave balances.
- Recruitment must not write employee rows directly; use API or events.
