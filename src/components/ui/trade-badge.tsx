import { Hammer } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { TradeType } from "@/lib/types";

// Known trades get explicit tones; unknown future trades fall back via hash.
const KNOWN: Record<string, BadgeTone> = {
  insulation: "info",
  drywall: "warning",
  finishing: "success",
};

const FALLBACK_TONES: BadgeTone[] = ["info", "warning", "success", "ready", "accent", "neutral"];

function hashToTone(value: string): BadgeTone {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return FALLBACK_TONES[h % FALLBACK_TONES.length];
}

export function tradeTone(trade: TradeType | string): BadgeTone {
  return KNOWN[trade] ?? hashToTone(String(trade));
}

const TRADE_LABEL: Record<string, string> = {
  insulation: "Insulation",
  drywall: "Drywall",
  finishing: "Finishing",
};

function tradeLabel(trade: TradeType | string) {
  return TRADE_LABEL[trade] ?? String(trade).replace(/\b\w/g, (c) => c.toUpperCase());
}

export function TradeBadge({
  trade,
  size = "sm",
  withIcon = false,
  className,
}: {
  trade: TradeType | string;
  size?: "xs" | "sm" | "md";
  withIcon?: boolean;
  className?: string;
}) {
  return (
    <Badge tone={tradeTone(trade)} appearance="soft" size={size} icon={withIcon ? Hammer : undefined} className={className}>
      {tradeLabel(trade)}
    </Badge>
  );
}
