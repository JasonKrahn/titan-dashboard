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
  accent: "bg-status-accent",
};

interface Props {
  insights: BottleneckInsight[];
}

export function BottleneckInsights({ insights }: Props) {
  return (
    <section className="rounded-md border border-border bg-surface-panel shadow-card">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
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
            <li key={i.id} className="flex items-start gap-3 px-4 py-2.5 text-xs">
              <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", DOT[i.tone])} aria-hidden />
              <span className="text-foreground/85">{i.message}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
