import * as React from "react";
import { cn } from "@/lib/utils";
import type { BadgeTone } from "@/components/ui/badge";

const TONE_BG: Record<BadgeTone, string> = {
  neutral: "bg-status-not-started/10 border-status-not-started/30 text-status-not-started",
  info: "bg-status-in-progress/10 border-status-in-progress/30 text-status-in-progress",
  ready: "bg-status-ready/10 border-status-ready/30 text-status-ready",
  success: "bg-status-closed/10 border-status-closed/30 text-status-closed",
  warning: "bg-status-attention/10 border-status-attention/30 text-status-attention",
  danger: "bg-status-blocked/10 border-status-blocked/30 text-status-blocked",
  accent: "bg-status-accent/10 border-status-accent/30 text-status-accent",
};

export interface KpiChipProps {
  label: string;
  value: string;
  tone?: BadgeTone;
  icon?: React.ReactNode;
  variant?: "pill" | "card";
  className?: string;
}

export function KpiChip({ label, value, tone = "neutral", icon, variant = "pill", className }: KpiChipProps) {
  if (variant === "card") {
    return (
      <div className={cn("flex items-center gap-3 rounded-lg border px-3 py-2", TONE_BG[tone], className)}>
        {icon && <span aria-hidden="true">{icon}</span>}
        <div className="leading-tight">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
          <div className="text-sm font-semibold">{value}</div>
        </div>
      </div>
    );
  }
  return (
    <div className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs", TONE_BG[tone], className)}>
      {icon && <span aria-hidden="true">{icon}</span>}
      <span className="font-semibold uppercase tracking-wide opacity-70">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
