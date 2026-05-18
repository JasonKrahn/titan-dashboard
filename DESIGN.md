---
version: alpha
name: Titan PM Operations
description: Dark, dense, operational dashboard design system for construction project management, client records, admin triage, inventory, and field workflow surfaces.
colors:
  primary: "#1561F9"
  primary-glow: "#3D7EFF"
  primary-foreground: "#0E1016"
  background: "#0E1016"
  foreground: "#F3F5F7"
  card: "#171A21"
  surface-panel: "#171A21"
  surface-elevated: "#1B1F27"
  surface-inset: "#1F2229"
  secondary: "#23272F"
  muted: "#1F2229"
  muted-foreground: "#8F9CAE"
  accent: "#272B34"
  border: "#272B34"
  border-strong: "#2F3541"
  destructive: "#E23636"
  status-not-started: "#6B7280"
  status-in-progress: "#3692F6"
  status-ready: "#8951EC"
  status-blocked: "#E83F3F"
  status-closed: "#28BD5F"
  status-attention: "#F48C25"
  status-accent: "#B152E0"
typography:
  h1:
    fontFamily: Inter
    fontSize: 1.875rem
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0em
  h2:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: 0.08em
  h3:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: 0em
  body:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0em
  body-strong:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: 0em
  label:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: 600
    lineHeight: 1rem
    letterSpacing: 0.08em
  meta:
    fontFamily: Inter
    fontSize: 0.6875rem
    fontWeight: 500
    lineHeight: 1rem
    letterSpacing: 0em
  eyebrow:
    fontFamily: Inter
    fontSize: 0.625rem
    fontWeight: 700
    lineHeight: 1rem
    letterSpacing: 0.12em
rounded:
  sm: 0.5rem
  md: 0.625rem
  lg: 0.75rem
  full: 9999px
spacing:
  xs: 0.25rem
  sm: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  page-y: 1.5rem
  container-padding: 0.75rem
  container-padding-sm: 1.5rem
  container-max: 1400px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.sm}"
    padding: 0.5rem 1rem
    height: 2.5rem
  button-secondary:
    backgroundColor: "{colors.card}"
    textColor: "{colors.muted-foreground}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.sm}"
    padding: 0.5rem 0.75rem
    height: 2.5rem
  card-panel:
    backgroundColor: "{colors.surface-panel}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: 1rem
  card-interactive:
    backgroundColor: "{colors.surface-panel}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: 1.25rem
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: 0.5rem 0.75rem
    height: 2.5rem
  badge-soft:
    backgroundColor: "{colors.surface-inset}"
    textColor: "{colors.foreground}"
    typography: "{typography.meta}"
    rounded: "{rounded.full}"
    padding: 0.25rem 0.625rem
  top-nav:
    backgroundColor: "{colors.background}"
    textColor: "{colors.muted-foreground}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.lg}"
    padding: 0.5rem 0.75rem
---

## Overview

Titan PM Operations is a focused work surface for construction project management. It should feel like a control room: dark, calm, precise, and dense enough for repeated daily use by admins, project managers, and inventory users.

The first impression is not a marketing page. The app opens into work: client tables, project queues, command center risk summaries, filters, and action controls. Visual polish comes from disciplined contrast, compact type, semantic color, and crisp containment rather than illustration or decoration.

The design language is utilitarian and operational. Use the blue primary color to mark the current route, primary creation actions, selected tabs, and focused states. Use red, orange, purple, green, and gray only as semantic status signals.

## Colors

The default theme is dark. The base background is near-black navy, panels are slightly raised navy-slate, and borders are visible but quiet.

- **Background (#0E1016):** Page foundation, sticky header, and empty space.
- **Panel surfaces (#171A21, #1B1F27, #1F2229):** Cards, filter bars, tables, admin modules, and inset controls.
- **Foreground (#F3F5F7):** Primary text, key counts, page titles, and active navigation labels.
- **Muted foreground (#8F9CAE):** Captions, descriptions, metadata, table secondary text, and helper copy.
- **Primary blue (#1561F9):** Active navigation, primary buttons, selected controls, focus rings, and dominant interaction feedback.
- **Status red (#E83F3F):** Critical blockers, failed inspections, destructive actions, and urgent command center exposure.
- **Status orange (#F48C25):** Aging pressure, stale work, warnings, and attention states.
- **Status purple (#8951EC):** Ready-for-inspection and queue readiness states.
- **Status green (#28BD5F):** Closed, passed, success, complete, and archive-ready states.
- **Status gray (#6B7280):** Not-started, unavailable, neutral, or inactive operational state.

Do not introduce decorative gradients beyond the existing primary logo button and subtle panel gradient. Avoid one-note blue screens by letting status colors carry operational meaning.

## Typography

The system uses **Inter** across the product. The voice is concise and work-focused.

- **Page titles:** 24px on mobile and 30px on larger screens, bold, tight line height.
- **Section labels:** Small uppercase labels with generous letter spacing for dashboard modules such as "Executive Brief", "Exception Filters", and KPI labels.
- **Body text:** 14px regular for descriptions, table cells, helper text, and card metadata.
- **Numbers:** Use bold tabular-feeling numerals for KPIs, counts, and totals. Large counts sit around 30px; compact badges use 11-12px.
- **Metadata:** 10-11px for timestamps, project numbers, captions, and footer status text.

Keep type compact inside dashboards, cards, tables, and controls. Do not use hero-scale typography in operational surfaces.

## Layout

Use a centered container with a maximum width of 1400px. Page content uses 24px vertical rhythm and 12px mobile side padding, increasing to 24px on wider screens.

The app favors dense, scannable layouts:

- Sticky top header with brand, segmented navigation, admin menu, role switcher, and settings.
- Page title and description immediately below the header.
- Primary create action near the top of the workflow, not hidden in a toolbar.
- KPI strips use equal columns on desktop and remain compact on mobile.
- Filters sit in a contained inset panel on desktop and move into a bottom sheet on mobile.
- Data-heavy content appears as tables, queues, project cards, and split grids.
- Command Center uses a 12-column desktop grid: the attention queue dominates, insights and heatmap sit to the right.
- Repeated cards use stable dimensions and predictable internal sections: header, metadata, status, body signal, footer actions.

Mobile views should preserve the same hierarchy while reducing columns, hiding secondary labels, and using bottom sheets or action sheets for controls.

## Elevation & Depth

Depth is subtle and structural. Use borders, surface contrast, and restrained shadows instead of heavy drop shadows.

Panels use a faint vertical surface gradient and a strong border. Interactive cards lift slightly on hover and switch to the primary-emphasis border. Sticky elements use translucent dark backgrounds with backdrop blur.

Focus states are visible and blue. Active nav items and selected tabs use blue fill plus ring or glow. Command Center critical panels use status-colored borders instead of additional shadows.

## Shapes

The system is moderately rounded, not pill-heavy.

- Cards and major panels: 12px radius.
- Buttons, nav controls, inputs, dropdown triggers, and icon buttons: 6-8px radius.
- Badges and avatar initials: full radius.
- Tables keep rounded outer containers, but rows remain flat and divided by borders.

Do not mix very sharp rectangles with highly rounded cards. Do not add large decorative blobs, oversized rounded marketing cards, or soft neumorphic shapes.

## Components

**Header:** Sticky, 64px tall, dark translucent background with a thin bottom border. Brand mark is a blue gradient square with a white "T", paired with "Titan PM" and the small uppercase "Operations" label.

**Navigation:** The main dashboard switcher is a segmented control. Active items use primary blue fill and foreground text. Admin tools live in a compact dropdown. Secondary route buttons such as Subcontractors use bordered card styling.

**Buttons:** Primary buttons are blue, 40px tall by default, with icon-plus-text when creating records. Secondary and outline buttons use card or background surfaces with border and muted text. Icon-only controls should stay square and compact.

**Cards:** Use `card-panel` for static modules and `card-interactive` for project cards or rows that open detail screens. Project cards show project number, title, client, address, schedule dates, status badge, phase progress, gate badges, issue state, updated timestamp, and PM initials.

**Tables:** Tables are preferred for client directory and administrative rosters. Keep rows dense, use muted secondary cells, align numeric totals right, and show sorting through text plus a small arrow icon.

**Filters and Search:** Search fields lead with a search icon and use the dark background surface. Selects are fixed-width on desktop. Binary filters use switches with labels. Mobile filters open in a bottom sheet.

**Badges:** Status badges are soft, rounded, bordered, and semantic. Use icon or dot indicators. Red means blocked or failed; purple means ready; green means closed or passed; gray means not started; orange means attention.

**Icon Wells:** Use tinted square or panel icon wells for KPI and module icons. Icon wells should communicate category without competing with the main value.

**Command Center:** Executive brief modules use uppercase labels, bold red/orange/purple counts, and status-colored borders. The attention queue is list-first and action-oriented; each item must expose severity, cause, age, client, PM, next action, and an Open button.

**Dialogs and Sheets:** Use existing Radix/shadcn primitives, dark panel surfaces, compact headers, clear primary actions, and explicit destructive states.

## Do's and Don'ts

- Do keep screens dense, quiet, and optimized for scanning.
- Do use semantic status color consistently across badges, icons, borders, and alerts.
- Do keep primary blue reserved for navigation, selected states, focus, and primary actions.
- Do make active, pressed, selected, focused, disabled, empty, loading, and error states visible.
- Do prefer tables, segmented controls, badges, icon buttons, switches, and compact cards for operational workflows.
- Do keep mobile controls reachable with bottom sheets and stable action rows.
- Don't create marketing-style hero sections, oversized decorative cards, or explanatory onboarding blocks.
- Don't add decorative orbs, bokeh backgrounds, generic stock imagery, or unrelated illustration.
- Don't make new screens feel lighter, warmer, or more playful than the current control-room aesthetic.
- Don't rely on color alone for status; pair status color with text, icon, border, or label.
- Don't dilute the status palette by using red, orange, purple, or green for decoration.
