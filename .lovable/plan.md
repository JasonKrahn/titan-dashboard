# Mobile Responsiveness Overhaul — Titan PM

All changes scoped to mobile (`< sm` / `< md`) using Tailwind responsive prefixes. Desktop markup and styling are preserved verbatim by gating new classes with `sm:`/`md:` resets (e.g. `p-2 sm:p-6`, `border-0 sm:border`, `rounded-none sm:rounded-xl`).

## 1. Global mobile primitives

**`src/index.css`**
- Add `.scrollbar-hide` utility (cross-browser: `scrollbar-width: none`, `-ms-overflow-style: none`, `&::-webkit-scrollbar { display: none }`). Reuse in nav + thumbnail rows.
- Add `.mobile-list` helper class: `-mx-4 sm:mx-0` + `divide-y divide-border` + `border-y sm:border` + `rounded-none sm:rounded-lg` + `bg-card`. Use as the base for converted list groups.
- Reduce `.container` side padding on mobile only: keep current value at `sm:` and up, set `px-3` at base (verify nothing depends on default).

**`src/components/dashboard/AppHeader.tsx`**
- Mobile nav row already exists (`lg:hidden`). Wrap the inner row in a single horizontal scroll container with `scrollbar-hide`, `flex-nowrap`, `snap-x`, and ensure each pill uses `whitespace-nowrap shrink-0` (already partly in place — confirm + tighten gap/padding to `gap-1.5 px-2.5`).
- Ensure logo block stays compact: hide the "Operations" eyebrow at `< sm`.

**New shared component `src/components/ui/bottom-sheet.tsx`** (thin wrapper around existing `Sheet` with `side="bottom"`, rounded top, drag handle bar). No new deps — reuse Radix `Sheet` already in `components/ui/sheet.tsx`.

**New shared `src/components/ui/fab.tsx`**: fixed bottom-right circular button, `sm:hidden`, safe-area aware (`bottom-[max(1rem,env(safe-area-inset-bottom))]`).

**New shared `src/components/ui/empty-inline.tsx`**: single-line italic muted text + optional icon. Replaces bordered/dashed empty boxes on mobile only — desktop continues to use `EmptyState` via `hidden sm:block` wrapping.

## 2. Project Detail page (`src/pages/ProjectDetail.tsx`)

Restructure into three mobile-only zones, keeping all current desktop sections behind `hidden md:block` wrappers and rendering a parallel mobile tree behind `md:hidden`.

### 2a. Compact header
- Title row: project name + status badge inline, truncate name.
- Second line: client · PM initials avatar · ellipsis-truncated address.
- "Info" toggle (chevron button) expands collapsible block with: full address, dates, PM full name, finish level, last update. Default collapsed.
- Edit/Archive moved into right-aligned ellipsis menu (`DropdownMenu`) on mobile.

### 2b. Sticky tab bar (mobile only)
- Replace existing mobile anchor nav with sticky tabs using shadcn `Tabs`: `Overview | Deficiencies | Notes | Photos | Activity`.
- Container: `sticky top-16 z-10 -mx-3 bg-background/90 backdrop-blur border-b`, scrollable with `scrollbar-hide`.
- Each tab renders a focused mobile section; desktop ignores tabs entirely.

### 2c. Tab contents

**Overview**
- Bottleneck Radar strip at top: horizontal 3-segment timeline (Insulation → Drywall → Finishing). Each segment shows phase tone color + tiny label; the active phase is highlighted; blockers/dependencies render as a red badge overlay on the segment. Below the strip, a one-line caption summarizes the current bottleneck (e.g. "Drywall blocked: waiting on attic gate").
- Pending approvals list: site checks awaiting sign-off, rendered as `mobile-list` rows (one per row, action button right-aligned).
- Top unresolved deficiencies (max 5): severity tag + title + assigned subcontractor right-aligned, tap row → opens deficiency drawer.
- Phase accordions (shadcn `Accordion`, `type="multiple"`): closed phases collapsed by default showing only title + status icon; the phase matching `phaseHealth = in-progress|attention|blocked` expanded. Inside each, current mobile phase content is reused but with reduced padding and inline actions.
- Attic gate condensed into a single accordion item.

**Deficiencies**
- Full list as `mobile-list` rows. Severity color chip + title (line 1), subcontractor + age (line 2). Right-side chevron.
- Add deficiency exposed only via FAB (no inline button on mobile).

**Notes**
- `ProjectNotes` rendered edge-to-edge (`-mx-3 sm:mx-0`), reduced padding inside list items, "+ note" exposed via header `+` icon button on mobile (replaces large inline button via prop or wrapper).

**Photos**
- Single horizontally scrolling row of square thumbnails (`h-20 w-20 sm:h-auto`), `scrollbar-hide`, snap. Tap → `PhotoViewerDialog`.
- Empty state → `empty-inline` ("No photos yet").
- Upload via FAB camera icon.

**Activity**
- Dedicated tab housing the existing activity timeline, edge-to-edge, denser row padding (`py-2`), `text-sm`/`text-xs`.

### 2d. FAB
- Single contextual FAB per active tab: Deficiencies → "+ Deficiency", Photos → camera, Notes → "+ Note". Hidden on Overview/Activity. Opens bottom sheet drawers (reusing existing `DeficiencyDialog`, `PhotoUploadDialog`, note form) presented via `bottom-sheet` wrapper at `< sm`.

## 3. Directory pages

**`src/components/dashboard/ClientDirectory.tsx`** (mobile branch)
- Replace stacked cards with `mobile-list`. Each row: client name (line 1, truncate) + project count badge right; secondary line: contact or city, muted `text-xs`. Right-aligned ellipsis menu (`DropdownMenu`) for edit / view projects.

**`src/pages/SubcontractorRolodex.tsx`** (mobile branch)
- Same `mobile-list` treatment. Each row: name (line 1) + right-aligned trade badges (color preserved). Line 2: phone or company, muted. Ellipsis menu for call / email / edit.
- Filters bar: collapse into a single "Filters" button opening a bottom sheet on mobile.

**`src/components/dashboard/ProjectCard.tsx` / `ProjectResults.tsx`** (mobile branch)
- Below `sm`, render rows via a new `ProjectRow` mobile component: project name + status pill (line 1), client + PM initials + open-deficiency count (line 2). Edge-to-edge list. Desktop card grid untouched.

## 4. Empty states & misc

- All `EmptyState` usages: wrap existing component with `hidden sm:block`; render `EmptyInline` (`sm:hidden`) alongside with the same copy.
- Inspection / archive panels on dashboard: tighten padding on mobile (`p-3 sm:p-5`), reduce icon size (`h-4 w-4 sm:h-5 sm:w-5`).
- `StatsRow`: on mobile show as 3-up tight grid with `text-xs` labels and `text-lg` values; desktop unchanged.

## Technical notes

- No new npm packages. Use existing Radix `Sheet`, `Tabs`, `Accordion`, `DropdownMenu`.
- Every mobile change must be additive via `sm:`/`md:` resets so the desktop class chain remains intact. Where structural changes are required (tab bar vs stacked sections), render both trees gated by `md:hidden` / `hidden md:block`.
- Reuse all existing dialogs (`DeficiencyDialog`, `PhotoUploadDialog`, `SiteCheckDialog`, etc.); only their trigger surfaces change on mobile (FAB / row tap / drawer).
- Health tones, status colors, and semantic tokens unchanged — pulled from `derived.ts` and `index.css` as today.
- No data-model or API changes.

## Out of scope
- Swipe-to-action gestures (use ellipsis menu instead — noted as future enhancement).
- Vaul library (not added; existing Radix Sheet is sufficient).
- Desktop visual changes of any kind.
