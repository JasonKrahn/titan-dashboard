import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PHASE_LABEL, PHASE_ORDER, STATUS_LABEL, phaseStatusTone } from "@/lib/derived";
import type { Phase, PhaseType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PhaseProgressProps {
  phasesByType: Record<PhaseType, Phase | undefined>;
}

const toneBg: Record<string, string> = {
  "not-started": "bg-status-not-started/40",
  "in-progress": "bg-status-in-progress",
  ready: "bg-status-ready",
  blocked: "bg-status-blocked",
  closed: "bg-status-closed",
};

export function PhaseProgress({ phasesByType }: PhaseProgressProps) {
  return (
    <div>
      <div className="flex gap-1.5">
        {PHASE_ORDER.map((type) => {
          const phase = phasesByType[type];
          const tone = phase ? phaseStatusTone(phase.status) : "not-started";
          const label = phase ? STATUS_LABEL[phase.status] : "Not started";
          return (
            <Tooltip key={type}>
              <TooltipTrigger asChild>
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className={cn("h-full w-full transition-colors", toneBg[tone])} />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <span className="font-medium">{PHASE_LABEL[type]}</span>: {label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      <div className="flex gap-1.5 mt-1.5">
        {PHASE_ORDER.map((type) => (
          <div key={type} className="flex-1 text-[10px] uppercase tracking-wider text-muted-foreground text-center">
            {PHASE_LABEL[type].slice(0, 4)}
          </div>
        ))}
      </div>
    </div>
  );
}
