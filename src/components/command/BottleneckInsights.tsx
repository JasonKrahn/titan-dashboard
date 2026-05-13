import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BadgeTone } from "@/components/ui/badge";
import type { BottleneckInsight } from "@/lib/command/heatmap";

const DOT: Record<BadgeTone, string> = {
  neutral: "bg-status-not-started",
  info: "bg-status-in-progress",
  ready: "bg-status-ready",
  success: "bg-status-closed",
  warning: "bg-status-attention",
  danger: "bg-status-blocked",
  accent: "bg-status-not-started",
};

interface Props {
  insights: BottleneckInsight[];
  onInsightClick?: (insight: BottleneckInsight) => void;
}

export function BottleneckInsights({ insights, onInsightClick }: Props) {
  return (
    <section className="rounded-md border border-border bg-surface-panel">
      <header className="flex items-center gap-2 px-4 py-3">
        <Lightbulb className="h-3.5 w-3.5 text-status-attention" aria-hidden />
        <h2 className="text-sm font-bold uppercase tracking-widest">Bottlenecks</h2>
      </header>
      {insights.length === 0 ? (
        <p className="px-4 py-4 text-xs text-muted-foreground">
          No flow bottlenecks detected — work is moving cleanly across phases.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {insights.map((i) => (
            <li
              key={i.id}
              onClick={() => onInsightClick?.(i)}
              className={cn(
                "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-accent/40",
                onInsightClick && "group"
              )}
            >
              <span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", DOT[i.tone])} aria-hidden />
              <span className="text-[11px] text-foreground/85 group-hover:text-foreground">{i.message}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
