# Plan — Project Detail redesign + Phase Details + Create modals

## 1. Project Detail page redesign (`src/pages/ProjectDetail.tsx`)

Replace the current flat layout with a focused, scannable layout:

**Header band (sticky)**
- Back button, project number, project status badge
- Title block: project name (h1), client, address, assigned PM avatar+name, scheduled dates
- Right side: KPI chips — Open deficiencies, Attic gate status, Last activity

**Three big phase cards (grid: 1 col mobile, 3 col md+)**
- Each card = one phase (Insulation / Drywall / Finishing)
- **Single high-level indicator per card** = a colored "phase health" pill that summarizes everything in that phase using priority rules:
  1. `blocked` (red) — phase blocked OR any failed/blocked gate OR critical/high open deficiency
  2. `attention` (amber) — ready for inspection OR open deficiencies
  3. `in progress` (blue) — phase active, no issues
  4. `not started` (gray)
  5. `closed` (green)
- Card body: phase label, the indicator pill with one-line reason ("2 open issues", "Awaiting inspection", "Site check failed"), small meta row (subcontractor / scheduled dates if present)
- Card is clickable → navigates to `/project/:id/phase/:phaseId`
- Hover shows "View details →"

**Project-wide sections below the phases (collapsible / tabbed)**
- Attic Gate card (kept, cleaner): status, photo evidence indicator, call-in/install dates placeholder
- Deficiencies summary table (across all phases) with phase column, severity, status
- Recent activity timeline (current audit list, polished)

Goal: at a glance, the user sees one indicator per phase and the overall project pulse — drill-in lives on the Phase Details page.

## 2. New Phase Details page (`src/pages/PhaseDetail.tsx`)

Route: `/project/:projectId/phase/:phaseId` (added in `App.tsx`).

Layout:
- Header: breadcrumb (Project › Phase), phase title, the same health indicator pill, current status badge
- Action row: "Start phase" / "Mark ready for inspection" placeholders (disabled with tooltip — gates required)
- Tabs (using existing shadcn `tabs.tsx`):
  - **Overview** — schedule, assigned subcontractor, foreman/QC info placeholder
  - **Gates** — Site Check + Inspection cards with status, photo evidence count, completed-by
  - **Deficiencies** — list scoped to this phase, severity, status, before/after photo placeholders
  - **Photos** — grid of photo evidence for this phase (placeholders if none)
  - **Activity** — audit events filtered to this phase

API additions in `src/lib/api/adapters/prototype/index.ts`:
- `getPhase(phaseId): ApiResult<PhaseDetail>` — returns the existing `PhaseDetail` shape (already in `types.ts`), enforces PM permission via parent project.

## 3. "New Client" modal (`src/components/dashboard/NewClientDialog.tsx`)

Triggered from header "New client" button (clients view) and a future empty state CTA.

Fields (react-hook-form + zod):
- Name * (required)
- Primary contact name
- Phone
- Email (validated)
- Billing address (textarea)
- Notes (textarea)

Submit:
- Calls new `createClient(input)` in prototype adapter — appends to `seedClients`, returns the created record, invalidates `["clients"]`.
- Toast success, closes modal, navigates to that client's projects.

## 4. "New Project" modal (`src/components/dashboard/NewProjectDialog.tsx`)

Triggered from:
- Header "New project" (when on dashboard or inside client-projects view)
- Empty state inside `ClientProjectsView`

Fields:
- Client * (Select; pre-filled & locked when opened from a client context)
- Project number * (auto-suggest "TPM-XXXX" based on count, editable)
- Project name *
- Site address *
- Assigned Project Manager (Select of PMs; admin only — for PM users defaults to self and is hidden)
- Scheduled start / end (date inputs)
- Status (defaults to `draft`)

Submit:
- Calls new `createProject(input)` in prototype adapter:
  - Appends `Project` to `seedProjects`
  - Auto-generates the three default `Phase` rows (insulation/drywall/finishing, status `not_started`) per the spec ("Generates default phases")
  - Auto-generates the standard `Gate` rows (site_check + inspection per phase, attic_check per project)
  - Writes an `AuditEvent`
- Invalidates `["projects", …]`, `["phases"]`, `["gates"]`.
- Toast success, navigates to the new project's detail page.

## 5. Wire-up changes

- `src/pages/Index.tsx`: replace the two `toast(...)` placeholders on the New client / New project buttons with the new dialogs (state-controlled `open`).
- `src/components/dashboard/ClientProjectsView.tsx`: pass through a real `onCreateProject` that opens the project dialog with `clientId` pre-filled.
- `src/App.tsx`: add `/project/:projectId/phase/:phaseId` route.

## Technical notes

- All new colors stay on the existing semantic tokens (`status-*`, `primary`, `muted`, `card`). Add a derived helper `phaseHealth(phase, gates, deficiencies)` in `src/lib/derived.ts` returning `{ tone: StatusTone | "attention", label: string, reason: string }` — this single function powers the phase card indicator on both the dashboard project card (optional follow-up) and project detail.
- Modals use existing `Dialog`, `Form`, `Input`, `Select`, `Textarea`, `Button` shadcn components. No new deps.
- Adapter mutations append to in-memory arrays; surviving the session is fine for the prototype, matching how the rest of `seed.ts` is mutated nowhere.
- No backend / Lovable Cloud changes — still pure prototype adapter.

## Out of scope

- Photo upload UI (placeholders only)
- Editing existing projects / phases
- Recycle bin & client deletion
- Real auth, real audit writes for non-create actions
