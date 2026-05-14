import type { BadgeTone } from "@/components/ui/badge";
import type { Project } from "@/lib/types";
import {
  buildVisibleQueue,
  QUEUE_TYPE_LABEL,
  type QueueFilter,
  type QueueItem,
  type QueueItemType,
} from "./attentionQueue";

export interface ExecutiveMetric {
  id: "portfolio" | "critical" | "aging" | "inspection";
  label: string;
  value: number;
  denominator?: number;
  detail: string;
  tone: BadgeTone;
  filter?: QueueFilter;
}

export interface RiskConcentration {
  label: string;
  riskProjects: number;
  criticalProjects: number;
  detail: string;
  tone: BadgeTone;
}

export interface ExecutiveFocusItem {
  label: string;
  value: string;
  detail: string;
  tone: BadgeTone;
  filter?: QueueFilter;
  projectId?: string;
}

export interface ExecutiveSummary {
  activeProjects: number;
  groupedRiskProjects: number;
  totalFlags: number;
  activeFlags: number;
  criticalProjects: number;
  overTargetFlags: number;
  oldestFlag?: QueueItem;
  metrics: ExecutiveMetric[];
  leadershipFocus: ExecutiveFocusItem[];
  concentrations: {
    pms: RiskConcentration[];
    clients: RiskConcentration[];
    phases: RiskConcentration[];
  };
}

const CRITICAL_EXPOSURE_TYPES = new Set<QueueItemType>([
  "critical_blocker",
  "failed_inspection",
  "past_scheduled_end",
]);

function plural(count: number, singular: string, pluralForm = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function isOverTarget(item: QueueItem) {
  if (item.type === "aging_ready_inspection") return item.ageDays >= 3;
  if (item.type === "awaiting_archive") return item.ageDays >= 7;
  if (item.type === "stale_project") return item.ageDays >= 14;
  if (item.type === "past_scheduled_end") return item.ageDays > 0;
  return false;
}

function isCriticalExposure(item: QueueItem) {
  if (!CRITICAL_EXPOSURE_TYPES.has(item.type)) return false;
  if (item.type === "past_scheduled_end") return item.severity === "critical";
  return true;
}

function toneForCriticality(criticalProjects: number, riskProjects: number): BadgeTone {
  if (criticalProjects > 0) return "danger";
  if (riskProjects > 0) return "warning";
  return "success";
}

function topConcentrations(items: QueueItem[], field: "pmName" | "clientName" | "phaseLabel"): RiskConcentration[] {
  const groups = new Map<string, { projects: Set<string>; critical: Set<string>; flags: number }>();

  for (const item of items) {
    const label = item[field] || "Unassigned";
    const group = groups.get(label) ?? { projects: new Set<string>(), critical: new Set<string>(), flags: 0 };
    group.projects.add(item.projectId);
    group.flags += 1;
    if (item.severity === "critical" || isCriticalExposure(item)) {
      group.critical.add(item.projectId);
    }
    groups.set(label, group);
  }

  return Array.from(groups.entries())
    .map(([label, group]) => ({
      label,
      riskProjects: group.projects.size,
      criticalProjects: group.critical.size,
      detail: `${plural(group.projects.size, "project")} / ${plural(group.flags, "flag")}`,
      tone: toneForCriticality(group.critical.size, group.projects.size),
    }))
    .sort(
      (a, b) =>
        b.riskProjects - a.riskProjects ||
        b.criticalProjects - a.criticalProjects ||
        a.label.localeCompare(b.label),
    )
    .slice(0, 3);
}

function focusFromConcentration(label: string, item: RiskConcentration | undefined): ExecutiveFocusItem {
  if (!item) {
    return {
      label,
      value: "Clear",
      detail: "No active concentration",
      tone: "success",
    };
  }

  return {
    label,
    value: item.label,
    detail: `${plural(item.riskProjects, "project")} at risk${item.criticalProjects ? `, ${item.criticalProjects} critical` : ""}`,
    tone: item.tone,
  };
}

export function buildExecutiveSummary(projects: Project[], items: QueueItem[]): ExecutiveSummary {
  const activeProjectIds = new Set(projects.filter((project) => project.status === "active").map((project) => project.id));
  const unresolved = items.filter((item) => !item.resolved);
  const activeItems = unresolved.filter((item) => activeProjectIds.has(item.projectId));
  const groupedActive = buildVisibleQueue(activeItems, "all");
  const criticalProjectIds = new Set(
    activeItems.filter(isCriticalExposure).map((item) => item.projectId),
  );
  const overTargetFlags = unresolved.filter(isOverTarget).length;
  const failedInspections = activeItems.filter((item) => item.type === "failed_inspection").length;
  const readyInspections = activeItems.filter((item) => item.type === "aging_ready_inspection").length;
  const agingReadyInspections = activeItems.filter(
    (item) => item.type === "aging_ready_inspection" && item.ageDays >= 3,
  ).length;
  const oldestFlag = unresolved.reduce<QueueItem | undefined>(
    (oldest, item) => (!oldest || item.ageDays > oldest.ageDays ? item : oldest),
    undefined,
  );
  const pms = topConcentrations(activeItems, "pmName");
  const clients = topConcentrations(activeItems, "clientName");
  const phases = topConcentrations(activeItems, "phaseLabel");

  const metrics: ExecutiveMetric[] = [
    {
      id: "portfolio",
      label: "Portfolio at risk",
      value: groupedActive.length,
      denominator: activeProjectIds.size,
      detail: `${plural(activeItems.length, "active flag")} across current work`,
      tone: toneForCriticality(criticalProjectIds.size, groupedActive.length),
      filter: "all",
    },
    {
      id: "critical",
      label: "Critical exposure",
      value: criticalProjectIds.size,
      denominator: groupedActive.length,
      detail: "Blocked, failed, or severely overdue projects",
      tone: criticalProjectIds.size ? "danger" : "success",
      filter: "critical",
    },
    {
      id: "aging",
      label: "Aging pressure",
      value: overTargetFlags,
      detail: oldestFlag
        ? `Oldest: ${oldestFlag.projectName} at ${oldestFlag.ageDays}d`
        : "No over-target exceptions",
      tone: oldestFlag && oldestFlag.ageDays >= 14 ? "danger" : overTargetFlags ? "warning" : "success",
    },
    {
      id: "inspection",
      label: "Inspection pressure",
      value: failedInspections + readyInspections,
      detail: `${failedInspections} failed / ${readyInspections} ready / ${agingReadyInspections} over 3d`,
      tone: failedInspections ? "danger" : readyInspections ? "ready" : "success",
      filter: failedInspections ? "failed_inspection" : "aging_ready_inspection",
    },
  ];

  const leadershipFocus: ExecutiveFocusItem[] = [
    focusFromConcentration("Top PM exposure", pms[0]),
    focusFromConcentration("Top client exposure", clients[0]),
    focusFromConcentration("Top phase pressure", phases[0]),
    oldestFlag
      ? {
          label: "Oldest unresolved",
          value: oldestFlag.projectName,
          detail: `${QUEUE_TYPE_LABEL[oldestFlag.type]} waiting ${oldestFlag.ageDays}d`,
          tone: oldestFlag.severity === "critical" ? "danger" : oldestFlag.severity === "warning" ? "warning" : "info",
          projectId: oldestFlag.projectId,
        }
      : {
          label: "Oldest unresolved",
          value: "Clear",
          detail: "No unresolved queue flags",
          tone: "success",
        },
  ];

  return {
    activeProjects: activeProjectIds.size,
    groupedRiskProjects: groupedActive.length,
    totalFlags: unresolved.length,
    activeFlags: activeItems.length,
    criticalProjects: criticalProjectIds.size,
    overTargetFlags,
    oldestFlag,
    metrics,
    leadershipFocus,
    concentrations: { pms, clients, phases },
  };
}
