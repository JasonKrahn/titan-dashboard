import { describe, expect, it } from "vitest";
import type { Gate, Phase, PhotoEvidence, Project } from "@/lib/types";
import { KPI_TO_FILTER, buildCommandKpis } from "./kpis";

const NOW = "2026-05-10T12:00:00.000Z";

function project(overrides: Partial<Project> & { id: string }): Project {
  return {
    id: overrides.id,
    clientId: "client-1",
    projectNumber: `TP-${overrides.id}`,
    name: overrides.id,
    siteAddress: "123 Main St, Winnipeg, MB R3C 1A3",
    status: "active",
    atticCheckStatus: "passed",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function phase(overrides: Partial<Phase> & { id: string; projectId: string }): Phase {
  return {
    id: overrides.id,
    projectId: overrides.projectId,
    type: "drywall",
    status: "in_progress",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function gate(overrides: Partial<Gate> & { id: string; projectId: string }): Gate {
  return {
    id: overrides.id,
    projectId: overrides.projectId,
    type: "inspection",
    status: "not_started",
    requiredPhotoEvidence: false,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe("command KPIs", () => {
  it("maps KPI clicks to explicit queue item filters", () => {
    expect(KPI_TO_FILTER).toEqual({
      active: "all",
      blocked: "critical_blocker",
      failed: "failed_inspection",
      ready: "aging_ready_inspection",
      attic: "missing_attic_evidence",
    });
  });

  it("counts blocked work by distinct project and keeps failed inspections separate", () => {
    const photos: PhotoEvidence[] = [];
    const kpis = buildCommandKpis({
      projects: [project({ id: "project-blocked" }), project({ id: "project-failed" })],
      phases: [
        phase({ id: "phase-blocked", projectId: "project-blocked", status: "blocked" }),
        phase({ id: "phase-failed", projectId: "project-failed", status: "blocked" }),
      ],
      gates: [
        gate({ id: "gate-blocked", projectId: "project-blocked", status: "blocked" }),
        gate({
          id: "gate-failed",
          projectId: "project-failed",
          phaseId: "phase-failed",
          type: "inspection",
          status: "failed",
        }),
      ],
      photos,
    });

    expect(kpis.find((item) => item.key === "blocked")?.count).toBe(1);
    expect(kpis.find((item) => item.key === "failed")?.count).toBe(1);
  });
});
