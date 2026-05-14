import { Activity, AlertTriangle, ArrowRight, Building2, Clock3, ClipboardCheck, Layers3, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ExecutiveFocusItem, ExecutiveMetric, ExecutiveSummary } from "@/lib/command/executiveSummary";

const METRIC_ICON: Record<ExecutiveMetric["id"], LucideIcon> = {
  portfolio: Activity,
  critical: AlertTriangle,
  aging: Clock3,
  inspection: ClipboardCheck,
};

const FOCUS_ICON: Record<string, LucideIcon> = {
  "Top PM exposure": UserRound,
  "Top client exposure": Building2,
  "Top phase pressure": Layers3,
  "Oldest unresolved": Clock3,
};

const TONE_TEXT: Record<BadgeTone, string> = {
  neutral: "text-status-not-started",
  info: "text-status-in-progress",
  ready: "text-status-ready",
  success: "text-status-closed",
  warning: "text-status-attention",
  danger: "text-status-blocked",
  accent: "text-status-accent",
};

const TONE_BORDER: Record<BadgeTone, string> = {
  neutral: "border-status-not-started/30",
  info: "border-status-in-progress/35",
  ready: "border-status-ready/40",
  success: "border-status-closed/35",
  warning: "border-status-attention/45",
  danger: "border-status-blocked/45",
  accent: "border-status-accent/35",
};

interface ExecutiveBriefProps {
  summary: ExecutiveSummary;
  onMetricSelect?: (filter: ExecutiveMetric["filter"]) => void;
  onOpenProject?: (projectId: string) => void;
}

export function ExecutiveBrief({ summary, onMetricSelect, onOpenProject }: ExecutiveBriefProps) {
  return (
    <section className="rounded-md border border-border bg-surface-panel">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest">Executive Brief</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Current-state risk, owner concentration, and aging pressure from active operations.
          </p>
        </div>
        <Badge tone={summary.criticalProjects ? "danger" : summary.groupedRiskProjects ? "warning" : "success"} appearance="soft" size="sm">
          {summary.groupedRiskProjects}/{summary.activeProjects} active projects at risk
        </Badge>
      </header>

      <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-4">
        {summary.metrics.map((metric) => (
          <MetricPanel key={metric.id} metric={metric} onSelect={onMetricSelect} />
        ))}
      </div>

      <div className="border-t border-border px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Where leadership should look
          </h3>
          <span className="text-[11px] text-muted-foreground">
            {summary.activeFlags} active flag{summary.activeFlags === 1 ? "" : "s"} / {summary.totalFlags} total
          </span>
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {summary.leadershipFocus.map((item) => (
            <FocusPanel key={item.label} item={item} onOpenProject={onOpenProject} />
          ))}
        </div>
      </div>
    </section>
  );
}

function MetricPanel({
  metric,
  onSelect,
}: {
  metric: ExecutiveMetric;
  onSelect?: (filter: ExecutiveMetric["filter"]) => void;
}) {
  const Icon = METRIC_ICON[metric.id];
  const clickable = Boolean(metric.filter && onSelect);

  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <Icon className={cn("h-4 w-4", TONE_TEXT[metric.tone])} aria-hidden />
        <Badge tone={metric.tone} appearance="outline" size="xs">
          {metric.denominator !== undefined ? `${metric.value}/${metric.denominator}` : metric.value}
        </Badge>
      </div>
      <div className="mt-4">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {metric.label}
        </div>
        <div className="mt-1 flex items-baseline gap-1">
          <span className={cn("text-3xl font-bold leading-none tabular-nums", TONE_TEXT[metric.tone])}>
            {metric.value}
          </span>
          {metric.denominator !== undefined && (
            <span className="text-sm text-muted-foreground">/ {metric.denominator}</span>
          )}
        </div>
        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{metric.detail}</p>
      </div>
    </>
  );

  if (clickable) {
    return (
      <button
        type="button"
        onClick={() => onSelect?.(metric.filter)}
        className={cn(
          "rounded-md border bg-background/35 p-3 text-left transition-colors hover:bg-accent/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          TONE_BORDER[metric.tone],
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={cn("rounded-md border bg-background/35 p-3", TONE_BORDER[metric.tone])}>
      {content}
    </div>
  );
}

function FocusPanel({
  item,
  onOpenProject,
}: {
  item: ExecutiveFocusItem;
  onOpenProject?: (projectId: string) => void;
}) {
  const Icon = FOCUS_ICON[item.label] ?? Activity;
  const canOpen = Boolean(item.projectId && onOpenProject);

  return (
    <div className={cn("rounded-md border bg-background/30 p-3", TONE_BORDER[item.tone])}>
      <div className="flex items-center gap-2">
        <Icon className={cn("h-3.5 w-3.5", TONE_TEXT[item.tone])} aria-hidden />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {item.label}
        </span>
      </div>
      <div className="mt-2 truncate text-sm font-semibold text-foreground">{item.value}</div>
      <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{item.detail}</p>
      {canOpen && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="mt-2 h-7 px-2 text-xs"
          onClick={() => item.projectId && onOpenProject?.(item.projectId)}
        >
          Open
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
