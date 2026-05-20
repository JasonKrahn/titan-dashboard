import { describe, expect, it, vi } from "vitest";
import type { Phase, Project } from "@/lib/types";
import { buildBottleneckInsights, buildHeatmap } from "./heatmap";

const NOW = "2026-05-10T12:00:00.000Z";

function daysAgo(days: number) {
  return new Date(Date.parse(NOW) - days * 24 * 60 * 60 * 1000).toISOString();
}

function project(overrides: Partial<Project> & { id: string; status: Project["status"] }): Project {
  return {
    id: overrides.id,
    clientId: "client-1",
    projectNumber: `TP-${overrides.id}`,
    name: overrides.id,
    siteAddress: "123 Main St, Winnipeg, MB R3C 1A3",
    atticCheckStatus: "passed",
    createdAt: daysAgo(20),
    updatedAt: daysAgo(2),
    ...overrides,
  };
}

function phase(overrides: Partial<Phase> & { id: string; projectId: string }): Phase {
  return {
    id: overrides.id,
    projectId: overrides.projectId,
    type: "drywall",
    status: "closed",
    createdAt: daysAgo(20),
    updatedAt: daysAgo(2),
    ...overrides,
  };
}

describe("command heatmap", () => {
  vi.setSystemTime(new Date(NOW));

  it("counts phase rows from active projects only while keeping portfolio status summary rows", () => {
    const matrix = buildHeatmap(
      [
        project({ id: "project-draft", status: "draft" }),
        project({ id: "project-active", status: "active" }),
        project({ id: "project-completed", status: "completed", completedAt: daysAgo(8) }),
        project({ id: "project-archived", status: "archived" }),
      ],
      [
        phase({ id: "active-ready", projectId: "project-active", status: "ready_for_inspection" }),
        phase({ id: "completed-closed", projectId: "project-completed", status: "closed" }),
        phase({ id: "archived-closed", projectId: "project-archived", status: "closed" }),
      ],
    );

    const drywall = matrix.rows.find((row) => row.key === "drywall");
    const draft = matrix.rows.find((row) => row.key === "draft");
    const completed = matrix.rows.find((row) => row.key === "completed");
    const archived = matrix.rows.find((row) => row.key === "archived");

    expect(drywall?.cells.ready_for_inspection.count).toBe(1);
    expect(drywall?.cells.closed.count).toBe(0);
    expect(draft?.cells.not_started.count).toBe(1);
    expect(completed?.cells.closed.count).toBe(1);
    expect(archived?.cells.closed.count).toBe(1);
  });

  it("uses the same 7 day archive threshold for bottleneck insights", () => {
    const projects = [
      project({ id: "project-new-complete", status: "completed", completedAt: daysAgo(3), updatedAt: daysAgo(3) }),
      project({ id: "project-old-complete", status: "completed", completedAt: daysAgo(8), updatedAt: daysAgo(8) }),
    ];
    const matrix = buildHeatmap(projects, []);

    expect(buildBottleneckInsights(matrix, projects)).toContainEqual({
      id: "archive",
      tone: "success",
      message: "1 completed project ready to archive after 7 days.",
    });
  });
});
