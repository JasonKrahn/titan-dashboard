import { AlertOctagon, Check, Clock, Loader2, MinusCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { PhaseHealth, PhaseHealthTone } from "@/lib/derived";

const TONE: Record<PhaseHealthTone, BadgeTone> = {
  blocked: "danger",
  attention: "warning",
  "in-progress": "info",
  ready: "ready",
  closed: "success",
  "not-started": "neutral",
};

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
  size?: "sm" | "md" | "lg";
}

export function PhaseHealthPill({ health, className, size = "md" }: PhaseHealthPillProps) {
  // Pill caps at "md"; "lg" reuses md sizing with a slight font bump for legacy headers.
  const badgeSize = size === "lg" ? "md" : size;
  const iconClassName = health.tone === "in-progress" ? "motion-safe:animate-spin motion-reduce:animate-none" : undefined;
  return (
    <Badge
      tone={TONE[health.tone]}
      appearance="soft"
      size={badgeSize}
      icon={ICONS[health.tone]}
      iconClassName={iconClassName}
      className={size === "lg" ? `text-sm px-3 py-1.5 ${className ?? ""}` : className}
    >
      {health.label}
    </Badge>
  );
}
