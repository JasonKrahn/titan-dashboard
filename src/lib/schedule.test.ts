import { describe, expect, it } from "vitest";
import type { Phase } from "@/lib/types";
import {
  computeScheduleDraft,
  parseScheduleDate,
  toScheduleDate,
} from "./schedule";

function phase(id: string, type: Phase["type"], start: string, end: string): Phase {
  return {
    id,
    projectId: "project-1",
    type,
    status: "not_started",
    scheduledStart: start,
    scheduledEnd: end,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
  };
}

describe("schedule helpers", () => {
  const projectStart = "2026-05-01";
  const projectEnd = "2026-05-31";

  it("round-trips dates through UTC day precision", () => {
    const ms = parseScheduleDate("2026-05-10T19:30:00.000Z");

    expect(toScheduleDate(ms)).toBe("2026-05-10");
  });

  it("moves a phase while preserving duration", () => {
    const result = computeScheduleDraft({
      phases: [
        phase("phase-insulation", "insulation", "2026-05-01", "2026-05-06"),
        phase("phase-drywall", "drywall", "2026-05-10", "2026-05-15"),
        phase("phase-finishing", "finishing", "2026-05-20", "2026-05-25"),
      ],
      projectStart,
      projectEnd,
      phaseId: "phase-insulation",
      mode: "move",
      deltaDays: 2,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.changes).toContainEqual({
      phaseId: "phase-insulation",
      scheduledStart: "2026-05-03",
      scheduledEnd: "2026-05-08",
    });
  });

  it("enforces a one-day minimum duration when resizing the start", () => {
    const result = computeScheduleDraft({
      phases: [
        phase("phase-insulation", "insulation", "2026-05-01", "2026-05-06"),
        phase("phase-drywall", "drywall", "2026-05-10", "2026-05-15"),
        phase("phase-finishing", "finishing", "2026-05-20", "2026-05-25"),
      ],
      projectStart,
      projectEnd,
      phaseId: "phase-insulation",
      mode: "resize-start",
      deltaDays: 10,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.changes).toContainEqual({
      phaseId: "phase-insulation",
      scheduledStart: "2026-05-05",
      scheduledEnd: "2026-05-06",
    });
  });

  it("does not cascade when resizing end into an adjacent phase", () => {
    const result = computeScheduleDraft({
      phases: [
        phase("phase-insulation", "insulation", "2026-05-01", "2026-05-06"),
        phase("phase-drywall", "drywall", "2026-05-07", "2026-05-12"),
        phase("phase-finishing", "finishing", "2026-05-13", "2026-05-18"),
      ],
      projectStart,
      projectEnd,
      phaseId: "phase-insulation",
      mode: "resize-end",
      deltaDays: 5,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.changes).toEqual([
      { phaseId: "phase-insulation", scheduledStart: "2026-05-01", scheduledEnd: "2026-05-11" },
    ]);
  });

  it("allows phases to overlap without error", () => {
    const result = computeScheduleDraft({
      phases: [
        phase("phase-insulation", "insulation", "2026-05-01", "2026-05-06"),
        phase("phase-drywall", "drywall", "2026-05-07", "2026-05-12"),
        phase("phase-finishing", "finishing", "2026-05-25", "2026-05-28"),
      ],
      projectStart,
      projectEnd,
      phaseId: "phase-insulation",
      mode: "resize-end",
      deltaDays: 5,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.changes.map((change) => change.phaseId)).toEqual(["phase-insulation"]);
  });

  it("rejects resize-end that exceeds the project deadline", () => {
    const result = computeScheduleDraft({
      phases: [
        phase("phase-finishing", "finishing", "2026-05-25", "2026-05-31"),
      ],
      projectStart,
      projectEnd,
      phaseId: "phase-finishing",
      mode: "resize-end",
      deltaDays: 5,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toMatch(/project deadline/i);
  });
});
