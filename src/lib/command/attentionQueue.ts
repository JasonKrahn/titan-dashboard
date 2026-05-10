// Pure derivation of the Admin Attention Queue.
import type {
  ClientRecord,
  Deficiency,
  Gate,
  Phase,
  PhaseType,
  PhotoEvidence,
  Project,
  User,
} from "@/lib/types";
import { PHASE_LABEL } from "@/lib/derived";

export type QueueSeverity = "critical" | "warning" | "info";
export type QueueCategory = "critical" | "warning" | "ready" | "completed";

export type QueueItemType =
  | "critical_blocker"
  | "failed_inspection"
  | "aging_ready_inspection"
  | "missing_attic_evidence"
  | "past_scheduled_end"
  | "awaiting_archive"
  | "stale_project";

export interface QueueItem {
  id: string;
  type: QueueItemType;
  severity: QueueSeverity;
  category: QueueCategory;
  title: string;
  reason: string;
  nextAction: string;
  ageDays: number;
  projectId: string;
  projectName: string;
  clientName: string;
  pmName: string;
  phaseLabel: string;
}

const DAY = 1000 * 60 * 60 * 24;

function daysSince(iso?: string | null): number {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / DAY));
}

function daysUntil(iso?: string | null): number {
  if (!iso) return 0;
  return Math.floor((new Date(iso).getTime() - Date.now()) / DAY);
}

function activePhase(projectPhases: Phase[]): Phase | undefined {
  return (
    projectPhases.find((p) => p.status === "blocked") ||
    projectPhases.find((p) => p.status === "ready_for_inspection") ||
    projectPhases.find((p) => p.status === "in_progress") ||
    projectPhases[0]
  );
}

function phaseLabelOf(p: Phase | undefined): string {
  return p ? PHASE_LABEL[p.type as PhaseType] : "—";
}

const SEVERITY_RANK: Record<QueueSeverity, number> = { critical: 0, warning: 1, info: 2 };

export interface BuildAttentionQueueArgs {
  projects: Project[];
  phases: Phase[];
  gates: Gate[];
  deficiencies: Deficiency[];
  photos: PhotoEvidence[];
  users: User[];
  clients: ClientRecord[];
}

export function buildAttentionQueue(args: BuildAttentionQueueArgs): QueueItem[] {
  const { projects, phases, gates, deficiencies, photos, users, clients } = args;

  const userById = new Map(users.map((u) => [u.id, u]));
  const clientById = new Map(clients.map((c) => [c.id, c]));
  const phasesByProject = new Map<string, Phase[]>();
  phases.forEach((p) => {
    const list = phasesByProject.get(p.projectId) ?? [];
    list.push(p);
    phasesByProject.set(p.projectId, list);
  });

  const items: QueueItem[] = [];

  for (const project of projects) {
    const client = clientById.get(project.clientId);
    const pm = project.assignedProjectManagerId ? userById.get(project.assignedProjectManagerId) : undefined;
    const projectPhases = phasesByProject.get(project.id) ?? [];
    const projectGates = gates.filter((g) => g.projectId === project.id);
    const projectDefs = deficiencies.filter((d) => d.projectId === project.id);
    const ctx = {
      projectId: project.id,
      projectName: project.name,
      clientName: client?.name ?? "—",
      pmName: pm?.fullName ?? "Unassigned",
    };

    // Critical blockers — phase or gate blocked
    const blockedPhase = projectPhases.find((p) => p.status === "blocked");
    const blockedGate = projectGates.find((g) => g.status === "blocked");
    if (blockedPhase || blockedGate) {
      const phase = blockedPhase ?? activePhase(projectPhases);
      const ageRef = blockedPhase?.updatedAt ?? blockedGate?.updatedAt ?? project.updatedAt;
      items.push({
        ...ctx,
        id: `${project.id}-blocker`,
        type: "critical_blocker",
        severity: "critical",
        category: "critical",
        title: blockedGate ? "Site/Gate blocked" : "Phase blocked",
        reason: blockedGate ? "Site access or gate blocked" : `${phaseLabelOf(blockedPhase)} phase is blocked`,
        nextAction: "Review block reason and clear with site lead",
        ageDays: daysSince(ageRef),
        phaseLabel: phaseLabelOf(phase),
      });
    }

    // Failed inspections w/ open severe deficiency
    const failedInspections = projectGates.filter(
      (g) => g.type === "inspection" && g.status === "failed",
    );
    for (const gate of failedInspections) {
      const phase = projectPhases.find((p) => p.id === gate.phaseId) ?? activePhase(projectPhases);
      const phaseDefs = projectDefs.filter(
        (d) => d.phaseId === gate.phaseId && (d.status === "open" || d.status === "in_progress"),
      );
      const severe = phaseDefs.find((d) => d.severity === "high" || d.severity === "critical");
      const headline = severe?.title ?? phaseDefs[0]?.title ?? "Inspection failed";
      items.push({
        ...ctx,
        id: `${project.id}-failed-${gate.id}`,
        type: "failed_inspection",
        severity: severe ? "critical" : "warning",
        category: severe ? "critical" : "warning",
        title: "Failed inspection",
        reason: headline,
        nextAction: "Review deficiency and schedule re-inspection",
        ageDays: daysSince(gate.completedAt ?? gate.updatedAt),
        phaseLabel: phaseLabelOf(phase),
      });
    }

    // Aging ready_for_inspection > 3d
    const readyPhases = projectPhases.filter((p) => p.status === "ready_for_inspection");
    for (const phase of readyPhases) {
      const age = daysSince(phase.updatedAt);
      if (age >= 3) {
        items.push({
          ...ctx,
          id: `${project.id}-ready-${phase.id}`,
          type: "aging_ready_inspection",
          severity: age >= 7 ? "warning" : "info",
          category: age >= 7 ? "warning" : "ready",
          title: "Inspection waiting",
          reason: `${phaseLabelOf(phase)} ready for inspection ${age}d`,
          nextAction: "Assign inspector and confirm date",
          ageDays: age,
          phaseLabel: phaseLabelOf(phase),
        });
      } else {
        items.push({
          ...ctx,
          id: `${project.id}-ready-${phase.id}`,
          type: "aging_ready_inspection",
          severity: "info",
          category: "ready",
          title: "Ready for inspection",
          reason: `${phaseLabelOf(phase)} marked ready`,
          nextAction: "Schedule inspection visit",
          ageDays: age,
          phaseLabel: phaseLabelOf(phase),
        });
      }
    }

    // Missing attic evidence (active, no confirmed attic_check photo)
    if (project.status === "active" && project.atticCheckStatus !== "passed") {
      const hasConfirmed = photos.some(
        (ph) => ph.projectId === project.id && ph.purpose === "attic_check" && ph.status === "confirmed",
      );
      if (!hasConfirmed) {
        items.push({
          ...ctx,
          id: `${project.id}-attic`,
          type: "missing_attic_evidence",
          severity: "warning",
          category: "warning",
          title: "Attic evidence missing",
          reason: "No confirmed attic check photo on file",
          nextAction: "Upload attic check photo evidence",
          ageDays: daysSince(project.updatedAt),
          phaseLabel: phaseLabelOf(activePhase(projectPhases)),
        });
      }
    }

    // Past scheduled end
    if (
      project.scheduledEnd &&
      project.status !== "completed" &&
      project.status !== "archived" &&
      daysUntil(project.scheduledEnd) < 0
    ) {
      const overdue = -daysUntil(project.scheduledEnd);
      items.push({
        ...ctx,
        id: `${project.id}-overdue`,
        type: "past_scheduled_end",
        severity: overdue >= 7 ? "critical" : "warning",
        category: overdue >= 7 ? "critical" : "warning",
        title: "Past scheduled end",
        reason: `Scheduled end ${overdue}d ago, still ${project.status}`,
        nextAction: "Reforecast end date or close out remaining work",
        ageDays: overdue,
        phaseLabel: phaseLabelOf(activePhase(projectPhases)),
      });
    }

    // Awaiting archive
    if (project.status === "completed" && daysSince(project.completedAt ?? project.updatedAt) >= 7) {
      items.push({
        ...ctx,
        id: `${project.id}-archive`,
        type: "awaiting_archive",
        severity: "info",
        category: "completed",
        title: "Ready to archive",
        reason: `Completed ${daysSince(project.completedAt ?? project.updatedAt)}d ago`,
        nextAction: "Archive project to clear the active board",
        ageDays: daysSince(project.completedAt ?? project.updatedAt),
        phaseLabel: phaseLabelOf(activePhase(projectPhases)),
      });
    }

    // Stale project
    if (project.status === "active" && daysSince(project.updatedAt) >= 14) {
      items.push({
        ...ctx,
        id: `${project.id}-stale`,
        type: "stale_project",
        severity: "warning",
        category: "warning",
        title: "Stale project",
        reason: `No updates in ${daysSince(project.updatedAt)}d`,
        nextAction: "Check in with PM for status update",
        ageDays: daysSince(project.updatedAt),
        phaseLabel: phaseLabelOf(activePhase(projectPhases)),
      });
    }
  }

  items.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.ageDays - a.ageDays);
  return items;
}

export const QUEUE_FILTERS: { value: QueueCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "critical", label: "Critical" },
  { value: "warning", label: "Warning" },
  { value: "ready", label: "Ready" },
  { value: "completed", label: "Completed" },
];
