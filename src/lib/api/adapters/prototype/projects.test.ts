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
  it("contains seeded Acme projects across draft, active, and completed stages", async () => {
    const clientsResult = await getClients();
    const projectsResult = await getProjects();

    expect(clientsResult.ok).toBe(true);
    expect(projectsResult.ok).toBe(true);
    if (!clientsResult.ok || !projectsResult.ok) return;

    expect(clientsResult.data.some((client) => client.id === "client-2" && client.name === "Acme Construction")).toBe(true);
    expect(projectsResult.data).toHaveLength(3);

    const ids = new Set(projectsResult.data.map((project) => project.id));
    expect(ids).toEqual(new Set(["proj-acme-draft", "proj-acme-active", "proj-acme-completed"]));

    const statusesById = new Map(projectsResult.data.map((project) => [project.id, project.status]));
    expect(statusesById.get("proj-acme-draft")).toBe("draft");
    expect(statusesById.get("proj-acme-active")).toBe("active");
    expect(statusesById.get("proj-acme-completed")).toBe("completed");
  });

  it("has operational child records for seeded scenarios", async () => {
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

    expect(phasesResult.data).toHaveLength(9);
    expect(gatesResult.data).toHaveLength(21);
    expect(deficienciesResult.data).toEqual([]);
    expect(photosResult.data.length).toBeGreaterThanOrEqual(2);
  });

  it("returns stage-appropriate project detail for each seeded Acme project", async () => {
    const [draftResult, activeResult, completedResult] = await Promise.all([
      getProject("proj-acme-draft"),
      getProject("proj-acme-active"),
      getProject("proj-acme-completed"),
    ]);

    expect(draftResult.ok).toBe(true);
    expect(activeResult.ok).toBe(true);
    expect(completedResult.ok).toBe(true);
    if (!draftResult.ok || !activeResult.ok || !completedResult.ok) return;

    // Draft project has no progressed phases or gates.
    expect(draftResult.data.project.status).toBe("draft");
    expect(draftResult.data.project.clientId).toBe("client-2");
    expect(draftResult.data.phases).toHaveLength(3);
    expect(draftResult.data.phases.every((phase) => phase.status === "not_started")).toBe(true);
    expect(draftResult.data.gates).toHaveLength(7);
    expect(draftResult.data.gates.every((gate) => gate.status === "not_started")).toBe(true);

    // Active project has progressed insulation site check.
    expect(activeResult.data.project.status).toBe("active");
    const activeInsulation = activeResult.data.phases.find((phase) => phase.type === "insulation");
    expect(activeInsulation?.status).toBe("in_progress");
    const activeInsulationSiteCheck = activeResult.data.gates.find(
      (gate) => gate.phaseId === activeInsulation?.id && gate.type === "site_check",
    );
    expect(activeInsulationSiteCheck?.status).toBe("passed");

    // Completed project has all phases closed and attic evidence present.
    expect(completedResult.data.project.status).toBe("completed");
    expect(completedResult.data.phases.every((phase) => phase.status === "closed")).toBe(true);
    const completedAtticGate = completedResult.data.gates.find((gate) => gate.type === "attic_check");
    expect(completedAtticGate?.status).toBe("passed");
    const hasConfirmedAtticEvidence = completedResult.data.photoEvidence.some(
      (photo) => photo.purpose === "attic_check" && photo.status === "confirmed",
    );
    expect(hasConfirmedAtticEvidence).toBe(true);
  });
});
