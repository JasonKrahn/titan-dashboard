import { AlertOctagon, AlertTriangle, MinusCircle } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { Deficiency } from "@/lib/types";

const MAP: Record<Deficiency["severity"], { tone: BadgeTone; icon: any; label: string; appearance: "soft" | "solid" }> = {
  low:      { tone: "neutral", icon: MinusCircle,    label: "Low",      appearance: "soft" },
  medium:   { tone: "warning", icon: AlertTriangle,  label: "Medium",   appearance: "soft" },
  high:     { tone: "danger",  icon: AlertTriangle,  label: "High",     appearance: "soft" },
  critical: { tone: "danger",  icon: AlertOctagon,   label: "Critical", appearance: "solid" },
};

export function SeverityBadge({
  severity,
  size = "sm",
  className,
}: {
  severity: Deficiency["severity"];
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  const m = MAP[severity];
  return (
    <Badge tone={m.tone} appearance={m.appearance} size={size} icon={m.icon} className={className}>
      {m.label}
    </Badge>
  );
}
