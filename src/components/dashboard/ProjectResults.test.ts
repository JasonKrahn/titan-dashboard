import { describe, expect, it } from "vitest";
import type { PhaseSummaryItem } from "@/lib/derived";
import { sortProjectRows, type ProjectRow, type ProjectSortState } from "./ProjectResultsSort";

function row(overrides: Partial<ProjectRow>): ProjectRow {
  return {
    project: {
      id: "project",
      clientId: "client",
      projectNumber: "TP-2025-000",
      name: "Project",
      siteAddress: "123 Main St, Winnipeg, MB R3C 1A3",
      status: "active",
      atticCheckStatus: "not_started",
      createdAt: "2026-05-01T10:00:00.000Z",
      updatedAt: "2026-05-01T10:00:00.000Z",
    },
    clientName: "Client",
    pmName: "Unassigned",
    phaseSummary: [
      { type: "insulation", abbrev: "INSU", tone: "not-started", label: "Not started", reason: "Phase not yet created" },
      { type: "drywall", abbrev: "DRYW", tone: "not-started", label: "Not started", reason: "Phase not yet created" },
      { type: "finishing", abbrev: "FINI", tone: "not-started", label: "Not started", reason: "Phase not yet created" },
    ] as PhaseSummaryItem[],
    openIssues: 0,
    ...overrides,
  };
}

describe("sortProjectRows", () => {
  const rows = [
    row({
      project: {
        ...row({}).project,
        id: "summit",
        projectNumber: "TP-2025-003",
        name: "Summit Heights Block C",
        status: "active",
        updatedAt: "2026-05-01T11:00:00.000Z",
      },
      clientName: "Summit Construction Group",
      pmName: "Parker Patel",
      openIssues: 0,
    }),
    row({
      project: {
        ...row({}).project,
        id: "maple",
        projectNumber: "TP-2025-001",
        name: "Maple Ridge Phase 4",
        status: "completed",
        updatedAt: "2026-05-01T12:00:00.000Z",
      },
      clientName: "Northbridge Developments",
      pmName: "Maya Reed",
      openIssues: 2,
    }),
    row({
      project: {
        ...row({}).project,
        id: "cedar",
        projectNumber: "TP-2025-002",
        name: "Cedar Hollow Lot 12",
        status: "draft",
        updatedAt: "2026-05-01T10:00:00.000Z",
      },
      clientName: "Cedar Hollow Homes",
      pmName: "Aaron Lin",
      openIssues: 1,
    }),
  ];

  it("defaults to updated descending", () => {
    expect(sortProjectRows(rows, { key: "updated", direction: "desc" }).map((item) => item.project.id)).toEqual([
      "maple",
      "summit",
      "cedar",
    ]);
  });

  it("sorts by project identity, status, open issues, and PM", () => {
    const projectSort: ProjectSortState = { key: "project", direction: "asc" };
    const statusSort: ProjectSortState = { key: "status", direction: "asc" };
    const issuesSort: ProjectSortState = { key: "openIssues", direction: "desc" };
    const pmSort: ProjectSortState = { key: "pm", direction: "asc" };

    expect(sortProjectRows(rows, projectSort).map((item) => item.project.id)).toEqual(["cedar", "maple", "summit"]);
    expect(sortProjectRows(rows, statusSort).map((item) => item.project.id)).toEqual(["summit", "maple", "cedar"]);
    expect(sortProjectRows(rows, issuesSort).map((item) => item.project.id)).toEqual(["maple", "cedar", "summit"]);
    expect(sortProjectRows(rows, pmSort).map((item) => item.project.id)).toEqual(["cedar", "maple", "summit"]);
  });
});
