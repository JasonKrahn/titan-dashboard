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

export type PhaseHealthTone = StatusTone | "attention";

export interface PhaseHealth {
  tone: PhaseHealthTone;
  label: string;
  reason: string;
}

const HEALTH_TONE_CLASSES: Record<PhaseHealthTone, { bg: string; text: string; border: string; dot: string }> = {
  blocked: { bg: "bg-status-blocked/15", text: "text-status-blocked", border: "border-status-blocked/40", dot: "bg-status-blocked" },
  attention: { bg: "bg-status-ready/15", text: "text-status-ready", border: "border-status-ready/40", dot: "bg-status-ready" },
  "in-progress": { bg: "bg-status-in-progress/15", text: "text-status-in-progress", border: "border-status-in-progress/30", dot: "bg-status-in-progress" },
  ready: { bg: "bg-status-ready/15", text: "text-status-ready", border: "border-status-ready/40", dot: "bg-status-ready" },
  closed: { bg: "bg-status-closed/15", text: "text-status-closed", border: "border-status-closed/40", dot: "bg-status-closed" },
  "not-started": { bg: "bg-status-not-started/15", text: "text-status-not-started", border: "border-status-not-started/30", dot: "bg-status-not-started" },
};

export function phaseHealthClasses(tone: PhaseHealthTone) {
  return HEALTH_TONE_CLASSES[tone];
}

export function computePhaseHealth(
  phase: Phase | undefined,
  phaseGates: Gate[],
  phaseDefs: Deficiency[],
): PhaseHealth {
  if (!phase) return { tone: "not-started", label: "Not started", reason: "Phase not yet created" };

  const openDefs = phaseDefs.filter((d) => d.status === "open" || d.status === "in_progress");
  const severeDefs = openDefs.filter((d) => d.severity === "high" || d.severity === "critical");
  const failedGate = phaseGates.find((g) => g.status === "failed");
  const blockedGate = phaseGates.find((g) => g.status === "blocked");

  if (phase.status === "blocked" || blockedGate) {
    return { tone: "blocked", label: "Blocked", reason: blockedGate ? `${gateLabel(blockedGate.type)} blocked` : "Phase blocked" };
  }
  if (failedGate) {
    return { tone: "blocked", label: "Blocked", reason: `${gateLabel(failedGate.type)} failed` };
  }
  if (severeDefs.length > 0) {
    return { tone: "blocked", label: "Critical issue", reason: `${severeDefs.length} high-severity ${severeDefs.length === 1 ? "issue" : "issues"}` };
  }
  if (phase.status === "ready_for_inspection") {
    return { tone: "attention", label: "Awaiting inspection", reason: "Ready for inspection" };
  }
  if (openDefs.length > 0) {
    return { tone: "attention", label: "Needs attention", reason: `${openDefs.length} open ${openDefs.length === 1 ? "issue" : "issues"}` };
  }
  if (phase.status === "in_progress") {
    return { tone: "in-progress", label: "On track", reason: "Work in progress" };
  }
  if (phase.status === "closed") {
    return { tone: "closed", label: "Closed", reason: "Phase complete" };
  }
  return { tone: "not-started", label: "Not started", reason: "Awaiting kickoff" };
}

export const GATE_LABEL: Record<Gate["type"], string> = {
  site_check: "Site check",
  inspection: "Inspection",
  attic_check: "Attic check",
};

function gateLabel(type: Gate["type"]) {
  return GATE_LABEL[type];
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
