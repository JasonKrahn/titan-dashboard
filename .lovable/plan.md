## Goal
Make every badge in the app a consistent, themed scan signal — same shape language, same tone vocabulary, same icons-per-meaning. Today badges come from three primitives, two duplicate color maps, and a lot of hard-coded Tailwind palette classes (`bg-blue-100`, `text-amber-700`, …) that ignore the design system and look noisy together.

## Audit of what exists today

Primitives:
- `ui/badge.tsx` — shadcn default/secondary/destructive/outline. Used raw for trade, action, "Resolved" badges with ad-hoc classes.
- `dashboard/StatusBadge.tsx` — proper semantic tones (`status-*` tokens), dot + label, `sm`/`md`. Used for project/phase status.
- `dashboard/PhaseHealthPill.tsx` — same tones + icon, used only on phase cards/detail.
- Inline `KpiChip` and `toneChipClasses` re-implemented locally in `PhaseDetail.tsx`.

Hard-coded color maps (not themed, drift between files):
- `lib/audit.ts` `AUDIT_ACTION_COLOR` + `AUDIT_PRIORITY_BORDER` (used by Activity Log).
- `pages/ProjectDetail.tsx` `ACTION_COLOR` (near-duplicate of the above, used by activity preview).
- `pages/SubcontractorRolodex.tsx` `TRADE_COLOR` (3 hard-coded trades).
- `PhaseDetail.tsx` `<Badge variant="default">Resolved</Badge>` — uses brand primary, reads as "active CTA", not "done".
- Severity (low/medium/high/critical on deficiencies) is rendered as plain text — no badge at all.

Token issue:
- `--status-ready` (230°) and `--status-in-progress` (212°) are both blues; ready needs to read distinctly (currently does not).

## Design system: one tone vocabulary

Seven semantic tones, each with an icon, a dot color, and tinted bg/text/border. Every badge in the app maps to exactly one of these.

| Tone        | Meaning                                  | Token              | Icon          |
|-------------|------------------------------------------|--------------------|---------------|
| neutral     | not started, archived, draft, generic    | status-not-started | MinusCircle   |
| info        | in progress, status change, assignment   | status-in-progress | Loader2 / Info|
| ready       | ready for inspection, awaiting action    | status-ready       | Clock         |
| success     | passed, closed, resolved, completed, created | status-closed  | Check         |
| warning     | attention, open deficiency (low/med)     | status-attention   | AlertTriangle |
| danger      | blocked, failed, critical/high severity  | status-blocked     | AlertOctagon  |
| accent      | photo / evidence (purple)                | new `--status-accent` | Camera     |

Retune `--status-ready` to a distinct hue (amber/violet — pick one that doesn't collide with info-blue or warning-amber; proposal: violet `262 80% 60%`) so ready ≠ in-progress at a glance.

Add `--status-accent` (purple) so photo/evidence badges have a token instead of `bg-purple-100`.

## New / refactored badge primitives

Single source of truth in `src/components/ui/`:

1. **`Badge` (replace shadcn variants)** — `cva` with `tone` (the 7 above) × `appearance` (`soft` default tinted, `solid` filled, `outline`) × `size` (`xs`/`sm`/`md`) × optional `dot` and `icon`. All other badges compose this.
2. **`StatusBadge`** — thin wrapper that takes a domain status (`Phase["status"]`, `Gate["status"]`, `Project["status"]`, `Deficiency["status"]`) and renders `<Badge tone={…} icon={…} label={STATUS_LABEL[…]} />`. Removes per-call-site mapping.
3. **`SeverityBadge`** — new. Maps `low→neutral`, `medium→warning`, `high→danger` (solid border-left accent), `critical→danger` solid. Used in `DeficiencyDialog`, deficiency lists, ProjectDetail row "· severity" string.
4. **`TradeBadge`** — new. `tone` derived from a single map keyed by `TradeType` (insulation→info, drywall→warning, finishing→success, plus a deterministic fallback for any future trades via hash → tone). Replaces local `TRADE_COLOR`.
5. **`ActionBadge`** — new. Maps every audit `action` to a tone via one shared `AUDIT_ACTION_TONE` map in `lib/audit.ts`. Replaces both `AUDIT_ACTION_COLOR` and the duplicate `ACTION_COLOR` in ProjectDetail. Optional `priority` prop drives the left border (danger/warning) — same map controls activity row accent.
6. **`PhaseHealthPill`** — keep, but make it a thin wrapper over `Badge` with `appearance="soft"`, `size="md"`/`lg`, the existing icon set, and the same tone tokens. Identical visual rules as everything else.
7. **`KpiChip`** — promote out of `PhaseDetail.tsx` to `components/ui/kpi-chip.tsx` and rebuild on the same tones. Delete `toneChipClasses` local helper.

Shape rules (applied by the primitive, not the caller):
- `rounded-full`, `border`, `font-medium`; `xs`=`text-[10px] px-1.5 py-0`, `sm`=`text-[11px] px-2 py-0.5`, `md`=`text-xs px-2.5 py-1`.
- Soft = `bg-tone/15 text-tone border-tone/30`. Solid = `bg-tone text-tone-foreground border-transparent`. Outline = `border-tone/50 text-tone`.
- Icon size = `h-3 w-3` (xs/sm) / `h-3.5 w-3.5` (md). Dot only when no icon.

## Changes per file (UI only)

- `src/index.css` + `tailwind.config.ts` — retune `--status-ready`, add `--status-accent` + `--status-accent-fg`, expose `status.accent`.
- `src/components/ui/badge.tsx` — rewrite with tone/appearance/size/icon/dot. Keep `variant` prop alias mapping to tones for backward compatibility (`default→info`, `secondary→neutral`, `destructive→danger`, `outline→neutral outline`).
- `src/components/dashboard/StatusBadge.tsx` — switch to `Badge` primitive, add icon by tone.
- `src/components/dashboard/PhaseHealthPill.tsx` — switch to `Badge` primitive.
- New: `src/components/ui/severity-badge.tsx`, `trade-badge.tsx`, `action-badge.tsx`, `kpi-chip.tsx`.
- `src/lib/audit.ts` — replace `AUDIT_ACTION_COLOR` with `AUDIT_ACTION_TONE` (tone enum). `AUDIT_PRIORITY_BORDER` becomes `AUDIT_ACTION_PRIORITY: 'danger'|'warning'|undefined` consumed by `ActionBadge` and the activity row's left accent.
- `src/pages/ActivityLog.tsx` — replace raw `<Badge>` with `<ActionBadge action=…/>`; row priority border reads from new map.
- `src/pages/ProjectDetail.tsx` — delete local `ACTION_COLOR`, use `ActionBadge`; replace "· {severity}" text with `<SeverityBadge>`.
- `src/pages/PhaseDetail.tsx` — delete local `toneChipClasses`/`KpiChip`, import shared; replace `<Badge variant="default">Resolved</Badge>` with `<StatusBadge>` (success); use `SeverityBadge` in deficiency cards.
- `src/pages/SubcontractorRolodex.tsx` — replace `TRADE_COLOR` + raw `<Badge>` with `<TradeBadge>`. The "active count" pill at line 482 becomes `<Badge tone="neutral" appearance="outline" size="xs">`.
- `src/components/dashboard/ProjectCard.tsx` — already uses `StatusBadge`; verify size/icon updates render fine.
- `src/components/dashboard/DeficiencyDialog.tsx` — preview chip in the severity Select uses `SeverityBadge`.

## Verification

- Visual sweep on `/`, `/project/:id`, `/project/:id/phase/:phaseId`, `/clients`, `/subcontractors`, `/activity` at desktop and mobile (viewport 947 and ~390).
- Grep for stragglers: `rg "bg-(blue|amber|emerald|teal|red|purple|slate)-(100|200|400|700)" src` returns zero hits after the refactor.
- `rg "variant=\"default\"|variant=\"destructive\"" src` reviewed — only intentional CTA buttons remain, no badges.
- Existing tests under `src/components/dashboard/*.test.*` and `src/lib/audit.test.ts` still pass; update audit test if the color field is renamed.

## Out of scope

No data-model changes, no new statuses, no behavior changes — pure presentation refactor.
