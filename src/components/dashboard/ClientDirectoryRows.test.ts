import { describe, expect, it } from "vitest";
import { buildClientRows } from "./ClientDirectoryRows";
import type { ClientRecord, Project } from "@/lib/types";

function client(overrides: Partial<ClientRecord>): ClientRecord {
  return {
    id: "client",
    name: "Client",
    archived: false,
    createdAt: "2026-05-01T10:00:00.000Z",
    updatedAt: "2026-05-01T10:00:00.000Z",
    ...overrides,
  };
}

function project(overrides: Partial<Project>): Project {
  return {
    id: "project",
    clientId: "client",
    projectNumber: "TP-2025-000",
    name: "Project",
    siteAddress: "123 Main St, Winnipeg, MB R3C 1A3",
    status: "active",
    atticCheckStatus: "not_started",
    createdAt: "2026-05-01T10:00:00.000Z",
    updatedAt: "2026-05-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("buildClientRows", () => {
  const clients = [
    client({ id: "summit", name: "Summit Construction Group", primaryContactName: "Theo Park" }),
    client({ id: "cedar", name: "Cedar Hollow Homes", primaryContactName: "Anna Lin" }),
    client({ id: "northbridge", name: "Northbridge Developments", primaryContactName: "Daniel Lowe" }),
  ];

  const projects = [
    project({
      id: "cedar-active",
      clientId: "cedar",
      name: "Cedar Hollow Lot 12",
      status: "active",
      updatedAt: "2026-05-01T12:00:00.000Z",
    }),
    project({
      id: "cedar-archived",
      clientId: "cedar",
      name: "Cedar Hollow Lot 7",
      status: "archived",
      updatedAt: "2026-05-01T11:00:00.000Z",
    }),
    project({
      id: "northbridge-active",
      clientId: "northbridge",
      name: "Maple Ridge Phase 4",
      status: "active",
      updatedAt: "2026-05-01T13:00:00.000Z",
    }),
  ];

  it("sorts clients alphabetically and calculates project counts", () => {
    const rows = buildClientRows(clients, projects, "");

    expect(rows.map((row) => row.client.id)).toEqual(["cedar", "northbridge", "summit"]);
    expect(rows[0].activeProjects).toBe(1);
    expect(rows[0].totalJobs).toBe(2);
    expect(rows[0].latestProject?.name).toBe("Cedar Hollow Lot 12");
  });

  it("keeps search results alphabetically sorted", () => {
    const rows = buildClientRows(clients, projects, "o");

    expect(rows.map((row) => row.client.id)).toEqual(["cedar", "northbridge", "summit"]);
  });

  it("sorts by contact, active, and total using selected direction", () => {
    const customClients = [
      client({ id: "a", name: "Atlas Homes", primaryContactName: "Zed" }),
      client({ id: "b", name: "Briar Builds", primaryContactName: "Amy" }),
      client({ id: "c", name: "Crown Projects", primaryContactName: "Moe" }),
    ];
    const customProjects = [
      project({ id: "a1", clientId: "a", status: "active" }),
      project({ id: "a2", clientId: "a", status: "completed" }),
      project({ id: "a3", clientId: "a", status: "active" }),
      project({ id: "b1", clientId: "b", status: "completed" }),
      project({ id: "c1", clientId: "c", status: "active" }),
      project({ id: "c2", clientId: "c", status: "completed" }),
    ];

    expect(buildClientRows(customClients, customProjects, "", { key: "contact", direction: "asc" }).map((row) => row.client.id)).toEqual(["b", "c", "a"]);
    expect(buildClientRows(customClients, customProjects, "", { key: "active", direction: "desc" }).map((row) => row.client.id)).toEqual(["a", "c", "b"]);
    expect(buildClientRows(customClients, customProjects, "", { key: "total", direction: "desc" }).map((row) => row.client.id)).toEqual(["a", "c", "b"]);
  });
});
