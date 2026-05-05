import { AlertOctagon, Check, Clock, Loader2, MinusCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { phaseHealthClasses, type PhaseHealth, type PhaseHealthTone } from "@/lib/derived";

const ICONS: Record<PhaseHealthTone, LucideIcon> = {
  blocked: AlertOctagon,
  attention: Clock,
  "in-progress": Loader2,
  ready: Clock,
  closed: Check,
  "not-started": MinusCircle,
};

interface PhaseHealthPillProps {
  health: PhaseHealth;
  className?: string;
  size?: "md" | "lg";
}

export function PhaseHealthPill({ health, className, size = "md" }: PhaseHealthPillProps) {
  const c = phaseHealthClasses(health.tone);
  const Icon = ICONS[health.tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border font-semibold",
        size === "lg" ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs",
        c.bg,
        c.text,
        c.border,
        className,
      )}
    >
      <Icon className={cn(size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5", health.tone === "in-progress" && "animate-spin")} />
      {health.label}
    </span>
  );
}
