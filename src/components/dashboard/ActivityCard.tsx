import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { IconWell } from "@/components/ui/icon-well";
import { ActionBadge } from "@/components/ui/action-badge";
import type { AuditEvent } from "@/lib/types";

interface ActivityCardProps {
  event: AuditEvent;
  display: {
    context: string;
    actorInitials?: string;
    actorName?: string;
    relativeTime: string;
    statusText?: string;
    metadataText?: string;
    linkUrl?: string;
    priorityBorderClass?: string;
  };
  children?: ReactNode;
}

export function ActivityCard({
  event,
  display,
  children,
}: ActivityCardProps) {
  const mainContent = (
    <div>
      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
        <div className="flex items-center gap-2">
          <ActionBadge action={event.action} size="sm" />
        </div>
        <div className="flex items-center gap-3 ml-auto text-xs text-muted-foreground">
          {display.actorInitials && display.actorName && (
            <IconWell tone="primary" size="sm" shape="pill" className="text-eyebrow font-semibold" title={display.actorName}>
              {display.actorInitials}
            </IconWell>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {display.relativeTime}
          </span>
        </div>
      </div>
      <div className="mt-2 text-sm">
        <span className="font-medium">{display.context}</span>
      </div>
      {display.statusText && (
        <div className="mt-1 text-xs text-muted-foreground">
          <span className="font-medium">{display.statusText}</span>
        </div>
      )}
      {display.metadataText && (
        <div className="mt-1 text-xs text-muted-foreground">
          {display.metadataText}
        </div>
      )}
    </div>
  );

  return (
    <Card
      surface="default"
      className={`p-4 shadow-card ${display.priorityBorderClass ?? ""} ${display.linkUrl ? "hover:shadow-lg hover:border-primary/50 transition-shadow" : ""}`}
    >
      {display.linkUrl ? (
        <Link
          to={display.linkUrl}
          className="block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {mainContent}
        </Link>
      ) : (
        mainContent
      )}
      {children}
    </Card>
  );
}
