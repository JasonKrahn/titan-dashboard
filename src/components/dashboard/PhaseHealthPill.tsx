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
  size?: "sm" | "md";
}

export function PhaseHealthPill({ health, className, size = "md" }: PhaseHealthPillProps) {
  return (
    <Badge tone={TONE[health.tone]} appearance="soft" size={size} icon={ICONS[health.tone]} className={className}>
      {health.label}
    </Badge>
  );
}
