---
description: iPhone/iPad-first workflow for auditing, refining, polishing, and verifying mobile UI with iOS and PWA bias
---

# Mobile UI Refinement

Use this workflow to inspect and polish mobile web UI with an iPhone, iPad, iOS Safari, and PWA-first bias.

## 1. Inspect Live App First

Use the same preview approach as `/browser-preview`:

1. Identify whether a dev server is already running on port `8080`.
2. If needed, start the app with `npm run dev`.
3. Launch `browser_preview` at `http://localhost:8080`.
4. Use chrome-devtools MCP mobile emulation and resizing where available.
5. Treat emulation as a proxy; report clearly if no real iOS device was checked.

Do not edit UI code before inspecting the relevant mobile screen when the app can run.

## 2. Prioritize iOS Viewports

Check the smallest representative set first, then expand if bugs appear:

- **iPhone 14/15 portrait**: `390x844`
- **iPhone 14/15 landscape**: `844x390`
- **iPhone Pro Max portrait**: `430x932`
- **iPad Mini portrait**: `768x1024`
- **iPad Mini landscape**: `1024x768`
- **iPad Air portrait**: `820x1180`
- **iPad Air landscape**: `1180x820`
- **iPad Pro 11 portrait**: `834x1194`
- **iPad Pro 12.9 portrait**: `1024x1366`

## 3. Watch Critical Breakpoints

Pay special attention to Tailwind default breakpoints:

- **`sm:` = `640px`**: no modern iPhone portrait reaches this.
- **`md:` = `768px`**: iPad Mini portrait sits exactly on this boundary.
- **`lg:` = `1024px`**: iPad Mini landscape and iPad Pro 12.9 portrait hit this boundary.

When a page uses `md:` or `lg:` layout switches, verify both sides of the breakpoint and rotate iPad-sized viewports.

## 4. Identify Mobile UI Issues

Check these areas systematically:

- **Thumb reach**: primary actions are reachable without awkward stretching.
- **Touch targets**: controls have at least ~`44px` effective tap area.
- **Spacing density**: content is compact but not cramped.
- **Typography**: labels, metadata, captions, and form text are readable.
- **Navigation**: tabs, back buttons, drawers, and bottom actions are obvious.
- **Forms**: inputs, selects, date fields, validation, and submit buttons remain usable.
- **Modals/drawers**: focus, scroll, close affordances, and footer actions work on small screens.
- **Tables/data grids**: avoid unusable horizontal scrolling; prefer cards or stacked rows when appropriate.
- **Loading/empty/error states**: states fit small screens without hiding actions.
- **No hover dependency**: all interactions work without hover.

## 5. Check Common iOS Bugs

Before deciding a mobile refinement is complete, check for these iOS-specific issues:

- **Input zoom bug**: iOS Safari zooms focused inputs when form text is below `16px`; use `text-base` or equivalent for inputs, selects, and textareas.
- **Viewport height bugs**: `100vh` can be wrong with browser chrome or PWA chrome; prefer tested `dvh/svh` patterns where useful.
- **Safe-area bugs**: fixed headers, bottom navs, drawers, and action bars must respect notches and the home indicator using `env(safe-area-inset-*)` when needed.
- **Virtual keyboard bugs**: focused fields, sticky footers, submit buttons, and modal content must remain visible and reachable.
- **Scroll-lock bugs**: modals/drawers should not allow background scroll and should restore scroll after close.
- **Fixed/sticky quirks**: verify sticky headers, bottom bars, and floating actions while scrolling and while the keyboard is open.
- **Overscroll bounce**: nested scroll areas should not trap users or create confusing bounce behavior.
- **Double-tap/gesture issues**: avoid tiny controls and layouts that invite accidental zoom or mis-taps.
- **iOS form quirks**: verify date, time, select, file, and autocomplete behavior.
- **Tap highlight/focus states**: interactive elements should provide clear feedback without relying on desktop hover styles.

## 6. Apply PWA Bias

Evaluate the UI as an installed app surface, not just a browser page:

- **Standalone navigation**: users should have clear back paths without relying on browser chrome.
- **Persistent context**: headers, tabs, and action bars should clarify where the user is.
- **Status bar/safe area**: top and bottom edges should feel intentional in standalone mode.
- **Launch/resume**: key screens should tolerate reloads, resumed sessions, and stale state.
- **Offline/poor network**: loading, retry, and cached data states should be understandable.
- **Manifest/icons**: if PWA work is in scope, verify manifest metadata, icons, display mode, and theme/status colors.
- **Cache freshness**: if service workers are present, be alert for stale UI or API data after deploys.

## 7. Read Relevant Code Only

After inspection, read only files related to the visible mobile issue:

- Route/page component for the affected screen.
- Shared layout primitives and responsive wrappers.
- Navigation, tab, drawer, modal, form, card, or table components involved.
- CSS/theme files or Tailwind classes controlling breakpoints, spacing, and typography.
- PWA manifest/service worker files only when the issue involves installability, offline state, or cache behavior.

## 8. Plan Before Editing

For multi-file or shared-component changes, state a concise plan:

- What mobile viewport(s) were inspected.
- The top 2-3 iOS/mobile issues found.
- The smallest change set that should fix them.
- Verification viewports and checks.

For a single obvious tweak, proceed directly but still verify afterward.

## 9. Implement Minimal Changes

- Preserve behavior, routes, data flow, permissions, and desktop layout unless a narrow related change is necessary.
- Prefer existing tokens, utilities, variants, and component patterns.
- Improve hierarchy through spacing, density, readable type, grouping, and clear states.
- Avoid broad redesigns or generic visual effects.
- Do not solve mobile by hiding important content unless the product flow still works.
- Keep desktop and tablet behavior intact.

## 10. Verify Before Reporting Done

Verify at minimum:

- One iPhone portrait viewport.
- One iPhone landscape viewport when landscape is relevant.
- One iPad portrait viewport.
- One iPad landscape viewport when layout changes at `md:` or `lg:`.
- The `768px` and `1024px` boundaries if relevant classes or grids use `md:` or `lg:`.
- Primary user flow touched by the change.
- Console for new runtime errors.
- Relevant lint, typecheck, or test command when practical.

If real iOS device testing was skipped, say so explicitly.

## 11. Report Results

Keep the final report concise:

- **Changed files**: list relevant files.
- **Mobile improvements**: concrete changes made.
- **iOS/PWA checks**: viewports and bug classes verified.
- **Verification**: browser checks and commands run.
- **Risks**: skipped devices, unchecked orientations, or follow-up recommendations.

// turbo
