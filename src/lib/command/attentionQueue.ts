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
export type QueueFilter = "all" | QueueCategory | QueueItemType | "date_range" | "client" | "user";

export interface QueueFilters {
  dateRange?: {
    start?: string;
    end?: string;
  };
  client?: string;
  user?: string;
}

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
  secondaryFlags?: QueueFlag[];
  resolved?: boolean;
}

export interface QueueFlag {
  type: QueueItemType;
  severity: QueueSeverity;
  title: string;
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

const TYPE_RANK: Record<QueueItemType, number> = {
  critical_blocker: 0,
  failed_inspection: 1,
  past_scheduled_end: 2,
  missing_attic_evidence: 3,
  stale_project: 4,
  aging_ready_inspection: 5,
  awaiting_archive: 6,
};

const SECONDARY_FLAG_RANK: Record<QueueItemType, number> = {
  critical_blocker: 0,
  failed_inspection: 1,
  missing_attic_evidence: 2,
  past_scheduled_end: 3,
  stale_project: 4,
  aging_ready_inspection: 5,
  awaiting_archive: 6,
};

export const QUEUE_TYPE_LABEL: Record<QueueItemType, string> = {
  critical_blocker: "Blocked",
  failed_inspection: "Failed inspection",
  aging_ready_inspection: "Inspection ready",
  missing_attic_evidence: "Attic missing",
  past_scheduled_end: "Past target",
  awaiting_archive: "Archive ready",
  stale_project: "Stale",
};

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
    const failedInspections = projectGates.filter(
      (g) => g.type === "inspection" && g.status === "failed",
    );
    const failedInspectionPhaseIds = new Set(failedInspections.map((g) => g.phaseId).filter(Boolean));
    const blockedPhase = projectPhases.find(
      (p) => p.status === "blocked" && !failedInspectionPhaseIds.has(p.id),
    );
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
          reason: `${phaseLabelOf(phase)} ready for inspection ${age}d, past 3d target`,
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
          reason: `${phaseLabelOf(phase)} marked ready, within 3d target`,
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
        reason: `${overdue}d past scheduled end, still ${project.status}`,
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
        reason: `Completed ${daysSince(project.completedAt ?? project.updatedAt)}d ago, past 7d archive target`,
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
        reason: `No updates in ${daysSince(project.updatedAt)}d, past 14d stale threshold`,
        nextAction: "Check in with PM for status update",
        ageDays: daysSince(project.updatedAt),
        phaseLabel: phaseLabelOf(activePhase(projectPhases)),
      });
    }
  }

  items.sort(compareQueueItems);
  return items;
}

function compareQueueItems(a: QueueItem, b: QueueItem) {
  return (
    SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
    TYPE_RANK[a.type] - TYPE_RANK[b.type] ||
    b.ageDays - a.ageDays
  );
}

function matchesFilter(item: QueueItem, filter: QueueFilter) {
  return filter === "all" || item.category === filter || item.type === filter;
}

export function buildVisibleQueue(items: QueueItem[], filter: QueueFilter, filters?: QueueFilters): QueueItem[] {
  let filtered = items.filter((item) => !item.resolved);
  
  // Apply basic filter
  if (filter !== "all" && filter !== "date_range" && filter !== "client" && filter !== "user") {
    filtered = filtered.filter((item) => item.category === filter || item.type === filter);
  }
  
  // Apply advanced filters
  if (filters) {
    if (filters.dateRange?.start || filters.dateRange?.end) {
      filtered = filtered.filter((item) => {
        const itemDate = new Date(Date.now() - item.ageDays * 24 * 60 * 60 * 1000);
        const start = filters.dateRange?.start ? new Date(filters.dateRange.start) : null;
        const end = filters.dateRange?.end ? new Date(filters.dateRange.end) : null;
        
        if (start && itemDate < start) return false;
        if (end && itemDate > end) return false;
        return true;
      });
    }
    
    if (filters.client) {
      filtered = filtered.filter((item) => filters.client === item.clientName);
    }
    
    if (filters.user) {
      filtered = filtered.filter((item) => filters.user === item.pmName);
    }
  }
  
  if (filter !== "all") return filtered;

  const byProject = new Map<string, QueueItem[]>();
  for (const item of filtered) {
    const group = byProject.get(item.projectId) ?? [];
    group.push(item);
    byProject.set(item.projectId, group);
  }

  const grouped = Array.from(byProject.values()).map((group) => {
    const [primary] = [...group].sort(compareQueueItems);
    const secondary = group
      .filter((item) => item.id !== primary.id)
      .sort((a, b) => SECONDARY_FLAG_RANK[a.type] - SECONDARY_FLAG_RANK[b.type]);
    return {
      ...primary,
      id: `${primary.projectId}-queue-summary`,
      secondaryFlags: secondary.map((item) => ({
        type: item.type,
        severity: item.severity,
        title: QUEUE_TYPE_LABEL[item.type],
      })),
    };
  });

  return grouped.sort(compareQueueItems);
}

export function getQueueCounts(items: QueueItem[]): Record<QueueFilter, number> {
  const counts = {
    all: buildVisibleQueue(items, "all").length,
    critical: 0,
    warning: 0,
    ready: 0,
    completed: 0,
    critical_blocker: 0,
    failed_inspection: 0,
    aging_ready_inspection: 0,
    missing_attic_evidence: 0,
    past_scheduled_end: 0,
    awaiting_archive: 0,
    stale_project: 0,
    date_range: 0,
    client: 0,
    user: 0,
  } satisfies Record<QueueFilter, number>;

  for (const item of items) {
    counts[item.category] += 1;
    counts[item.type] += 1;
  }

  return counts;
}

export function markItemResolved(items: QueueItem[], itemId: string): QueueItem[] {
  return items.map((item) =>
    item.id === itemId ? { ...item, resolved: true } : item
  );
}

export const QUEUE_FILTERS: { value: QueueCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "critical", label: "Critical" },
  { value: "warning", label: "Warning" },
  { value: "ready", label: "Ready" },
  { value: "completed", label: "Completed" },
];
