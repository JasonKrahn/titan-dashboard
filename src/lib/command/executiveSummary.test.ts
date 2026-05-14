import { describe, expect, it } from "vitest";
import type { Project } from "@/lib/types";
import { buildExecutiveSummary } from "./executiveSummary";
import type { QueueItem } from "./attentionQueue";

const NOW = "2026-05-10T12:00:00.000Z";

function project(overrides: Partial<Project> & { id: string }): Project {
  return {
    id: overrides.id,
    clientId: "client-1",
    projectNumber: `TP-${overrides.id}`,
    name: overrides.id,
    siteAddress: "100 Main St",
    status: "active",
    atticCheckStatus: "passed",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function item(overrides: Partial<QueueItem> & { id: string; projectId: string }): QueueItem {
  return {
    id: overrides.id,
    type: "missing_attic_evidence",
    severity: "warning",
    category: "warning",
    title: "Attic evidence missing",
    reason: "No confirmed attic check photo on file",
    nextAction: "Upload attic check photo evidence",
    ageDays: 1,
    projectName: overrides.projectId,
    clientName: "Acme Homes",
    pmName: "Avery Stone",
    phaseLabel: "Drywall",
    ...overrides,
  };
}

describe("command executive summary", () => {
  it("counts grouped active risk projects instead of duplicate raw flags", () => {
    const summary = buildExecutiveSummary(
      [
        project({ id: "active-multi" }),
        project({ id: "active-single" }),
        project({ id: "active-clear" }),
        project({ id: "completed-archive", status: "completed" }),
      ],
      [
        item({ id: "active-multi-blocked", projectId: "active-multi", type: "critical_blocker", severity: "critical", category: "critical" }),
        item({ id: "active-multi-attic", projectId: "active-multi" }),
        item({ id: "active-single-attic", projectId: "active-single" }),
        item({ id: "completed-archive-ready", projectId: "completed-archive", type: "awaiting_archive", category: "completed", severity: "info", ageDays: 8 }),
      ],
    );

    expect(summary.activeProjects).toBe(3);
    expect(summary.groupedRiskProjects).toBe(2);
    expect(summary.activeFlags).toBe(3);
    expect(summary.totalFlags).toBe(4);
    expect(summary.metrics.find((metric) => metric.id === "portfolio")).toMatchObject({
      value: 2,
      denominator: 3,
    });
  });

  it("preserves current-state aging thresholds without needing historical snapshots", () => {
    const summary = buildExecutiveSummary(
      [project({ id: "active-1" }), project({ id: "active-2" })],
      [
        item({ id: "ready-under-target", projectId: "active-1", type: "aging_ready_inspection", category: "ready", severity: "info", ageDays: 2 }),
        item({ id: "ready-over-target", projectId: "active-1", type: "aging_ready_inspection", category: "ready", severity: "info", ageDays: 3 }),
        item({ id: "archive-over-target", projectId: "active-2", type: "awaiting_archive", category: "completed", severity: "info", ageDays: 7 }),
        item({ id: "stale-over-target", projectId: "active-2", type: "stale_project", ageDays: 14 }),
        item({ id: "past-target", projectId: "active-2", type: "past_scheduled_end", ageDays: 1 }),
      ],
    );

    expect(summary.overTargetFlags).toBe(4);
    expect(summary.oldestFlag?.id).toBe("stale-over-target");
    expect(summary.metrics.find((metric) => metric.id === "aging")).toMatchObject({
      value: 4,
      tone: "danger",
    });
  });

  it("counts critical exposure from blockers, failed inspections, and severe overdue work", () => {
    const summary = buildExecutiveSummary(
      [project({ id: "blocked" }), project({ id: "failed" }), project({ id: "overdue-warning" }), project({ id: "overdue-critical" })],
      [
        item({ id: "blocked-item", projectId: "blocked", type: "critical_blocker", severity: "critical", category: "critical" }),
        item({ id: "failed-item", projectId: "failed", type: "failed_inspection", severity: "warning" }),
        item({ id: "overdue-warning-item", projectId: "overdue-warning", type: "past_scheduled_end", severity: "warning" }),
        item({ id: "overdue-critical-item", projectId: "overdue-critical", type: "past_scheduled_end", severity: "critical", category: "critical" }),
      ],
    );

    expect(summary.criticalProjects).toBe(3);
    expect(summary.metrics.find((metric) => metric.id === "critical")).toMatchObject({
      value: 3,
      tone: "danger",
    });
  });

  it("ranks owner, client, and phase concentration deterministically", () => {
    const summary = buildExecutiveSummary(
      [project({ id: "a" }), project({ id: "b" }), project({ id: "c" })],
      [
        item({ id: "a-1", projectId: "a", pmName: "Beta PM", clientName: "Beta Client", phaseLabel: "Finishing" }),
        item({ id: "b-1", projectId: "b", pmName: "Alpha PM", clientName: "Alpha Client", phaseLabel: "Drywall" }),
        item({ id: "c-1", projectId: "c", pmName: "Alpha PM", clientName: "Alpha Client", phaseLabel: "Drywall", severity: "critical", category: "critical", type: "critical_blocker" }),
      ],
    );

    expect(summary.concentrations.pms[0]).toMatchObject({
      label: "Alpha PM",
      riskProjects: 2,
      criticalProjects: 1,
    });
    expect(summary.concentrations.clients[0].label).toBe("Alpha Client");
    expect(summary.concentrations.phases[0].label).toBe("Drywall");
  });

  it("ignores resolved items in executive metrics", () => {
    const summary = buildExecutiveSummary(
      [project({ id: "resolved-only" })],
      [item({ id: "resolved-item", projectId: "resolved-only", resolved: true, type: "critical_blocker", severity: "critical" })],
    );

    expect(summary.groupedRiskProjects).toBe(0);
    expect(summary.totalFlags).toBe(0);
    expect(summary.criticalProjects).toBe(0);
  });
});
