# Module: Recruitment (ATS)

**ID:** `recruitment`  
**Depends on:** `core`

## Host

`recruitment-service`

## Public API

- `/api/v1/jobs`, candidates, interviews, offers, placements
- Public careers: `/api/v1/public/:slug/*`

## Events

- Publishes: `OfferAccepted.v1`, `PlacementCompleted.v1` (planned)
- Hire → employee: payroll `CreateEmployeeFromPlacement` today; move to events in Phase 6
