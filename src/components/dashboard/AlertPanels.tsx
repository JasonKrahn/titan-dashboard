import { ArrowUpRight, Archive, ClipboardCheck, CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { IconWell } from "@/components/ui/icon-well";
import { Button } from "@/components/ui/button";
import type { Gate, Phase, Project } from "@/lib/types";
import { GATE_LABEL } from "@/lib/derived";

interface DueInspectionsPanelProps {
  projects: Project[];
  phases: Phase[];
  gates: Gate[];
  onOpen?: (projectId: string) => void;
  onPass?: (gateId: string, phaseId: string, projectId: string, phaseLabel: string) => void;
  onFail?: (gateId: string, phaseId: string, projectId: string, phaseLabel: string) => void;
}

export function DueInspectionsPanel({ projects, phases, gates, onOpen, onPass, onFail }: DueInspectionsPanelProps) {
  const items = phases
    .filter((p) => p.status === "ready_for_inspection")
    .map((p) => ({ phase: p, project: projects.find((pr) => pr.id === p.projectId) }))
    .filter((x) => x.project);

  if (!items.length) return null;

  return (
    <Card surface="panel" className="border-status-ready/35 p-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
        <IconWell tone="ready" size="md" shape="panel" className="border-transparent">
          <ClipboardCheck className="h-4 w-4 text-status-ready" />
        </IconWell>
        <div>
          <h3 className="font-semibold text-sm">Due inspections</h3>
          <p className="text-xs text-muted-foreground">{items.length} phase{items.length === 1 ? "" : "s"} ready</p>
        </div>
        </div>
        <span className="rounded-full border border-status-ready/25 bg-status-ready/10 px-2.5 py-1 text-[11px] font-semibold uppercase text-status-ready">
          Dispatch
        </span>
      </div>
      <ul className="divide-y divide-border/60">
        {items.slice(0, 5).map(({ phase, project }) => {
          const inspectionGate = gates.find((g) => g.phaseId === phase.id && g.type === "inspection");
          if (!inspectionGate) return null;
          const phaseLabel = GATE_LABEL[phase.type] ?? phase.type;
          return (
            <li key={phase.id}>
              <div className="group flex items-center justify-between gap-3 py-2.5">
                <button
                  onClick={() => project && onOpen?.(project.id)}
                  className="min-w-0 flex-1 text-left rounded-md hover:bg-accent/40 transition-colors"
                >
                  <p className="text-sm font-medium truncate">{project!.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{phase.type} phase</p>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  {onPass && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPass(inspectionGate.id, phase.id, project!.id, phaseLabel);
                      }}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Pass
                    </Button>
                  )}
                  {onFail && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFail(inspectionGate.id, phase.id, project!.id, phaseLabel);
                      }}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      Fail
                    </Button>
                  )}
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-status-ready opacity-70 group-hover:opacity-100" />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

interface ArchivePanelProps {
  projects: Project[];
  onOpen?: (projectId: string) => void;
  onArchive?: (projectId: string, projectName: string) => void;
}

export function ArchivePanel({ projects, onOpen, onArchive }: ArchivePanelProps) {
  const items = projects.filter((p) => p.status === "completed");
  if (!items.length) return null;

  return (
    <Card surface="panel" className="border-status-success/35 p-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
        <IconWell tone="success" size="md" shape="panel" className="border-transparent">
          <Archive className="h-4 w-4 text-status-success" />
        </IconWell>
        <div>
          <h3 className="font-semibold text-sm">Ready to archive</h3>
          <p className="text-xs text-muted-foreground">{items.length} project{items.length === 1 ? "" : "s"} ready</p>
        </div>
        </div>
        <span className="rounded-full border border-status-success/25 bg-status-success/10 px-2.5 py-1 text-[11px] font-semibold uppercase text-status-success">
          Complete
        </span>
      </div>
      <ul className="divide-y divide-border/60">
        {items.slice(0, 5).map((p) => (
          <li key={p.id}>
            <div className="group flex items-center justify-between gap-3 py-2.5 rounded-md hover:bg-accent/40 transition-colors">
              <button
                onClick={() => onOpen?.(p.id)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="text-sm font-medium truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{p.projectNumber}</p>
              </button>
              {onArchive && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  title="Archive project"
                  onClick={(e) => { e.stopPropagation(); onArchive(p.id, p.name); }}
                >
                  <Archive className="h-3.5 w-3.5 mr-1" />
                  Archive
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
