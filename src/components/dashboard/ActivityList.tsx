import type { AuditEvent } from "@/lib/types";
import type { AuditLookups } from "@/lib/audit";
import { formatAuditEvent } from "@/lib/audit";

interface ActivityListProps {
  events: AuditEvent[];
  lookups: AuditLookups;
}

export function ActivityList({ events, lookups }: ActivityListProps) {
  return (
    <ol className="space-y-3">
      {events.map((event) => {
        const display = formatAuditEvent(event, lookups);
        return (
          <li key={event.id} className="flex items-start gap-3 text-sm">
            <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <div className="flex-1">
              <p className="font-medium">{display.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{display.relativeTime}</p>
              {display.context && (
                <p className="mt-1 text-xs text-muted-foreground">{display.context}</p>
              )}
              {display.statusText && (
                <p className="mt-1 text-xs text-muted-foreground">{display.statusText}</p>
              )}
              {display.metadataText && (
                <p className="mt-1 text-xs text-muted-foreground">{display.metadataText}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
