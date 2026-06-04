# Add Timeline Change Information to Activity Updates

Add schedule change details to activity updates so users can see what changed in the timeline (start/end dates) when phases are updated via the timeline editor.

## Current State
- Timeline/phase schedule changes create audit events with action "updated"
- Metadata includes `previousValue` and `nextValue` with `scheduledStart` and `scheduledEnd`
- Activity display shows "Updated Drywall" but doesn't show what dates changed
- `formatMetadataText` in audit.ts handles inventory changes, notes, summaries but not schedule changes

## Changes Required

### 1. Update `src/lib/audit.ts`
Add schedule change formatting to `formatMetadataText` function:
- Check for `previousValue` and `nextValue` with `scheduledStart`/`scheduledEnd` fields
- Format date changes as "Start: Apr 10 → Apr 15, End: May 1 → May 5"
- Use existing `formatDateWithOptions` for consistent date formatting
- Only show dates that actually changed (start only, end only, or both)

### 2. Verification
- TypeScript compilation passes
- Existing activity tests pass
- Browser preview shows timeline change details in activity updates
