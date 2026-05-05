# Prototype Backend Contract

Source of truth: rules that let the seeded prototype and concurrent backend development dovetail.

## Purpose

The frontend starts as a seeded interactive prototype. That is intentional. The prototype must still be built as if the backend already exists, using stable data types and data-access functions. This prevents a rewrite when real Supabase data is plugged in.

## Core Rule

Screens and components may not import fixture data directly. They must call a data adapter that implements `API_CONTRACT.md`.

Use these implementation locations in the fresh repo:

- `lib/api/` for contract functions.
- `lib/api/adapters/prototype/` for seeded prototype data and mutations.
- `lib/api/adapters/supabase/` for the later backend implementation.

Allowed:

```ts
const result = await getProjects({ hasBlockedWork: true });
```

Forbidden:

```ts
import { projects } from "@/fixtures/projects";
```

## Required Layers

```text
UI component
  -> feature hook or action wrapper
  -> API contract function
  -> prototype adapter using fixtures
  -> later: backend adapter using server actions/routes
```

## Prototype Adapter Requirements

The prototype adapter must:

- Implement every MVP read/write function from `API_CONTRACT.md`.
- Return `ApiResult<T>` for success and failure.
- Simulate Admin and PM permissions using single assigned PM scope.
- Simulate validation failures.
- Simulate attic gate failure when photo evidence is missing.
- Treat PhotoEvidence records as the canonical source for gate, deficiency, and attic evidence relationships.
- Simulate upload failures.
- Update seeded state so demos are interactive.
- Keep fixture data in one isolated directory.

## Backend Adapter Requirements

The backend adapter must:

- Preserve function names and input/output shapes.
- Replace fixture state with server actions or route handlers.
- Use Supabase Auth for Admin/PM identity.
- Use Supabase RLS for data access boundaries.
- Enforce Project Manager access through `Project.assignedProjectManagerId`.
- Use R2 signed upload/view URLs for photo evidence.
- Write audit events for security-sensitive mutations.

## Shared Contract Review

Any change to a field, status, function name, or failure mode requires:

1. Update `DATA_MODEL.md`.
2. Update `API_CONTRACT.md`.
3. Update prototype fixtures.
4. Update backend schema/API plan.
5. Record the change in `../process/PROJECT_LOG.md`.

## Required Test Scenarios

- Admin sees all seeded projects.
- PM sees projects where `assignedProjectManagerId` matches the PM user ID only.
- PM cannot access Admin-only controls.
- Project cannot complete without attic photo evidence.
- Attic photo evidence must be confirmed and linked to the same project.
- Deficiency photo groups derive from PhotoEvidence records by `deficiencyId` and `purpose`.
- Phase can close after Site Check and Inspection.
- Failed inspection keeps the phase open or blocked.
- Photo upload failure is visible and recoverable.
- Empty project/client lists render useful empty states.

## Definition Of Done

Prototype/backend dovetail is done when a developer can swap the adapter implementation from fixtures to backend calls without changing screen component props or UI state assumptions.
