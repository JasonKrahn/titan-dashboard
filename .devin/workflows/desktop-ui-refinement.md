---
description: Browser-first workflow for auditing, refining, polishing, and verifying desktop web UI
---

# Desktop UI Refinement

Use this workflow to inspect and polish desktop web UI. Follow this disciplined refinement loop:

## 1. Inspect Live App (CRITICAL - Do not skip)

- Use browser_preview to launch the app at a desktop viewport (~1440px)
- Navigate to the primary user flow that needs refinement
- Check console for errors
- Take note of the current visual state before making any changes

## 2. Identify Issues

Check these areas systematically:

- **Visual hierarchy**: Clear primary action? Readable content order? Good contrast?
- **Layout rhythm**: Consistent gutters, spacing, card density, alignment, whitespace
- **Typography**: Readable sizes, line heights, weights, labels, captions
- **Surfaces**: Backgrounds, panels, borders, shadows, dividers, hover states
- **Interaction states**: Hover, focus, active, disabled, loading states
- **Desktop fit**: No overflow, cramped columns, awkward max-widths, tiny hit targets
- **Flow continuity**: Navigation, filters, forms, tables stay coherent

## 3. Read Relevant Code

Only read the files needed for the visible issues:

- Layout primitives (containers, grids, flex layouts)
- Design tokens (colors, spacing, typography scales)
- Shared components that affect the issue
- Route/page files for the affected screens

## 4. Plan Before Editing

For multi-file changes, write a short plan:

- What was inspected
- Top 2-3 visual/interaction issues found
- Smallest set of changes to improve the experience
- How you'll verify the fix

## 5. Implement Minimal Changes

- Keep changes local to affected UI surfaces
- Reuse existing tokens, variants, utilities
- Don't add new tokens unless repeated use justifies them
- Maintain responsive behavior (don't break mobile)
- Preserve accessibility attributes
- Avoid broad formatting churn

## 6. Verify In Browser

- Re-launch browser_preview
- Check the affected screen at desktop viewport
- Verify the main user flow works
- Check console for new errors
- Run lint/typecheck/tests if available

## 7. Report Results

Provide a concise summary:

- **Changed files**: List relevant files
- **Visual improvements**: Concrete UI changes made
- **Verification**: What was checked
- **Risks**: Any remaining uncertainty

## Design Rules

- Preserve existing design system unless asked to redesign
- Strengthen hierarchy with spacing, contrast, grouping - not decoration
- Avoid generic AI aesthetics (purple gradients, glassmorphism, over-animation)
- Use motion only to clarify state/sequence/affordance
- Don't change business logic, data fetching, or permissions unless required

## Tool Priority

1. browser_preview - Launch and interact with live UI
2. chrome-devtools MCP - Element inspection, accessibility audit
3. frontend-design skill - Visual hierarchy guidance
4. accessibility skill - A11y checks
5. use-my-browser skill - For signed-in/dynamic pages

// turbo
