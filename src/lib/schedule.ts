import { PHASE_ORDER } from "@/lib/derived";
import type { Phase } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;

export type ScheduleDragMode = "move" | "resize-start" | "resize-end";

export interface PhaseScheduleChange {
  phaseId: string;
  scheduledStart: string;
  scheduledEnd: string;
}

export type ScheduleDraftResult =
  | { ok: true; changes: PhaseScheduleChange[]; phases: PhaseScheduleChange[] }
  | { ok: false; message: string };

type WorkingPhase = {
  phaseId: string;
  startMs: number;
  endMs: number;
};

export function parseScheduleDate(value: string): number {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function toScheduleDate(ms: number): string {
  const date = new Date(ms);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateWithOptions(value: string, options: { showYear?: boolean } = {}): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: options.showYear ? "numeric" : undefined,
  });
}

export function orderedSchedulePhases(phases: Phase[]): Phase[] {
  return [...phases].sort((a, b) => PHASE_ORDER.indexOf(a.type) - PHASE_ORDER.indexOf(b.type));
}

export function computeScheduleDraft({
  phases,
  projectStart,
  projectEnd,
  phaseId,
  mode,
  deltaDays,
}: {
  phases: Phase[];
  projectStart: string;
  projectEnd: string;
  phaseId: string;
  mode: ScheduleDragMode;
  deltaDays: number;
}): ScheduleDraftResult {
  if (!projectStart || !projectEnd) {
    return { ok: false, message: "Project schedule dates are required." };
  }

  const projectStartMs = parseScheduleDate(projectStart);
  const projectEndMs = parseScheduleDate(projectEnd);
  if (projectEndMs <= projectStartMs) {
    return { ok: false, message: "Project deadline must be after project start." };
  }

  const ordered = orderedSchedulePhases(phases);
  const working: WorkingPhase[] = [];
  for (const phase of ordered) {
    if (!phase.scheduledStart || !phase.scheduledEnd) {
      return { ok: false, message: "Every phase needs scheduled dates before timeline editing." };
    }
    const startMs = parseScheduleDate(phase.scheduledStart);
    const endMs = parseScheduleDate(phase.scheduledEnd);
    if (endMs <= startMs) {
      return { ok: false, message: "Phase end dates must be after phase start dates." };
    }
    working.push({ phaseId: phase.id, startMs, endMs });
  }

  const activeIndex = working.findIndex((phase) => phase.phaseId === phaseId);
  if (activeIndex === -1) return { ok: false, message: "Phase not found." };

  const active = working[activeIndex];
  const durationMs = active.endMs - active.startMs;
  const deltaMs = deltaDays * DAY_MS;

  if (mode === "move") {
    let nextStart = active.startMs + deltaMs;
    let nextEnd = active.endMs + deltaMs;
    if (nextStart < projectStartMs) {
      nextStart = projectStartMs;
      nextEnd = nextStart + durationMs;
    }
    if (nextEnd > projectEndMs) {
      nextEnd = projectEndMs;
      nextStart = nextEnd - durationMs;
    }
    active.startMs = nextStart;
    active.endMs = nextEnd;
  }

  if (mode === "resize-start") {
    active.startMs = Math.min(Math.max(active.startMs + deltaMs, projectStartMs), active.endMs - DAY_MS);
  }

  if (mode === "resize-end") {
    active.endMs = Math.max(active.startMs + DAY_MS, active.endMs + deltaMs);
  }

  if (working.some((phase) => phase.startMs < projectStartMs || phase.endMs > projectEndMs)) {
    return { ok: false, message: "Schedule change exceeds the project deadline." };
  }

  const nextPhases = working.map((phase) => ({
    phaseId: phase.phaseId,
    scheduledStart: toScheduleDate(phase.startMs),
    scheduledEnd: toScheduleDate(phase.endMs),
  }));

  const changes = nextPhases.filter((next) => {
    const original = phases.find((phase) => phase.id === next.phaseId);
    return (
      !original ||
      toScheduleDate(parseScheduleDate(original.scheduledStart ?? next.scheduledStart)) !== next.scheduledStart ||
      toScheduleDate(parseScheduleDate(original.scheduledEnd ?? next.scheduledEnd)) !== next.scheduledEnd
    );
  });

  return { ok: true, changes, phases: nextPhases };
}

export function daysBetween(start: string, end: string): number {
  return Math.max(1, Math.round((parseScheduleDate(end) - parseScheduleDate(start)) / DAY_MS));
}
