import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type BadgeTone =
  | "neutral"
  | "info"
  | "ready"
  | "success"
  | "warning"
  | "danger"
  | "accent";

export type BadgeAppearance = "soft" | "solid" | "outline";

// Token map per tone (semantic only; no raw palette colors).
const TONE_SOFT: Record<BadgeTone, string> = {
  neutral: "bg-status-not-started/15 text-status-not-started border-status-not-started/30",
  info: "bg-status-in-progress/15 text-status-in-progress border-status-in-progress/30",
  ready: "bg-status-ready/15 text-status-ready border-status-ready/40",
  success: "bg-status-closed/15 text-status-closed border-status-closed/40",
  warning: "bg-status-attention/15 text-status-attention border-status-attention/40",
  danger: "bg-status-blocked/15 text-status-blocked border-status-blocked/40",
  accent: "bg-status-accent/15 text-status-accent border-status-accent/40",
};

const TONE_SOLID: Record<BadgeTone, string> = {
  neutral: "bg-status-not-started text-status-not-started-foreground border-transparent",
  info: "bg-status-in-progress text-status-in-progress-foreground border-transparent",
  ready: "bg-status-ready text-status-ready-foreground border-transparent",
  success: "bg-status-closed text-status-closed-foreground border-transparent",
  warning: "bg-status-attention text-status-attention-foreground border-transparent",
  danger: "bg-status-blocked text-status-blocked-foreground border-transparent",
  accent: "bg-status-accent text-status-accent-foreground border-transparent",
};

const TONE_OUTLINE: Record<BadgeTone, string> = {
  neutral: "border-status-not-started/50 text-status-not-started",
  info: "border-status-in-progress/50 text-status-in-progress",
  ready: "border-status-ready/50 text-status-ready",
  success: "border-status-closed/50 text-status-closed",
  warning: "border-status-attention/60 text-status-attention",
  danger: "border-status-blocked/60 text-status-blocked",
  accent: "border-status-accent/60 text-status-accent",
};

const TONE_DOT: Record<BadgeTone, string> = {
  neutral: "bg-status-not-started",
  info: "bg-status-in-progress",
  ready: "bg-status-ready",
  success: "bg-status-closed",
  warning: "bg-status-attention",
  danger: "bg-status-blocked",
  accent: "bg-status-accent",
};

function appearanceClass(tone: BadgeTone, appearance: BadgeAppearance): string {
  if (appearance === "solid") return TONE_SOLID[tone];
  if (appearance === "outline") return TONE_OUTLINE[tone];
  return TONE_SOFT[tone];
}

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border font-medium whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      size: {
        xs: "px-1.5 py-0 text-[10px] leading-4",
        sm: "px-2 py-0.5 text-[11px] leading-4",
        md: "px-2.5 py-1 text-xs leading-4",
      },
    },
    defaultVariants: { size: "md" },
  },
);

// Backward-compat: legacy shadcn variants → tone/appearance
const LEGACY_VARIANT: Record<string, { tone: BadgeTone; appearance: BadgeAppearance }> = {
  default: { tone: "info", appearance: "solid" },
  secondary: { tone: "neutral", appearance: "soft" },
  destructive: { tone: "danger", appearance: "solid" },
  outline: { tone: "neutral", appearance: "outline" },
};

export interface BadgeProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children">,
    VariantProps<typeof badgeVariants> {
  tone?: BadgeTone;
  appearance?: BadgeAppearance;
  /** Legacy shadcn variant — prefer `tone`/`appearance`. */
  variant?: "default" | "secondary" | "destructive" | "outline";
  icon?: LucideIcon;
  dot?: boolean;
  children?: React.ReactNode;
}

function Badge({
  className,
  tone,
  appearance,
  variant,
  size,
  icon: Icon,
  dot,
  children,
  ...props
}: BadgeProps) {
  const legacy = variant ? LEGACY_VARIANT[variant] : undefined;
  const finalTone = tone ?? legacy?.tone ?? "neutral";
  const finalAppearance = appearance ?? legacy?.appearance ?? "soft";
  const iconSize = size === "md" ? "h-3.5 w-3.5" : "h-3 w-3";
  return (
    <div className={cn(badgeVariants({ size }), appearanceClass(finalTone, finalAppearance), className)} {...props}>
      {Icon ? (
        <Icon className={cn(iconSize, "shrink-0")} aria-hidden="true" />
      ) : dot ? (
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", TONE_DOT[finalTone])} aria-hidden="true" />
      ) : null}
      {children}
    </div>
  );
}

export { Badge, badgeVariants, TONE_DOT };
