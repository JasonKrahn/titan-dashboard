# Titan PM Dashboard — MVP Prototype Plan

Build the Dashboard screen as an interactive prototype, wired through a typed API contract layer with in-memory seed data. UI components never import fixtures directly — they call `lib/api/` functions, matching the architecture docs so the backend can be swapped in later.

## Scope (this iteration)

Just the **Dashboard** screen. Other screens (project detail, phase detail, photo upload, audit) are stubbed routes for later. No auth screen yet — assume an Admin user as the current user, with a toggle to switch to a PM to demonstrate permission filtering.

## Design System

Dark theme with Titan orange accent. All tokens defined in `index.css` + `tailwind.config.ts` — no raw colors in components.

- Background: near-black slate (`hsl(222 20% 7%)`)
- Surface / card: elevated slate (`hsl(222 18% 11%)`)
- Border: subtle slate (`hsl(222 14% 18%)`)
- Foreground: off-white
- Primary (Titan orange): `hsl(20 95% 53%)` (#F97316) + glow variant
- Status tokens (semantic, used by badges + progress):
  - `--status-not-started` neutral gray
  - `--status-in-progress` blue
  - `--status-ready` amber/yellow
  - `--status-blocked` red
  - `--status-closed` green
- Typography: Inter via Google Fonts, generous tracking on headings
- Radius: `0.75rem`
- Subtle gradient + soft shadow tokens for hero stat cards

Mobile-first responsive grid: 1 col → 2 col (md) → 3 col (xl) for project cards. Sticky filter bar on mobile.

## Architecture

```text
src/
  lib/
    types.ts                  # All entity types from DATA_MODEL.md
    api/
      index.ts                # Re-exports the active adapter
      contract.ts             # Function signatures + ApiResult<T>
      adapters/
        prototype/
          index.ts            # Implements contract against seed data
          seed.ts             # Seed fixtures (4+ clients, 10+ projects, etc.)
    derived.ts                # Pure helpers: phaseProgress, hasBlockedWork,
                              # missingAtticEvidence, dueInspections, lastActivity
  hooks/
    useCurrentUser.ts
    useProjects.ts            # React Query wrappers around contract calls
  components/
    dashboard/
      StatsRow.tsx            # 3 KPI cards: active projects, blocked, due this week
      FilterBar.tsx           # status, assigned PM, has blocked, missing attic
      ProjectCard.tsx         # main card per spec
      PhaseProgress.tsx       # 3-segment bar for Insulation/Drywall/Finishing
      StatusBadge.tsx         # token-driven variants for all status enums
      DueInspectionsPanel.tsx
      AtticAlertsPanel.tsx
      EmptyState.tsx
      RoleSwitcher.tsx        # demo-only Admin ⇄ PM toggle
    ui/...                    # existing shadcn
  pages/
    Index.tsx                 # Dashboard
```

Contract returns `ApiResult<T>` exactly as in `API_CONTRACT.md`. PM role filters projects to those where `assignedProjectManagerId` matches current user — enforced inside the adapter, not the UI.

## Dashboard Layout

```text
┌───────────────────────────────────────────────────────────┐
│  Titan PM         Dashboard           [Admin ▾] [+ New]  │  header
├───────────────────────────────────────────────────────────┤
│  [Active 12]   [Blocked 3]   [Inspections due 5]         │  StatsRow
├───────────────────────────────────────────────────────────┤
│  Filters: Status ▾  PM ▾  ☐ Blocked  ☐ Missing attic     │  FilterBar
├───────────────────────────────────────────────────────────┤
│  ⚠ Attic Check Required (2)     |   ⏰ Due Inspections (5)│  alert panels
├───────────────────────────────────────────────────────────┤
│  ┌ ProjectCard ┐  ┌ ProjectCard ┐  ┌ ProjectCard ┐       │
│  │ name+client │  │             │  │             │       │  grid
│  │ phase bar   │  │             │  │             │       │
│  │ gates row   │  │             │  │             │       │
│  │ defs · PM   │  │             │  │             │       │
│  └─────────────┘  └─────────────┘  └─────────────┘       │
└───────────────────────────────────────────────────────────┘
```

### ProjectCard contents
- Project name (clickable, routes to `/projects/:id` placeholder) + client company underneath
- Status badge for project status (top-right)
- `PhaseProgress`: three labeled segments (Insulation / Drywall / Finishing), each colored by phase status token, with a tooltip showing the status name
- Gate row: three pill chips — Site Check, Inspection, Attic Check — colored by gate status
- Footer: open deficiencies count (red dot if > 0), assigned PM avatar (initials fallback), last activity timestamp ("2h ago" via lightweight relative-time helper)

### Empty state
Friendly illustration block + message + "Clear filters" action when filters yield zero results, distinct from "no projects exist yet".

## Seed Data

Per `DATA_MODEL.md` §Seed Data Requirements: 2 users (1 admin, 1 PM), 4+ clients, 10+ projects across all statuses, all three phase types, ≥1 blocked phase, ≥1 failed inspection, ≥1 project missing attic photo evidence, ≥1 ready-to-complete, ≥20 audit events. Timestamps are relative to "now" so the dashboard always feels fresh.

## States Covered

- Loading: skeletons on stats + cards
- Error: inline alert with retry
- Empty (no projects, no filter matches)
- Success
- Permission: PM sees only their projects; Admin-only "+ New Project" button hidden for PM

## Out of Scope (this iteration)

Project detail page, phase detail, photo upload flow, audit trail page, settings, real auth. Routes exist as placeholder pages so cards can link without 404s.

## Definition of Done

- Dashboard renders on mobile (375px) and desktop with the layout above
- All status colors come from semantic tokens, no hardcoded hex in components
- All data flows through `lib/api/` — no fixture imports in components
- Role switcher demonstrates PM filtering and hidden Admin controls
- Loading, empty, and error states verified
