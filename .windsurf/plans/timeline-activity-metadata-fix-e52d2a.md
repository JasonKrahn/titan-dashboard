# Fix Timeline Change Information in Activity Updates

Fix the incorrect implementation that tried to format schedule changes from metadata instead of the event-level previousValue/nextValue fields.

## Root Cause
The previous implementation incorrectly tried to access schedule changes via `metadata.previousValue` and `metadata.nextValue`, but the AuditEvent interface shows these are top-level properties:
- `event.previousValue?: unknown`
- `event.nextValue?: unknown`
- `event.metadata?: Record<string, unknown>`

The `updatePhaseSchedules` function sets these at the event level, not in metadata.

## Changes Required

### 1. Revert previous changes to `src/lib/audit.ts`
- Remove the incorrect schedule change formatting from `formatMetadataText`
- Remove the `formatDateWithOptions` import

### 2. Add schedule change formatting to `formatAuditEvent` function
- Check `event.previousValue` and `event.nextValue` for schedule changes
- Format date changes as "Start: Apr 10 → Apr 15, End: May 1 → May 5"
- Set the formatted text in the `metadataText` field of the returned display object
- Only show dates that actually changed

### 3. Verification
- TypeScript compilation passes
- Existing activity tests pass
- Browser preview shows timeline change details in activity updates
