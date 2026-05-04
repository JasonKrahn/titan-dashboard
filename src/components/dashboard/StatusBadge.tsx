import { cn } from "@/lib/utils";
import type { StatusTone } from "@/lib/derived";

interface StatusBadgeProps {
  tone: StatusTone;
  label: string;
  className?: string;
  size?: "sm" | "md";
  dot?: boolean;
}

const toneClasses: Record<StatusTone, string> = {
  "not-started": "bg-status-not-started/15 text-status-not-started border-status-not-started/30",
  "in-progress": "bg-status-in-progress/15 text-status-in-progress border-status-in-progress/30",
  ready: "bg-status-ready/15 text-status-ready border-status-ready/40",
  blocked: "bg-status-blocked/15 text-status-blocked border-status-blocked/40",
  closed: "bg-status-closed/15 text-status-closed border-status-closed/40",
};

const dotClasses: Record<StatusTone, string> = {
  "not-started": "bg-status-not-started",
  "in-progress": "bg-status-in-progress",
  ready: "bg-status-ready",
  blocked: "bg-status-blocked",
  closed: "bg-status-closed",
};

export function StatusBadge({ tone, label, className, size = "md", dot = true }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        toneClasses[tone],
        className,
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dotClasses[tone])} />}
      {label}
    </span>
  );
}
