import { describe, expect, it } from "vitest";
import {
  getAllDeficiencies,
  getAllGates,
  getAllPhases,
  getAllPhotos,
  getClients,
  getProject,
  getProjects,
} from "./index";

describe("prototype seed data", () => {
  it("contains one client and one blank draft project", async () => {
    const clientsResult = await getClients();
    const projectsResult = await getProjects();

    expect(clientsResult.ok).toBe(true);
    expect(projectsResult.ok).toBe(true);
    if (!clientsResult.ok || !projectsResult.ok) return;

    expect(clientsResult.data).toHaveLength(1);
    expect(projectsResult.data).toHaveLength(1);
    expect(projectsResult.data[0]).toMatchObject({
      id: "proj-1",
      clientId: "client-1",
      status: "draft",
    });
    expect(projectsResult.data[0].assignedProjectManagerId).toBeUndefined();
  });

  it("has no operational child records", async () => {
    const [phasesResult, gatesResult, deficienciesResult, photosResult] = await Promise.all([
      getAllPhases(),
      getAllGates(),
      getAllDeficiencies(),
      getAllPhotos(),
    ]);

    expect(phasesResult.ok).toBe(true);
    expect(gatesResult.ok).toBe(true);
    expect(deficienciesResult.ok).toBe(true);
    expect(photosResult.ok).toBe(true);
    if (!phasesResult.ok || !gatesResult.ok || !deficienciesResult.ok || !photosResult.ok) return;

    expect(phasesResult.data).toEqual([]);
    expect(gatesResult.data).toEqual([]);
    expect(deficienciesResult.data).toEqual([]);
    expect(photosResult.data).toEqual([]);
  });

  it("returns blank project detail for the seeded project", async () => {
    const result = await getProject("proj-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.project.id).toBe("proj-1");
    expect(result.data.client.id).toBe("client-1");
    expect(result.data.phases).toEqual([]);
    expect(result.data.gates).toEqual([]);
    expect(result.data.deficiencies).toEqual([]);
    expect(result.data.photoEvidence).toEqual([]);
    expect(result.data.auditEvents).toEqual([]);
  });
});
