import { ArrowRight, AlertOctagon, AlertTriangle, Info } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { QUEUE_TYPE_LABEL, type QueueItem, type QueueSeverity } from "@/lib/command/attentionQueue";

const SEV_TONE: Record<QueueSeverity, BadgeTone> = {
  critical: "danger",
  warning: "warning",
  info: "info",
};

const SEV_ICON = {
  critical: AlertOctagon,
  warning: AlertTriangle,
  info: Info,
} as const;

const SEV_STRIPE: Record<QueueSeverity, string> = {
  critical: "bg-status-blocked",
  warning: "bg-status-attention",
  info: "bg-status-in-progress",
};

function ageLabel(days: number) {
  if (days < 1) return "today";
  if (days === 1) return "1d";
  if (days < 30) return `${days}d`;
  const mo = Math.round(days / 30);
  return `${mo}mo`;
}

interface Props {
  item: QueueItem;
  onOpen: (projectId: string) => void;
}

export function AttentionQueueItem({ item, onOpen }: Props) {
  const Icon = SEV_ICON[item.severity];
  return (
    <div
      className={cn(
        "relative grid grid-cols-[auto_1fr_auto] gap-3 px-4 py-3 transition-colors hover:bg-accent/40",
      )}
    >
      <span className={cn("absolute inset-y-0 left-0 w-1", SEV_STRIPE[item.severity])} aria-hidden />

      {/* Severity icon column */}
      <div className="pl-1 pt-0.5">
        <Icon
          className={cn(
            "h-4 w-4",
            item.severity === "critical" && "text-status-blocked",
            item.severity === "warning" && "text-status-attention",
            item.severity === "info" && "text-status-in-progress",
          )}
          aria-hidden
        />
      </div>

      {/* Main content */}
      <div className="min-w-0 space-y-1">
        {/* Row 1: Severity + Title + Age */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Badge tone={SEV_TONE[item.severity]} appearance="soft" size="xs" className="uppercase">
            {item.severity}
          </Badge>
          <span className="text-xs font-semibold text-foreground">{item.title}</span>
          <Badge tone="neutral" appearance="outline" size="xs" className="ml-auto sm:ml-0">
            {ageLabel(item.ageDays)}
          </Badge>
        </div>

        {/* Row 2: Project name (prominent) */}
        <div className="text-sm font-semibold leading-tight truncate">{item.projectName}</div>

        {/* Row 3: Phase + Owner/Client */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
          <span className="truncate">{item.phaseLabel}</span>
          <span aria-hidden>·</span>
          <span className="truncate">Client: {item.clientName}</span>
          <span aria-hidden>·</span>
          <span className="truncate">PM: {item.pmName}</span>
        </div>

        {/* Row 4: Next action (primary) */}
        <p className="text-[11px] text-foreground">
          <span className="font-semibold uppercase tracking-wider text-foreground/60">Next: </span>
          {item.nextAction}
        </p>

        {/* Row 5: Reason (contextual, secondary) */}
        <p className="text-xs text-muted-foreground/80">{item.reason}</p>

        {/* Row 6: Secondary flags (tertiary) */}
        {item.secondaryFlags && item.secondaryFlags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {item.secondaryFlags.map((flag) => (
              <Badge
                key={flag.type}
                tone={SEV_TONE[flag.severity]}
                appearance="outline"
                size="xs"
                className="uppercase"
              >
                {QUEUE_TYPE_LABEL[flag.type]}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-start gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1 text-xs"
          onClick={() => onOpen(item.projectId)}
        >
          Open
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
