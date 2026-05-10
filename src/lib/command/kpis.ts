import type { KpiData, KpiKey } from "@/components/command/KpiStrip";
import type { Gate, Phase, PhotoEvidence, Project } from "@/lib/types";
import type { QueueFilter } from "./attentionQueue";

export const KPI_TO_FILTER: Record<KpiKey, QueueFilter> = {
  active: "all",
  blocked: "critical_blocker",
  failed: "failed_inspection",
  ready: "aging_ready_inspection",
  attic: "missing_attic_evidence",
};

export interface BuildCommandKpisArgs {
  projects: Project[];
  phases: Phase[];
  gates: Gate[];
  photos: PhotoEvidence[];
}

export function buildCommandKpis({ projects, phases, gates, photos }: BuildCommandKpisArgs): KpiData[] {
  const activeProjectIds = new Set(projects.filter((p) => p.status === "active").map((p) => p.id));
  const failedInspectionPhaseIds = new Set(
    gates
      .filter((g) => activeProjectIds.has(g.projectId) && g.type === "inspection" && g.status === "failed")
      .map((g) => g.phaseId)
      .filter(Boolean),
  );
  const blockedProjectIds = new Set<string>();

  phases
    .filter(
      (p) =>
        activeProjectIds.has(p.projectId) &&
        p.status === "blocked" &&
        !failedInspectionPhaseIds.has(p.id),
    )
    .forEach((p) => blockedProjectIds.add(p.projectId));

  gates
    .filter((g) => activeProjectIds.has(g.projectId) && g.status === "blocked")
    .forEach((g) => blockedProjectIds.add(g.projectId));

  const active = activeProjectIds.size;
  const blocked = blockedProjectIds.size;
  const failed = gates.filter(
    (g) => activeProjectIds.has(g.projectId) && g.type === "inspection" && g.status === "failed",
  ).length;
  const ready = phases.filter(
    (p) => activeProjectIds.has(p.projectId) && p.status === "ready_for_inspection",
  ).length;
  const atticMissing = projects.filter((p) => {
    if (p.status !== "active") return false;
    if (p.atticCheckStatus === "passed") return false;
    return !photos.some(
      (ph) => ph.projectId === p.id && ph.purpose === "attic_check" && ph.status === "confirmed",
    );
  }).length;

  return [
    { key: "active", label: "Active projects", count: active, tone: "info" },
    { key: "blocked", label: "Blocked work", count: blocked, tone: blocked ? "danger" : "neutral" },
    { key: "failed", label: "Failed inspections", count: failed, tone: failed ? "danger" : "neutral" },
    { key: "ready", label: "Ready inspections", count: ready, tone: ready ? "ready" : "neutral" },
    { key: "attic", label: "Missing attic", count: atticMissing, tone: atticMissing ? "warning" : "neutral" },
  ];
}
