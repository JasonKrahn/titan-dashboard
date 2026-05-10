import { AlertOctagon, Archive, ArrowUpRight, Camera, MapPin, Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { IconWell } from "@/components/ui/icon-well";
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
  onArchive?: (id: string, name: string) => void;
  onEdit?: (id: string) => void;
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
  onArchive,
  onEdit,
}: ProjectCardProps) {
  const phasesByType = projectPhases(project.id, phases);
  const projectGates = gates.filter((g) => g.projectId === project.id);
  const gateSummary = summarizeGates(projectGates);
  const openDefs = openDeficiencyCount(project.id, deficiencies);

  return (
    <Card
      onClick={() => onOpen?.(project.id)}
      surface="interactive"
      className={cn("group cursor-pointer p-4 sm:p-5", "animate-fade-in")}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3 sm:mb-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2 font-mono text-meta text-muted-foreground">
            {project.projectNumber}
          </div>
          <h3 className="text-base font-semibold leading-tight transition-colors group-hover:text-primary md:truncate">
            {project.name}
          </h3>
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            {client?.name ?? "Unknown client"}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground/85">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{project.siteAddress}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <StatusBadge tone={projectStatusTone(project.status)} label={STATUS_LABEL[project.status]} size="sm" />
          {project.status !== "completed" && project.status !== "archived" && onEdit && (
            <button
              type="button"
              title="Edit project"
              className="rounded-md p-1 text-muted-foreground opacity-100 transition-colors hover:bg-muted hover:text-foreground md:opacity-0 md:group-hover:opacity-100"
              onClick={(e) => { e.stopPropagation(); onEdit(project.id); }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          <ArrowUpRight className="hidden h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 md:block" />
        </div>
      </div>

      {/* Phase progress */}
      <div className="mb-3 sm:mb-4">
        <PhaseProgress phasesByType={phasesByType} gates={projectGates} deficiencies={deficiencies} />
      </div>

      {/* Gates row */}
      <div className="mb-3 flex flex-wrap gap-1.5 sm:mb-4">
        {gateSummary.filter((g) => g.type !== "site_check" && g.type !== "inspection").map((g) => (
          <StatusBadge
            key={g.type}
            tone={gateStatusTone(g.status)}
            label={`${GATE_LABEL[g.type]} · ${STATUS_LABEL[g.status]}`}
            size="sm"
          />
        ))}
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
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
          {project.status === "completed" && onArchive && (
            <button
              type="button"
              title="Archive project"
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={(e) => { e.stopPropagation(); onArchive(project.id, project.name); }}
            >
              <Archive className="h-3.5 w-3.5" />
            </button>
          )}
          <span className="text-[11px] text-muted-foreground">Updated {relativeTime(project.updatedAt)}</span>
          {pm ? (
            <IconWell
              tone="primary"
              size="sm"
              shape="pill"
              className="text-meta font-semibold"
              title={pm.fullName}
            >
              {initials(pm.fullName)}
            </IconWell>
          ) : (
            <IconWell tone="muted" size="sm" shape="pill" className="text-meta" title="Unassigned">
              —
            </IconWell>
          )}
        </div>
      </div>
    </Card>
  );
}
