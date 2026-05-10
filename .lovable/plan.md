## Admin Command Center — Plan

A new Admin-only screen at `/command` that surfaces operational risk through two dominant modules: an **Attention Queue** and a **Phase Flow Heatmap**, anchored by a compact KPI strip. Built as a polished desktop-first prototype using existing data adapters (`getProjects`, `getAllPhases`, `getAllGates`, `getAllDeficiencies`, `getAllPhotos`, `getClients`, `getUsers`) and the established badge/token system. No new seed data, no backend changes.

### Layout

Desktop (≥ lg):
```text
+-------------------------------------------------------------+
| AppHeader                                                   |
+-------------------------------------------------------------+
| Page header: "Command Center"   [filter pill: KPI active]   |
+-------------------------------------------------------------+
| KPI Strip — 5 compact cells, horizontal                     |
+-------------------------------------------------------------+
| Attention Queue (≈62%)        | Phase Flow Heatmap (≈38%)  |
|  filter tabs                  |  6 rows × 5 cols grid       |
|  scrollable list of rows      |  ---------------------       |
|                               |  Bottleneck Insights (2-3)  |
+-------------------------------------------------------------+
```

Mobile/tablet: stacks vertically — KPI → Queue → Heatmap (heatmap horizontally scrollable, cells stay legible).

### Modules

**1. KPI Strip** (`KpiStrip`)
Five operational counts, derived from existing data:
- Active projects (`status === "active"`)
- Blocked work (phases blocked + gates blocked/failed)
- Failed inspections (gates `type === "inspection" && status === "failed"`)
- Ready inspections (phases `ready_for_inspection`)
- Missing attic evidence (active/non-archived projects without confirmed `attic_check` photo and `atticCheckStatus !== "passed"`)

Each cell: count, label, severity tone, optional age/trend hint. Clicking a KPI sets the queue filter to the matching category.

**2. Attention Queue** (`AttentionQueue` + `AttentionQueueItem`)
A pure derivation function `buildAttentionQueue(...)` produces a sorted list of `QueueItem`s with these types:
- `critical_blocker` — phase/gate blocked
- `failed_inspection` — gate failed, has open severe deficiency
- `aging_ready_inspection` — `ready_for_inspection` > 3 days
- `missing_attic_evidence` — active project, no confirmed attic photo
- `past_scheduled_end` — `scheduledEnd < today` and not closed/archived
- `awaiting_archive` — `status === "completed"` and completed > 7 days
- `stale_project` — active, no `updatedAt` change in 14+ days

Sort by severity (critical → warning → info) then age desc. Each item renders: severity badge, title, project, client, PM, current phase, age chip, one-line reason, suggested next action, and an "Open project" button → `navigate(/project/:id)`.

Filter tabs: All · Critical · Warning · Ready · Completed. Empty state when no items match.

**3. Phase Flow Heatmap** (`PhaseFlowHeatmap` + `BottleneckInsights`)
Rows: Draft, Insulation, Drywall, Finishing, Completed, Archived.
Columns: Not started, In progress, Blocked, Ready for inspection, Closed.

- Draft/Completed/Archived rows show a single project-status count spanning the row (other cells dimmed/empty).
- Insulation/Drywall/Finishing rows show counts of phases of that type in each status.
- Cell intensity follows the existing badge tones (`status-blocked`, `status-ready`, `status-closed`, `status-in-progress`, `status-not-started`). Cells with count 0 are muted.

`BottleneckInsights` derives 2–3 short observations like "Drywall has 3 phases waiting for inspection" and "1 completed project ready to archive".

### Visual direction

Use existing semantic tokens — no new palette. Map "field-ops" intent onto the established design system:
- Critical → `status-blocked` (signal red)
- Warning / amber → `status-attention`
- Ready / steel blue → `status-ready` / `status-in-progress`
- Healthy → `status-closed` (worksite green)
- Muted → `status-not-started`
- Surfaces use `surface-panel` / `surface-elevated` for the dispatch-board feel; queue rows are compact (single border, dense padding, left severity stripe).

### Routing & access

- Add `/command` route in `src/App.tsx`.
- Add a "Command" link in `AppHeader` desktop + mobile nav, rendered only when `me?.role === "admin"`.
- The page itself guards: if `me.role !== "admin"`, render an "Admin only" empty card.

### Files

New:
- `src/pages/AdminCommandCenter.tsx` — page shell, data fetch, layout, filter state.
- `src/components/command/KpiStrip.tsx`
- `src/components/command/AttentionQueue.tsx`
- `src/components/command/AttentionQueueItem.tsx`
- `src/components/command/PhaseFlowHeatmap.tsx`
- `src/components/command/BottleneckInsights.tsx`
- `src/lib/command/attentionQueue.ts` — pure derivation: `buildAttentionQueue({ projects, phases, gates, deficiencies, photos, users, clients })` returning `QueueItem[]`.
- `src/lib/command/heatmap.ts` — pure derivation: `buildHeatmap(...)` returning `HeatmapMatrix` and `buildBottleneckInsights(...)`.

Edited:
- `src/App.tsx` — add `/command` route.
- `src/components/dashboard/AppHeader.tsx` — add admin-only "Command" link (desktop SegmentedControl-adjacent and mobile scroll nav), with `section === "command"` styling.

### Out of scope

No new seed data, no API/adapter changes, no auth changes, no PM-performance widgets, no charts library, no client analytics, no activity log embedding.

### Implementation notes

- All derivations are pure functions in `lib/command/*` so they're trivially testable later.
- Queue items reuse `Badge`, `SeverityBadge`, and `KpiChip` primitives; no new color tokens.
- Heatmap is a CSS grid — on mobile the grid wraps in `overflow-x-auto` with a `min-w-[640px]` to preserve cell legibility.
- Filter state is local `useState` in `AdminCommandCenter`; KPI clicks call `setQueueFilter(...)`.
