import { describe, expect, it } from "vitest";
import type { SubcontractorContact } from "@/lib/types";
import { buildSubcontractorRows, sortSubcontractors, type SubcontractorAssignmentSummary } from "./SubcontractorRows";

function sub(overrides: Partial<SubcontractorContact>): SubcontractorContact {
  return {
    id: "sub",
    displayName: "Sub",
    companyName: "Company",
    trade: "insulation",
    active: true,
    createdAt: "2026-05-01T10:00:00.000Z",
    updatedAt: "2026-05-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("subcontractor rows", () => {
  const rows = [
    sub({ id: "drywall", displayName: "Tina Morales", companyName: "Wallcraft", trade: "drywall" }),
    sub({ id: "finish", displayName: "Jules Park", companyName: "Finish First", trade: "finishing" }),
    sub({ id: "insulation", displayName: "Bob Hayes", companyName: "Insul-Pro", trade: "insulation" }),
  ];

  it("defaults to name sorting", () => {
    expect(sortSubcontractors(rows, { key: "name", direction: "asc" }).map((row) => row.id)).toEqual([
      "insulation",
      "finish",
      "drywall",
    ]);
  });

  it("searches company, phone, email, and trade before sorting", () => {
    const matches = buildSubcontractorRows(
      [
        sub({ id: "a", displayName: "A", companyName: "Alpha", phone: "555-0101" }),
        sub({ id: "b", displayName: "B", companyName: "Beta", email: "team@beta.example" }),
        sub({ id: "c", displayName: "C", companyName: "Gamma", trade: "drywall" }),
      ],
      "555-0101",
      { key: "company", direction: "asc" },
    );

    expect(matches.map((row) => row.id)).toEqual(["a"]);
  });

  it("filters by trade, status, and assignment state", () => {
    const assignments = new Map<string, SubcontractorAssignmentSummary>([
      ["active-assigned", { assignmentCount: 2 }],
    ]);
    const matches = buildSubcontractorRows(
      [
        sub({ id: "active-assigned", displayName: "Active Assigned", trade: "drywall", active: true }),
        sub({ id: "inactive-assigned", displayName: "Inactive Assigned", trade: "drywall", active: false }),
        sub({ id: "active-unassigned", displayName: "Active Unassigned", trade: "drywall", active: true }),
        sub({ id: "other-trade", displayName: "Other Trade", trade: "finishing", active: true }),
      ],
      "",
      { key: "name", direction: "asc" },
      { trade: "drywall", status: "active", assignment: "assigned" },
      assignments,
    );

    expect(matches.map((row) => row.id)).toEqual(["active-assigned"]);
  });

  it("sorts by assignment count and next scheduled finish", () => {
    const assignments = new Map<string, SubcontractorAssignmentSummary>([
      ["a", { assignmentCount: 1, nextScheduledFinish: "2026-05-12T10:00:00.000Z" }],
      ["b", { assignmentCount: 3, nextScheduledFinish: "2026-05-10T10:00:00.000Z" }],
      ["c", { assignmentCount: 0 }],
    ]);
    const sortable = [
      sub({ id: "a", displayName: "A" }),
      sub({ id: "b", displayName: "B" }),
      sub({ id: "c", displayName: "C" }),
    ];

    expect(sortSubcontractors(sortable, { key: "assignmentCount", direction: "desc" }, assignments).map((row) => row.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
    expect(sortSubcontractors(sortable, { key: "nextScheduledFinish", direction: "asc" }, assignments).map((row) => row.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });
});
