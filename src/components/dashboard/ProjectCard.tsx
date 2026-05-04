import { AlertOctagon, ArrowUpRight, Camera } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";
import { PhaseProgress } from "./PhaseProgress";
import {
  STATUS_LABEL,
  gateStatusTone,
  initials,
  openDeficiencyCount,
  projectPhases,
  projectStatusTone,
  relativeTime,
} from "@/lib/derived";
import type {
  ClientRecord,
  Deficiency,
  Gate,
  Phase,
  Project,
  User,
} from "@/lib/types";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  project: Project;
  client?: ClientRecord;
  pm?: User;
  phases: Phase[];
  gates: Gate[];
  deficiencies: Deficiency[];
  onOpen?: (id: string) => void;
}

const GATE_LABEL = {
  site_check: "Site",
  inspection: "Inspect",
  attic_check: "Attic",
} as const;

function summarizeGates(projectGates: Gate[]) {
  // For each gate type, return the "worst" status to display:
  // priority: blocked > failed > in_progress > ready/passed > not_started
  const order: Gate["status"][] = ["blocked", "failed", "in_progress", "passed", "not_started"];
  const result: { type: Gate["type"]; status: Gate["status"] }[] = [];
  (["site_check", "inspection", "attic_check"] as const).forEach((type) => {
    const matching = projectGates.filter((g) => g.type === type);
    if (!matching.length) {
      result.push({ type, status: "not_started" });
      return;
    }
    const sorted = matching.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
    result.push({ type, status: sorted[0].status });
  });
  return result;
}

export function ProjectCard({
  project,
  client,
  pm,
  phases,
  gates,
  deficiencies,
  onOpen,
}: ProjectCardProps) {
  const phasesByType = projectPhases(project.id, phases);
  const projectGates = gates.filter((g) => g.projectId === project.id);
  const gateSummary = summarizeGates(projectGates);
  const openDefs = openDeficiencyCount(project.id, deficiencies);

  return (
    <Card
      onClick={() => onOpen?.(project.id)}
      className={cn(
        "group bg-gradient-surface border-border p-5 cursor-pointer",
        "transition-all hover:border-primary/40 hover:shadow-glow",
        "animate-fade-in",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono mb-1">
            {project.projectNumber}
          </div>
          <h3 className="font-semibold text-base leading-tight truncate group-hover:text-primary transition-colors">
            {project.name}
          </h3>
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            {client?.name ?? "Unknown client"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <StatusBadge tone={projectStatusTone(project.status)} label={STATUS_LABEL[project.status]} size="sm" />
          <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Phase progress */}
      <div className="mb-4">
        <PhaseProgress phasesByType={phasesByType} />
      </div>

      {/* Gates row */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {gateSummary.map((g) => (
          <StatusBadge
            key={g.type}
            tone={gateStatusTone(g.status)}
            label={`${GATE_LABEL[g.type]} · ${STATUS_LABEL[g.status]}`}
            size="sm"
          />
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border/60">
        <div className="flex items-center gap-3">
          {openDefs > 0 ? (
            <div className="flex items-center gap-1.5 text-status-blocked text-xs font-medium">
              <AlertOctagon className="h-3.5 w-3.5" />
              {openDefs} open
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <Camera className="h-3.5 w-3.5" />
              No issues
            </div>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] text-muted-foreground">{relativeTime(project.updatedAt)}</span>
          {pm ? (
            <div
              className="h-7 w-7 rounded-full bg-primary/15 text-primary text-[11px] font-semibold flex items-center justify-center border border-primary/30"
              title={pm.fullName}
            >
              {initials(pm.fullName)}
            </div>
          ) : (
            <div className="h-7 w-7 rounded-full bg-muted text-muted-foreground text-[11px] flex items-center justify-center" title="Unassigned">
              —
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
