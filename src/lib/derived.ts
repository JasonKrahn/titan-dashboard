// Pure derivation helpers used by the dashboard.
import type { Deficiency, Gate, Phase, PhaseType, Project } from "@/lib/types";

export const PHASE_ORDER: PhaseType[] = ["insulation", "drywall", "finishing"];

export const PHASE_LABEL: Record<PhaseType, string> = {
  insulation: "Insulation",
  drywall: "Drywall",
  finishing: "Finishing",
};

export type StatusTone = "not-started" | "in-progress" | "ready" | "blocked" | "closed";

export function phaseStatusTone(s: Phase["status"]): StatusTone {
  switch (s) {
    case "not_started": return "not-started";
    case "in_progress": return "in-progress";
    case "ready_for_inspection": return "ready";
    case "blocked": return "blocked";
    case "closed": return "closed";
  }
}

export function gateStatusTone(s: Gate["status"]): StatusTone {
  switch (s) {
    case "not_started": return "not-started";
    case "in_progress": return "in-progress";
    case "passed": return "closed";
    case "failed": return "blocked";
    case "blocked": return "blocked";
  }
}

export function projectStatusTone(s: Project["status"]): StatusTone {
  switch (s) {
    case "draft": return "not-started";
    case "active": return "in-progress";
    case "completed": return "closed";
    case "archived": return "not-started";
  }
}

export const STATUS_LABEL: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  ready_for_inspection: "Ready for inspection",
  closed: "Closed",
  blocked: "Blocked",
  passed: "Passed",
  failed: "Failed",
  draft: "Draft",
  active: "Active",
  completed: "Completed",
  archived: "Archived",
};

export function projectPhases(projectId: string, allPhases: Phase[]): Record<PhaseType, Phase | undefined> {
  return PHASE_ORDER.reduce(
    (acc, type) => {
      acc[type] = allPhases.find((p) => p.projectId === projectId && p.type === type);
      return acc;
    },
    {} as Record<PhaseType, Phase | undefined>,
  );
}

export function openDeficiencyCount(projectId: string, defs: Deficiency[]): number {
  return defs.filter((d) => d.projectId === projectId && (d.status === "open" || d.status === "in_progress")).length;
}

export function projectHasBlocked(projectId: string, phases: Phase[], gates: Gate[]): boolean {
  return (
    phases.some((p) => p.projectId === projectId && p.status === "blocked") ||
    gates.some((g) => g.projectId === projectId && (g.status === "blocked" || g.status === "failed"))
  );
}

export function dueInspectionPhases(projectId: string, phases: Phase[]): Phase[] {
  return phases.filter((p) => p.projectId === projectId && p.status === "ready_for_inspection");
}

export function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const m = Math.round(diffMs / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.round(d / 30);
  return `${mo}mo ago`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
