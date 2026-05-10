import { Check, Clock, Loader2, MinusCircle, ShieldAlert, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { StatusTone } from "@/lib/derived";

const STATUS_TONE: Record<StatusTone, BadgeTone> = {
  "not-started": "neutral",
  "in-progress": "info",
  ready: "ready",
  blocked: "danger",
  closed: "success",
};

const STATUS_ICON: Record<StatusTone, LucideIcon> = {
  "not-started": MinusCircle,
  "in-progress": Loader2,
  ready: Clock,
  blocked: ShieldAlert,
  closed: Check,
};

export function statusToTone(tone: StatusTone): BadgeTone {
  return STATUS_TONE[tone];
}

interface StatusBadgeProps {
  tone: StatusTone;
  label: string;
  className?: string;
  size?: "xs" | "sm" | "md";
  /** Show a leading dot instead of the default icon. */
  dot?: boolean;
  withIcon?: boolean;
}

export function StatusBadge({ tone, label, className, size = "md", dot, withIcon = true }: StatusBadgeProps) {
  const Icon = withIcon && !dot ? STATUS_ICON[tone] : undefined;
  const iconClassName = tone === "in-progress" ? "motion-safe:animate-spin motion-reduce:animate-none" : undefined;
  return (
    <Badge
      tone={STATUS_TONE[tone]}
      appearance="soft"
      size={size}
      icon={Icon}
      iconClassName={iconClassName}
      dot={!Icon && dot !== false}
      className={className}
    >
      {label}
    </Badge>
  );
}

// Re-export for legacy import sites that referenced ShieldCheck via this file.
export { ShieldCheck };
