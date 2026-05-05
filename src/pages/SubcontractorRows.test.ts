import { describe, expect, it } from "vitest";
import type { SubcontractorContact } from "@/lib/types";
import { buildSubcontractorRows, sortSubcontractors } from "./SubcontractorRows";

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
      "beta",
      { key: "company", direction: "asc" },
    );

    expect(matches.map((row) => row.id)).toEqual(["b"]);
  });
});
