# Navigation fix + Phase desktop refinement

Two scoped passes. No data-model or API changes. All work in `src/pages/PhaseDetail.tsx`, `src/pages/ProjectDetail.tsx`, plus a small shared nav component.

---

## 1. Breadcrumbs + Back button (both pages, both breakpoints)

### Problems today
- Both detail pages render a breadcrumb but have **no visible Back button** in the normal state (only in the error state).
- `PhaseDetail` breadcrumb is `All Projects → Project → Phase` and skips the client level, inconsistent with `ProjectDetail` which uses `All Projects → Client → Project`.
- On mobile the breadcrumb truncates aggressively, leaving no obvious way to step back one level (the link is small and crowded).
- Breadcrumb links rely on `Link to="/" state={{view:"dashboard"}}` / `state={{clientId}}` — that part already works (verified in `Index.tsx` lines 108-119) and stays as-is.

### Changes

**New shared component `src/components/dashboard/PageNav.tsx`**
- Renders a single horizontal row that contains:
  - A compact `Back` button (`variant="ghost" size="sm"`) on the left with `ArrowLeft` icon. Behavior: `navigate(-1)` if `window.history.length > 1`, otherwise `navigate(fallbackTo)`.
  - The breadcrumb to the right of it, separated by a thin divider on `sm+`.
- Props:
  ```ts
  { backFallback: string; items: Array<{ label: string; to?: string; state?: unknown }> }
  ```
  Last item with no `to` renders as `BreadcrumbPage`.
- Mobile: stacks back button on top row (full-width-ish) with breadcrumb underneath in a horizontally scrollable strip (`scrollbar-hide`, `whitespace-nowrap`). Desktop: single row, breadcrumb truncates with max-width per item.
- Replaces the inline `Breadcrumb` JSX currently in both detail pages.

**`ProjectDetail.tsx`**
- Replace lines 324-346 (current `<Breadcrumb>...`) with:
  ```tsx
  <PageNav
    backFallback="/"
    items={[
      { label: "All Projects", to: "/", state: { view: "dashboard" } },
      { label: detail.client.name, to: "/", state: { clientId: detail.client.id } },
      { label: p.name },
    ]}
  />
  ```
- Remove the duplicated Back button in the error branch (lines 236-241) — now handled by `PageNav` via the same call in error state.

**`PhaseDetail.tsx`**
- Replace lines 277-299 with:
  ```tsx
  <PageNav
    backFallback={`/project/${project.id}`}
    items={[
      { label: "All Projects", to: "/", state: { view: "dashboard" } },
      { label: project.clientName ?? "Client", to: "/", state: { clientId: project.clientId } },
      { label: project.name, to: `/project/${project.id}` },
      { label: PHASE_LABEL[phase.type] },
    ]}
  />
  ```
  (If `project.clientName` / `project.clientId` aren't already on the phase detail payload, pull them from `detail.project` — verify shape in `getPhase` adapter; if missing, drop the client crumb on the phase page rather than adding fields.)
- Remove the duplicated Back button in the error branch (lines 150-155).

**Verification**
- Click each crumb on desktop and mobile from `/project/:id` and `/project/:id/phase/:phaseId`.
- Refresh on a phase URL (no history) → Back falls back to the parent project, not to a 404 or blank.
- AppHeader links continue to work; no overlap with sticky header (`PageNav` sits inside `<main>`).

---

## 2. Phase Detail desktop refinement (`md:` and up only)

Mobile tree (the `md:hidden` branches with tabs/sheet) stays untouched.

### Problems today
- Only 3 tabs (`Overview | Deficiencies | Photos`). Activity is jammed inside Overview, Personnel is a tiny isolated card.
- Hero KPIs mix `DatePicker` controls with read-only "Closed at"/"Last updated" tiles in the same grid — visually inconsistent.
- Gate cards (lines 460-586) are 2-col blocks with mostly whitespace; primary inspection actions ("Ready for Inspection", "Passed/Failed") are buried per-gate.
- No at-a-glance summary of open deficiencies / required photos / blocking gate at the top.

### Changes

**Hero section (`md:` branch, lines ~302-378)**
- Split the hero into two zones with a vertical divider:
  - Left (flex-1): eyebrow, phase title, `health.reason`, `PhaseHealthPill size="lg"`.
  - Right (w-80): a "Schedule" card containing the two `DatePicker`s stacked, plus a small footer line `Last updated {relativeTime}` and `Closed {fmt(closedAt)}`. Removes the awkward inline grid mixing inputs and read-only tiles.
- Add a KPI strip below the hero (desktop only): 4 chips in a row — `Open deficiencies (n)`, `Photos required (n/total)`, `Site check status`, `Inspection status`. Each chip uses the existing tone tokens (`gateStatusTone`, `phaseStatusTone`).

**Primary action bar (new, `md:` only)**
- Right-aligned sticky-ish row directly under the KPI strip, containing the contextual primary actions currently buried in gate cards:
  - When `showReadyButton`: `Mark Ready for Inspection` (primary).
  - When `showPassedFailed`: `Mark Passed` (primary) + `Mark Failed` (outline).
  - When `siteGate.status === "not_started"`: `Site Checked` + `Site Blocked` (outline pair).
  - When `siteGate.status === "blocked"`: `Site Cleared` (outline).
- The same handlers wire up; gate cards lose their inline buttons (they remain informational on desktop).

**Tabs (`md:` branch, lines ~380-387)**
- Expand to 4 tabs: `Overview | Gates | Deficiencies | Photos`. Move Activity into a dedicated `Activity` tab → 5 tabs total.
- `Overview`: KPI summary recap + Personnel (PM + Subcontractor selector side-by-side) + a compact "Recent activity" preview (last 5 items with a "View all" link to the Activity tab).
- `Gates`: the existing 2-col gate cards, but stripped of action buttons (now in the action bar). Gate cards get tightened: status chip in header, photo thumbnails inline, notes block at bottom.
- `Deficiencies`: existing list, no changes beyond visual tightening (already adequate).
- `Photos`: existing grid.
- `Activity`: existing audit list, full width.

**Personnel card refinement**
- Currently only shows Subcontractor select. Add PM (read-only, from `project.assignedProjectManager`) as a sibling cell. Keep current select wiring.

**Empty/loading states**
- Replace bespoke `EmptyCard` calls with the existing `EmptyState` component for desktop consistency.

### Out of scope for this pass
- Mobile phase page (already covered by previous mobile pass).
- New backend fields, new dialogs, role logic, or attic-gate logic on the phase page.
- Animations beyond what the existing design system provides.

---

## Verification checklist
- Desktop `/project/:id` and `/project/:id/phase/:phaseId`: breadcrumb + back button both visible, both navigate correctly, refresh-then-back falls back to parent.
- Mobile: back button visible above breadcrumb strip, breadcrumb scrolls horizontally, no overflow into the sticky header.
- Desktop phase page: 5 tabs render, primary action bar shows the correct contextual buttons per phase status, gate cards no longer duplicate those buttons, KPI strip reflects current data.
- No desktop visual changes on `ProjectDetail` aside from the new `PageNav` row.
- No regressions in mobile project/phase trees.
