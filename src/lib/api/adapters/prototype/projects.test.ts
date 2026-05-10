import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  completeInspection,
  completeSiteCheck,
  getAuditEvents,
  getAllDeficiencies,
  getAllGates,
  getAllPhases,
  getAllPhotos,
  getClients,
  getProject,
  getProjects,
  getUsers,
  markPhaseReadyForInspection,
  setCurrentUser,
  updateAtticGate,
} from "./index";

describe("prototype seed data", () => {
  beforeAll(() => {
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:test"),
    });
  });

  it("contains exactly 10 seeded projects across all project stages", async () => {
    setCurrentUser("user-admin");
    const clientsResult = await getClients();
    const projectsResult = await getProjects();

    expect(clientsResult.ok).toBe(true);
    expect(projectsResult.ok).toBe(true);
    if (!clientsResult.ok || !projectsResult.ok) return;

    expect(clientsResult.data.length).toBeGreaterThanOrEqual(4);
    expect(projectsResult.data).toHaveLength(10);

    const ids = new Set(projectsResult.data.map((project) => project.id));
    expect(ids).toEqual(new Set([
      "proj-draft-new-home",
      "proj-active-insulation",
      "proj-ready-inspection",
      "proj-site-blocked",
      "proj-failed-inspection",
      "proj-deficiency-rework",
      "proj-finishing-active",
      "proj-ready-complete",
      "proj-completed-archiveable",
      "proj-archived-history",
    ]));

    expect(new Set(projectsResult.data.map((project) => project.status))).toEqual(
      new Set(["draft", "active", "completed", "archived"]),
    );
  });

  it("has complete operational child records for every seeded project", async () => {
    setCurrentUser("user-admin");
    const [phasesResult, gatesResult, deficienciesResult, photosResult, usersResult, auditResult] = await Promise.all([
      getAllPhases(),
      getAllGates(),
      getAllDeficiencies(),
      getAllPhotos(),
      getUsers(),
      getAuditEvents(),
    ]);

    expect(phasesResult.ok).toBe(true);
    expect(gatesResult.ok).toBe(true);
    expect(deficienciesResult.ok).toBe(true);
    expect(photosResult.ok).toBe(true);
    expect(usersResult.ok).toBe(true);
    expect(auditResult.ok).toBe(true);
    if (!phasesResult.ok || !gatesResult.ok || !deficienciesResult.ok || !photosResult.ok || !usersResult.ok || !auditResult.ok) return;

    expect(phasesResult.data).toHaveLength(30);
    expect(gatesResult.data).toHaveLength(70);
    expect(auditResult.data.length).toBeGreaterThanOrEqual(25);

    const photoPurposes = new Set(photosResult.data.map((photo) => photo.purpose));
    expect(photoPurposes).toEqual(new Set([
      "site_check",
      "inspection",
      "attic_check",
      "deficiency_before",
      "deficiency_after",
      "general",
    ]));

    expect(new Set(deficienciesResult.data.map((deficiency) => deficiency.status))).toEqual(
      new Set(["open", "in_progress", "resolved", "closed"]),
    );

    const projectManagers = usersResult.data.filter((user) => user.role === "project_manager" && user.active);
    for (const pm of projectManagers) {
      setCurrentUser(pm.id);
      const visible = await getProjects();
      expect(visible.ok).toBe(true);
      if (!visible.ok) return;
      expect(visible.data).toHaveLength(5);
      expect(visible.data.every((project) => project.assignedProjectManagerId === pm.id)).toBe(true);
    }
    setCurrentUser("user-admin");
  });

  it("returns stage-appropriate project details for seeded review scenarios", async () => {
    setCurrentUser("user-admin");
    const [draftResult, readyResult, blockedResult, failedResult, completedResult, archivedResult] = await Promise.all([
      getProject("proj-draft-new-home"),
      getProject("proj-ready-inspection"),
      getProject("proj-site-blocked"),
      getProject("proj-failed-inspection"),
      getProject("proj-completed-archiveable"),
      getProject("proj-archived-history"),
    ]);

    expect(draftResult.ok).toBe(true);
    expect(readyResult.ok).toBe(true);
    expect(blockedResult.ok).toBe(true);
    expect(failedResult.ok).toBe(true);
    expect(completedResult.ok).toBe(true);
    expect(archivedResult.ok).toBe(true);
    if (!draftResult.ok || !readyResult.ok || !blockedResult.ok || !failedResult.ok || !completedResult.ok || !archivedResult.ok) return;

    expect(draftResult.data.project.status).toBe("draft");
    expect(draftResult.data.phases).toHaveLength(3);
    expect(draftResult.data.phases.every((phase) => phase.status === "not_started")).toBe(true);
    expect(draftResult.data.gates).toHaveLength(7);
    expect(draftResult.data.gates.every((gate) => gate.status === "not_started")).toBe(true);

    expect(readyResult.data.phases.some((phase) => phase.status === "ready_for_inspection")).toBe(true);
    expect(blockedResult.data.phases.some((phase) => phase.status === "blocked")).toBe(true);
    expect(blockedResult.data.gates.some((gate) => gate.status === "blocked")).toBe(true);
    expect(failedResult.data.gates.some((gate) => gate.type === "inspection" && gate.status === "failed")).toBe(true);
    expect(failedResult.data.deficiencies.some((deficiency) => deficiency.severity === "critical" && deficiency.status === "open")).toBe(true);

    expect(completedResult.data.project.status).toBe("completed");
    expect(completedResult.data.phases.every((phase) => phase.status === "closed")).toBe(true);
    const completedAtticGate = completedResult.data.gates.find((gate) => gate.type === "attic_check");
    expect(completedAtticGate?.status).toBe("passed");
    const hasConfirmedAtticEvidence = completedResult.data.photoEvidence.some(
      (photo) => photo.purpose === "attic_check" && photo.status === "confirmed",
    );
    expect(hasConfirmedAtticEvidence).toBe(true);

    expect(archivedResult.data.project.status).toBe("archived");
  });

  it("supports blocked-work and missing-attic-evidence dashboard filters", async () => {
    setCurrentUser("user-admin");

    const blocked = await getProjects({ hasBlockedWork: true });
    const missingAttic = await getProjects({ missingAtticEvidence: true });

    expect(blocked.ok).toBe(true);
    expect(missingAttic.ok).toBe(true);
    if (!blocked.ok || !missingAttic.ok) return;

    expect(new Set(blocked.data.map((project) => project.id))).toEqual(new Set(["proj-site-blocked", "proj-failed-inspection"]));
    expect(new Set(missingAttic.data.map((project) => project.id))).toEqual(
      new Set(["proj-active-insulation", "proj-ready-inspection", "proj-site-blocked", "proj-failed-inspection", "proj-deficiency-rework", "proj-finishing-active"]),
    );
  });

  it("enforces project manager visibility for seeded projects", async () => {
    setCurrentUser("user-pm-1");
    const pmOneProjects = await getProjects();
    const forbidden = await getProject("proj-active-insulation");

    expect(pmOneProjects.ok).toBe(true);
    if (!pmOneProjects.ok) return;
    expect(pmOneProjects.data).toHaveLength(5);
    expect(pmOneProjects.data.every((project) => project.assignedProjectManagerId === "user-pm-1")).toBe(true);
    expect(forbidden.ok).toBe(false);
    if (forbidden.ok) return;
    const forbiddenErr = forbidden as Extract<typeof forbidden, { ok: false }>;
    expect(forbiddenErr.error.code).toBe("FORBIDDEN");

    setCurrentUser("user-pm-2");
    const pmTwoProjects = await getProjects();
    expect(pmTwoProjects.ok).toBe(true);
    if (!pmTwoProjects.ok) return;
    expect(pmTwoProjects.data).toHaveLength(5);
    expect(pmTwoProjects.data.every((project) => project.assignedProjectManagerId === "user-pm-2")).toBe(true);

    setCurrentUser("user-admin");
  });

  it("promotes an active project to completed when the attic gate is the last remaining requirement", async () => {
    setCurrentUser("user-pm-2");
    const file = new File(["attic"], "attic.jpg", { type: "image/jpeg" });

    await markPhaseReadyForInspection({
      projectId: "proj-active-insulation",
      phaseId: "proj-active-insulation-phase-insulation",
    });
    await completeInspection({
      gateId: "proj-active-insulation-gate-insulation-inspection",
      phaseId: "proj-active-insulation-phase-insulation",
      projectId: "proj-active-insulation",
      passed: true,
      inspectorName: "Inspector One",
      inspectionDate: new Date().toISOString(),
    });
    await completeSiteCheck({
      gateId: "proj-active-insulation-gate-drywall-site-check",
      phaseId: "proj-active-insulation-phase-drywall",
      projectId: "proj-active-insulation",
    });
    await markPhaseReadyForInspection({
      projectId: "proj-active-insulation",
      phaseId: "proj-active-insulation-phase-drywall",
    });
    await completeInspection({
      gateId: "proj-active-insulation-gate-drywall-inspection",
      phaseId: "proj-active-insulation-phase-drywall",
      projectId: "proj-active-insulation",
      passed: true,
      inspectorName: "Inspector One",
      inspectionDate: new Date().toISOString(),
    });
    await completeSiteCheck({
      gateId: "proj-active-insulation-gate-finishing-site-check",
      phaseId: "proj-active-insulation-phase-finishing",
      projectId: "proj-active-insulation",
    });
    await markPhaseReadyForInspection({
      projectId: "proj-active-insulation",
      phaseId: "proj-active-insulation-phase-finishing",
    });
    await completeInspection({
      gateId: "proj-active-insulation-gate-finishing-inspection",
      phaseId: "proj-active-insulation-phase-finishing",
      projectId: "proj-active-insulation",
      passed: true,
      inspectorName: "Inspector One",
      inspectionDate: new Date().toISOString(),
    });

    const beforeAttic = await getProject("proj-active-insulation");
    expect(beforeAttic.ok).toBe(true);
    if (!beforeAttic.ok) return;
    expect(beforeAttic.data.project.status).toBe("active");

    const atticResult = await updateAtticGate({
      gateId: "proj-active-insulation-gate-attic",
      projectId: "proj-active-insulation",
      installDate: new Date().toISOString(),
      photo: file,
    });

    expect(atticResult.ok).toBe(true);

    const afterAttic = await getProject("proj-active-insulation");
    expect(afterAttic.ok).toBe(true);
    if (!afterAttic.ok) return;
    expect(afterAttic.data.project.status).toBe("completed");
    expect(afterAttic.data.project.completedAt).toBeTruthy();
    setCurrentUser("user-admin");
  });
});
