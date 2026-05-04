import { Camera, ClipboardCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { Phase, Project } from "@/lib/types";

interface DueInspectionsPanelProps {
  projects: Project[];
  phases: Phase[];
  onOpen?: (projectId: string) => void;
}

export function DueInspectionsPanel({ projects, phases, onOpen }: DueInspectionsPanelProps) {
  const items = phases
    .filter((p) => p.status === "ready_for_inspection")
    .map((p) => ({ phase: p, project: projects.find((pr) => pr.id === p.projectId) }))
    .filter((x) => x.project);

  if (!items.length) return null;

  return (
    <Card className="bg-gradient-surface border-status-ready/30 p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg bg-status-ready/15 flex items-center justify-center">
          <ClipboardCheck className="h-4 w-4 text-status-ready" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Due inspections</h3>
          <p className="text-xs text-muted-foreground">{items.length} phase{items.length === 1 ? "" : "s"} ready</p>
        </div>
      </div>
      <ul className="space-y-2">
        {items.slice(0, 5).map(({ phase, project }) => (
          <li key={phase.id}>
            <button
              onClick={() => project && onOpen?.(project.id)}
              className="w-full text-left flex items-center justify-between gap-3 p-2 -mx-2 rounded-md hover:bg-accent/60 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{project!.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{phase.type} phase</p>
              </div>
              <span className="text-[11px] text-status-ready font-semibold uppercase tracking-wider shrink-0">
                Ready
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

interface AtticAlertsPanelProps {
  projects: Project[];
  missingProjectIds: Set<string>;
  onOpen?: (projectId: string) => void;
}

export function AtticAlertsPanel({ projects, missingProjectIds, onOpen }: AtticAlertsPanelProps) {
  const items = projects.filter((p) => missingProjectIds.has(p.id));
  if (!items.length) return null;

  return (
    <Card className="bg-gradient-surface border-status-blocked/30 p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg bg-status-blocked/15 flex items-center justify-center">
          <Camera className="h-4 w-4 text-status-blocked" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Attic check required</h3>
          <p className="text-xs text-muted-foreground">{items.length} project{items.length === 1 ? "" : "s"} missing photo evidence</p>
        </div>
      </div>
      <ul className="space-y-2">
        {items.slice(0, 5).map((p) => (
          <li key={p.id}>
            <button
              onClick={() => onOpen?.(p.id)}
              className="w-full text-left flex items-center justify-between gap-3 p-2 -mx-2 rounded-md hover:bg-accent/60 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{p.projectNumber}</p>
              </div>
              <span className="text-[11px] text-status-blocked font-semibold uppercase tracking-wider shrink-0">
                Action
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
