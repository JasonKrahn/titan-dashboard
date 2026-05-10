import { Activity, AlertOctagon, Camera, Clock, ShieldAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BadgeTone } from "@/components/ui/badge";

export type KpiKey = "active" | "blocked" | "failed" | "ready" | "attic";

export interface KpiData {
  key: KpiKey;
  label: string;
  count: number;
  tone: BadgeTone;
  hint?: string;
}

const ICON: Record<KpiKey, LucideIcon> = {
  active: Activity,
  blocked: ShieldAlert,
  failed: AlertOctagon,
  ready: Clock,
  attic: Camera,
};

const TONE_RING: Record<BadgeTone, string> = {
  neutral: "border-status-not-started/30 hover:border-status-not-started/60",
  info: "border-status-in-progress/30 hover:border-status-in-progress/60",
  ready: "border-status-ready/30 hover:border-status-ready/60",
  success: "border-status-closed/30 hover:border-status-closed/60",
  warning: "border-status-attention/40 hover:border-status-attention/70",
  danger: "border-status-blocked/40 hover:border-status-blocked/70",
  accent: "border-status-accent/30 hover:border-status-accent/60",
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

const TONE_STRIPE: Record<BadgeTone, string> = {
  neutral: "bg-status-not-started",
  info: "bg-status-in-progress",
  ready: "bg-status-ready",
  success: "bg-status-closed",
  warning: "bg-status-attention",
  danger: "bg-status-blocked",
  accent: "bg-status-accent",
};

interface KpiStripProps {
  items: KpiData[];
  active?: KpiKey | null;
  onSelect?: (key: KpiKey) => void;
}

export function KpiStrip({ items, active, onSelect }: KpiStripProps) {
  return (
    <div
      role="list"
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
    >
      {items.map((item) => {
        const Icon = ICON[item.key];
        const isActive = active === item.key;
        return (
          <button
            key={item.key}
            type="button"
            role="listitem"
            onClick={() => onSelect?.(item.key)}
            className={cn(
              "group relative flex items-center gap-3 overflow-hidden rounded-md border bg-surface-panel px-3 py-2.5 text-left transition-colors",
              TONE_RING[item.tone],
              isActive && "ring-2 ring-ring",
            )}
            aria-pressed={isActive}
          >
            <span className={cn("absolute inset-y-0 left-0 w-1", TONE_STRIPE[item.tone])} aria-hidden />
            <Icon className={cn("h-4 w-4 shrink-0", TONE_TEXT[item.tone])} aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {item.label}
              </div>
              <div className="flex items-baseline gap-2">
                <span className={cn("text-2xl font-bold tabular-nums leading-none", TONE_TEXT[item.tone])}>
                  {item.count}
                </span>
                {item.hint && (
                  <span className="text-[10px] text-muted-foreground truncate">{item.hint}</span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
