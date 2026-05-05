import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PHASE_LABEL, PHASE_ORDER, STATUS_LABEL, computePhaseHealth, phaseHealthClasses } from "@/lib/derived";
import type { Deficiency, Gate, Phase, PhaseType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PhaseProgressProps {
  phasesByType: Record<PhaseType, Phase | undefined>;
  gates: Gate[];
  deficiencies: Deficiency[];
}

export function PhaseProgress({ phasesByType, gates, deficiencies }: PhaseProgressProps) {
  return (
    <div>
      <div className="flex gap-1.5">
        {PHASE_ORDER.map((type) => {
          const phase = phasesByType[type];
          const phaseGates = phase ? gates.filter((g) => g.phaseId === phase.id) : [];
          const phaseDefs = phase ? deficiencies.filter((d) => d.phaseId === phase.id) : [];
          const health = computePhaseHealth(phase, phaseGates, phaseDefs);
          const c = phaseHealthClasses(health.tone);
          return (
            <Tooltip key={type}>
              <TooltipTrigger asChild>
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className={cn("h-full w-full transition-colors", c.dot)} />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <span className="font-medium">{PHASE_LABEL[type]}</span>: {health.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      <div className="flex gap-1.5 mt-1.5">
        {PHASE_ORDER.map((type) => (
          <div key={type} className="flex-1 text-[10px] uppercase tracking-wider text-muted-foreground text-center">
            {PHASE_LABEL[type]}
          </div>
        ))}
      </div>
    </div>
  );
}
