# Demo Scenarios

Use these seeded records to walk through the prototype without manual setup.

## Personas

- Admin: James Harrison (`user-admin`)
  - Best for `/command`, `/organization`, `/activity`, and `/archive`.
- Backup admin: Morgan Lee (`user-admin-2`)
  - Demonstrates multiple active admins and avoids single-admin demo fragility.
- Project manager with active alerts: Robert Thompson (`user-pm-1`)
  - Owns ready inspections, failed inspection work, clean overdue closeout, and pickup notifications.
- Project manager with active bottlenecks: William Anderson (`user-pm-2`)
  - Owns blocked, stale, and second ready-inspection scenarios.
- Project manager with no active work: Priya Patel (`user-pm-3`)
  - Demonstrates empty PM assignment states.
- Inventory viewer: Dale Cooper (`user-inventory-1`)
  - Best for `/inventory`; sees active projects across PMs only.

## Route Walkthrough

1. `/command`
   - Blocked: `proj-site-blocked`
   - Failed inspection: `proj-failed-inspection`
   - Ready inspection: `proj-ready-inspection`, `proj-ready-finishing-inspection`
   - Missing attic evidence: `proj-active-insulation`, `proj-active-not-started`
   - Clean overdue: `proj-overdue-clean`
   - Clean stale: `proj-stale-clean`
   - Archive ready: `proj-completed-archiveable`

2. `/inventory`
   - Loaded inventory: `proj-active-insulation`, `proj-ready-inspection`, `proj-site-blocked`, `proj-finishing-active`, `proj-stale-clean`
   - Audit requested: `proj-ready-finishing-inspection`
   - Picked up: `proj-finishing-active`, `proj-ready-inspection`, `proj-overdue-clean`

3. `/activity`
   - Inventory audit request: `audit-inventory-request-ready-finishing`
   - Inventory pickup: `audit-inventory-pickup-finishing`
   - Materials update: `audit-seed-materials-ready-inspection`
   - Hardware update: `audit-seed-hardware-site-blocked`
   - User lifecycle: `audit-create-backup-admin`, `audit-deactivate-inactive-pm`
   - Client lifecycle: `audit-create-empty-client`

4. `/organization`
   - Multiple admins: James Harrison, Morgan Lee
   - Active PM with no active projects: Priya Patel
   - Inactive users: Elliot Chen, Audrey Horne
   - PM assignment protection: Robert Thompson and William Anderson own active work

5. `/archive`
   - Completed but archive-ready: `proj-completed-archiveable`
   - Archived active-history examples: `proj-archived-history`, `proj-archived-legacy`
   - Archived client history: Oakridge Legacy Homes (`client-archived`)

## Project Detail Targets

- `proj-ready-inspection`
  - Ready drywall inspection, material logs, pickup history, photo-rich activity.
- `proj-site-blocked`
  - Blocked drywall/site gate, standing-water deficiency, blocked photo evidence.
- `proj-finishing-active`
  - Finishing work, mixed inventory pickup, PM pickup notification.
- `proj-ready-complete`
  - All gates passed and attic evidence present; completed project ready for archive.

## Phase Detail Targets

- `proj-ready-inspection-phase-drywall`
  - Ready-for-inspection phase with drywall inventory and due-today PM notification.
- `proj-failed-inspection-phase-insulation`
  - Failed inspection with critical open deficiency.
- `proj-deficiency-rework-phase-insulation`
  - Resolved-but-not-closed deficiency flow with before/after photos.
- `proj-ready-finishing-inspection-phase-finishing`
  - Second ready inspection for bottleneck and audit-request coverage.
