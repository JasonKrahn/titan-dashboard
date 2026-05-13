import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  archiveProject,
  createUser,
  completeInspection,
  completeSiteCheck,
  deactivateUser,
  getAuditEvents,
  getAllDeficiencies,
  getAllGates,
  getAllPhases,
  getAllPhotos,
  getPhaseMaterials,
  getClients,
  getOutstandingInventoryAuditRequests,
  getProjectEquipment,
  getProjectInventoryPickups,
  getProject,
  getProjects,
  getUsers,
  markPhaseReadyForInspection,
  setCurrentUser,
  updateAtticGate,
  updatePhaseMaterial,
  updatePhaseMaterials,
  updateProjectEquipment,
  updateProjectEquipmentBatch,
  updatePhaseSchedules,
  updateUser,
} from "./index";

describe("prototype seed data", () => {
  beforeAll(() => {
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:test"),
    });
  });

  it("contains seeded projects across all project stages and demo scenarios", async () => {
    setCurrentUser("user-admin");
    const clientsResult = await getClients();
    const projectsResult = await getProjects();

    expect(clientsResult.ok).toBe(true);
    expect(projectsResult.ok).toBe(true);
    if (!clientsResult.ok || !projectsResult.ok) return;

    expect(clientsResult.data.length).toBeGreaterThanOrEqual(5);
    expect(projectsResult.data.length).toBeGreaterThanOrEqual(15);

    const ids = new Set(projectsResult.data.map((project) => project.id));
    expect(Array.from(ids)).toEqual(expect.arrayContaining([
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
      "proj-active-not-started",
      "proj-overdue-clean",
      "proj-stale-clean",
      "proj-ready-finishing-inspection",
      "proj-archived-legacy",
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

    expect(phasesResult.data.length).toBeGreaterThanOrEqual(45);
    expect(gatesResult.data.length).toBeGreaterThanOrEqual(105);
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
      expect(visible.data.every((project) => project.assignedProjectManagerId === pm.id)).toBe(true);
    }
    setCurrentUser("user-admin");
  });

  it("returns stage-appropriate project details for seeded review scenarios", async () => {
    setCurrentUser("user-admin");
    const [draftResult, readyResult, blockedResult, failedResult, readyCompleteResult, completedResult, archivedResult] = await Promise.all([
      getProject("proj-draft-new-home"),
      getProject("proj-ready-inspection"),
      getProject("proj-site-blocked"),
      getProject("proj-failed-inspection"),
      getProject("proj-ready-complete"),
      getProject("proj-completed-archiveable"),
      getProject("proj-archived-history"),
    ]);

    expect(draftResult.ok).toBe(true);
    expect(readyResult.ok).toBe(true);
    expect(blockedResult.ok).toBe(true);
    expect(failedResult.ok).toBe(true);
    expect(readyCompleteResult.ok).toBe(true);
    expect(completedResult.ok).toBe(true);
    expect(archivedResult.ok).toBe(true);
    if (!draftResult.ok || !readyResult.ok || !blockedResult.ok || !failedResult.ok || !readyCompleteResult.ok || !completedResult.ok || !archivedResult.ok) return;

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

    expect(readyCompleteResult.data.project.status).toBe("completed");
    expect(readyCompleteResult.data.project.completedAt).toBeTruthy();
    expect(readyCompleteResult.data.phases.every((phase) => phase.status === "closed")).toBe(true);
    expect(readyCompleteResult.data.gates.find((gate) => gate.type === "attic_check")?.status).toBe("passed");
    expect(readyCompleteResult.data.auditEvents.some((event) => event.action === "complete_project")).toBe(true);

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
    expect(Array.from(new Set(missingAttic.data.map((project) => project.id)))).toEqual(expect.arrayContaining([
      "proj-active-insulation",
      "proj-ready-inspection",
      "proj-site-blocked",
      "proj-failed-inspection",
      "proj-deficiency-rework",
      "proj-finishing-active",
      "proj-active-not-started",
    ]));
  });

  it("seeds default inventory pickups and outstanding audit requests for demos", async () => {
    setCurrentUser("user-admin");

    const finishingPickups = await getProjectInventoryPickups("proj-finishing-active");
    const readyPickups = await getProjectInventoryPickups("proj-ready-inspection");
    const overduePickups = await getProjectInventoryPickups("proj-overdue-clean");

    expect(finishingPickups.ok).toBe(true);
    expect(readyPickups.ok).toBe(true);
    expect(overduePickups.ok).toBe(true);
    if (!finishingPickups.ok || !readyPickups.ok || !overduePickups.ok) return;

    expect(finishingPickups.data.some((pickup) => pickup.items.some((item) => item.kind === "material") && pickup.items.some((item) => item.kind === "equipment"))).toBe(true);
    expect(readyPickups.data.some((pickup) => pickup.items.every((item) => item.kind === "material"))).toBe(true);
    expect(overduePickups.data.some((pickup) => pickup.note?.includes("Full closeout"))).toBe(true);

    setCurrentUser("user-inventory-1");
    const requests = await getOutstandingInventoryAuditRequests();
    expect(requests.ok).toBe(true);
    if (!requests.ok) return;
    expect(requests.data).toEqual(expect.arrayContaining([
      expect.objectContaining({
        projectId: "proj-ready-finishing-inspection",
        type: "inventory_audit_request",
        metadata: expect.objectContaining({ auditRequestType: "both" }),
      }),
    ]));

    setCurrentUser("user-admin");
  });

  it("updates cascaded phase schedules atomically", async () => {
    setCurrentUser("user-pm-2");

    const result = await updatePhaseSchedules({
      projectId: "proj-active-insulation",
      changes: [
        {
          phaseId: "proj-active-insulation-phase-insulation",
          scheduledStart: "2026-05-01",
          scheduledEnd: "2026-05-10",
        },
        {
          phaseId: "proj-active-insulation-phase-drywall",
          scheduledStart: "2026-05-10",
          scheduledEnd: "2026-05-16",
        },
        {
          phaseId: "proj-active-insulation-phase-finishing",
          scheduledStart: "2026-05-16",
          scheduledEnd: "2026-05-22",
        },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.map((phase) => [phase.id, phase.scheduledStart, phase.scheduledEnd])).toEqual([
      ["proj-active-insulation-phase-insulation", "2026-05-01", "2026-05-10"],
      ["proj-active-insulation-phase-drywall", "2026-05-10", "2026-05-16"],
      ["proj-active-insulation-phase-finishing", "2026-05-16", "2026-05-22"],
    ]);
  });

  it("rejects batch schedule updates outside project bounds", async () => {
    setCurrentUser("user-pm-2");

    const result = await updatePhaseSchedules({
      projectId: "proj-active-insulation",
      changes: [
        {
          phaseId: "proj-active-insulation-phase-finishing",
          scheduledStart: "2099-05-16",
          scheduledEnd: "2099-05-22",
        },
      ],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("VALIDATION_ERROR");
  });

  it("blocks PM schedule updates for unassigned projects", async () => {
    setCurrentUser("user-pm-1");

    const result = await updatePhaseSchedules({
      projectId: "proj-active-insulation",
      changes: [
        {
          phaseId: "proj-active-insulation-phase-insulation",
          scheduledStart: "2026-05-01",
          scheduledEnd: "2026-05-10",
        },
      ],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("FORBIDDEN");
  });

  it("blocks schedule updates for completed or archived projects", async () => {
    setCurrentUser("user-admin");

    const result = await updatePhaseSchedules({
      projectId: "proj-completed-archiveable",
      changes: [
        {
          phaseId: "proj-completed-archiveable-phase-insulation",
          scheduledStart: "2026-05-01",
          scheduledEnd: "2026-05-10",
        },
      ],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("STATE_VIOLATION");
  });

  it("enforces project manager visibility for seeded projects", async () => {
    setCurrentUser("user-pm-1");
    const pmOneProjects = await getProjects();
    const forbidden = await getProject("proj-active-insulation");

    expect(pmOneProjects.ok).toBe(true);
    if (!pmOneProjects.ok) return;
    expect(pmOneProjects.data.length).toBeGreaterThanOrEqual(5);
    expect(pmOneProjects.data.every((project) => project.assignedProjectManagerId === "user-pm-1")).toBe(true);
    expect(forbidden.ok).toBe(false);
    if (forbidden.ok) return;
    const forbiddenErr = forbidden as Extract<typeof forbidden, { ok: false }>;
    expect(forbiddenErr.error.code).toBe("FORBIDDEN");

    setCurrentUser("user-pm-2");
    const pmTwoProjects = await getProjects();
    expect(pmTwoProjects.ok).toBe(true);
    if (!pmTwoProjects.ok) return;
    expect(pmTwoProjects.data.length).toBeGreaterThanOrEqual(5);
    expect(pmTwoProjects.data.every((project) => project.assignedProjectManagerId === "user-pm-2")).toBe(true);

    setCurrentUser("user-admin");
  });

  it("reads and updates phase material logs through the prototype adapter", async () => {
    setCurrentUser("user-admin");

    const initial = await getPhaseMaterials("proj-active-insulation-phase-insulation");
    expect(initial.ok).toBe(true);
    if (!initial.ok) return;
    expect(initial.data.some((log) => log.itemKey === "r20_batt")).toBe(true);

    const updated = await updatePhaseMaterial({
      phaseId: "proj-active-insulation-phase-insulation",
      projectId: "proj-active-insulation",
      itemKey: "r20_batt",
      quantity: 42.5,
    });

    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.data).toMatchObject({
      phaseId: "proj-active-insulation-phase-insulation",
      projectId: "proj-active-insulation",
      itemKey: "r20_batt",
      quantity: 42.5,
    });
    expect(Number.isNaN(Date.parse(updated.data.updatedAt))).toBe(false);

    const created = await updatePhaseMaterial({
      phaseId: "proj-active-insulation-phase-insulation",
      projectId: "proj-active-insulation",
      itemKey: "red_tuck_tape",
      quantity: 6,
    });

    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.data.id).toBe("material-proj-active-insulation-phase-insulation-red_tuck_tape");
    expect(created.data.quantity).toBe(6);
  });

  it("reads and updates project equipment logs through the prototype adapter", async () => {
    setCurrentUser("user-admin");

    const initial = await getProjectEquipment("proj-active-insulation");
    expect(initial.ok).toBe(true);
    if (!initial.ok) return;
    expect(initial.data.some((log) => log.itemKey === "baker_scaffold")).toBe(true);

    const updated = await updateProjectEquipment({
      projectId: "proj-active-insulation",
      itemKey: "drywall_lift",
      quantity: 1,
    });

    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.data).toMatchObject({
      projectId: "proj-active-insulation",
      itemKey: "drywall_lift",
      quantity: 1,
    });
    expect(Number.isNaN(Date.parse(updated.data.updatedAt))).toBe(false);
  });

  it("creates one summarized activity event for batch material and hardware saves", async () => {
    setCurrentUser("user-admin");

    const materialEventsBefore = await getAuditEvents();
    expect(materialEventsBefore.ok).toBe(true);
    if (!materialEventsBefore.ok) return;
    const materialCountBefore = materialEventsBefore.data.filter((event) => event.action === "materials_updated").length;

    const materialUpdate = await updatePhaseMaterials({
      phaseId: "proj-active-insulation-phase-insulation",
      projectId: "proj-active-insulation",
      changes: [
        { itemKey: "r20_batt", quantity: 44 },
        { itemKey: "red_tuck_tape", quantity: 7 },
      ],
    });

    expect(materialUpdate.ok).toBe(true);
    if (!materialUpdate.ok) return;
    expect(materialUpdate.data).toHaveLength(2);

    const phaseDetail = await getProject("proj-active-insulation");
    expect(phaseDetail.ok).toBe(true);
    if (!phaseDetail.ok) return;
    const materialEvent = phaseDetail.data.auditEvents.find((event) => event.action === "materials_updated");
    expect(materialEvent).toMatchObject({
      entityType: "phase",
      entityId: "proj-active-insulation-phase-insulation",
      actorUserId: "user-admin",
    });
    expect((materialEvent?.metadata?.inventoryChanges as unknown[] | undefined)?.length).toBe(2);

    const materialEventsAfter = await getAuditEvents();
    expect(materialEventsAfter.ok).toBe(true);
    if (!materialEventsAfter.ok) return;
    expect(materialEventsAfter.data.filter((event) => event.action === "materials_updated")).toHaveLength(materialCountBefore + 1);

    const hardwareEventsBefore = materialEventsAfter.data.filter((event) => event.action === "hardware_updated").length;
    const hardwareUpdate = await updateProjectEquipmentBatch({
      projectId: "proj-active-insulation",
      changes: [
        { itemKey: "drywall_lift", quantity: 2 },
        { itemKey: "site_lighting", quantity: 3 },
      ],
    });

    expect(hardwareUpdate.ok).toBe(true);
    if (!hardwareUpdate.ok) return;
    expect(hardwareUpdate.data).toHaveLength(2);

    const projectDetail = await getProject("proj-active-insulation");
    expect(projectDetail.ok).toBe(true);
    if (!projectDetail.ok) return;
    const hardwareEvent = projectDetail.data.auditEvents.find((event) => event.action === "hardware_updated");
    expect(hardwareEvent).toMatchObject({
      entityType: "project",
      entityId: "proj-active-insulation",
      actorUserId: "user-admin",
    });
    expect((hardwareEvent?.metadata?.inventoryChanges as unknown[] | undefined)?.length).toBe(2);

    const hardwareEventsAfter = await getAuditEvents();
    expect(hardwareEventsAfter.ok).toBe(true);
    if (!hardwareEventsAfter.ok) return;
    expect(hardwareEventsAfter.data.filter((event) => event.action === "hardware_updated")).toHaveLength(hardwareEventsBefore + 1);
  });

  it("enforces project manager visibility for material and equipment logs", async () => {
    setCurrentUser("user-pm-1");

    const materials = await getPhaseMaterials("proj-active-insulation-phase-insulation");
    const materialUpdate = await updatePhaseMaterial({
      phaseId: "proj-active-insulation-phase-insulation",
      projectId: "proj-active-insulation",
      itemKey: "r20_batt",
      quantity: 12,
    });
    const equipment = await getProjectEquipment("proj-active-insulation");
    const equipmentUpdate = await updateProjectEquipment({
      projectId: "proj-active-insulation",
      itemKey: "baker_scaffold",
      quantity: 2,
    });

    expect(materials.ok).toBe(false);
    expect(materialUpdate.ok).toBe(false);
    expect(equipment.ok).toBe(false);
    expect(equipmentUpdate.ok).toBe(false);
    if (materials.ok || materialUpdate.ok || equipment.ok || equipmentUpdate.ok) return;
    expect(materials.error.code).toBe("FORBIDDEN");
    expect(materialUpdate.error.code).toBe("FORBIDDEN");
    expect(equipment.error.code).toBe("FORBIDDEN");
    expect(equipmentUpdate.error.code).toBe("FORBIDDEN");

    setCurrentUser("user-admin");
  });

  it("validates material and equipment log updates", async () => {
    setCurrentUser("user-admin");

    const mismatchedProject = await updatePhaseMaterial({
      phaseId: "proj-active-insulation-phase-insulation",
      projectId: "proj-ready-inspection",
      itemKey: "r20_batt",
      quantity: 1,
    });
    const blankMaterial = await updatePhaseMaterial({
      phaseId: "proj-active-insulation-phase-insulation",
      projectId: "proj-active-insulation",
      itemKey: " ",
      quantity: 1,
    });
    const invalidEquipment = await updateProjectEquipment({
      projectId: "proj-active-insulation",
      itemKey: "baker_scaffold",
      quantity: Number.POSITIVE_INFINITY,
    });

    expect(mismatchedProject.ok).toBe(false);
    expect(blankMaterial.ok).toBe(false);
    expect(invalidEquipment.ok).toBe(false);
    if (mismatchedProject.ok || blankMaterial.ok || invalidEquipment.ok) return;
    expect(mismatchedProject.error.code).toBe("VALIDATION_ERROR");
    expect(blankMaterial.error.fieldErrors?.itemKey).toBe("Required");
    expect(invalidEquipment.error.fieldErrors?.quantity).toBe("Must be a non-negative finite number");
  });

  it("blocks unsafe user deactivation scenarios", async () => {
    setCurrentUser("user-admin");

    const selfRemoval = await deactivateUser("user-admin");
    expect(selfRemoval.ok).toBe(false);
    if (selfRemoval.ok) return;
    expect(selfRemoval.error.code).toBe("STATE_VIOLATION");

    const assignedPmRemoval = await deactivateUser("user-pm-1");
    expect(assignedPmRemoval.ok).toBe(false);
    if (assignedPmRemoval.ok) return;
    expect(assignedPmRemoval.error.code).toBe("STATE_VIOLATION");
  });

  it("keeps user management admin-only", async () => {
    setCurrentUser("user-pm-1");

    const createResult = await createUser({
      email: "blocked-create@titanpm.io",
      fullName: "Blocked Create",
      role: "project_manager",
    });
    const roleChangeResult = await updateUser("user-pm-1", {
      fullName: "Robert Thompson",
      role: "admin",
    });
    const deactivateResult = await deactivateUser("user-pm-2");

    expect(createResult.ok).toBe(false);
    expect(roleChangeResult.ok).toBe(false);
    expect(deactivateResult.ok).toBe(false);
    if (createResult.ok || roleChangeResult.ok || deactivateResult.ok) return;
    expect(createResult.error.code).toBe("FORBIDDEN");
    expect(roleChangeResult.error.code).toBe("FORBIDDEN");
    expect(deactivateResult.error.code).toBe("FORBIDDEN");

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

  it("lets admins create and update organization members with audit history", async () => {
    setCurrentUser("user-admin");

    const createdPm = await createUser({
      email: "new-pm@titanpm.io",
      fullName: "New Project Manager",
      role: "project_manager",
      phone: "555-0199",
    });
    const createdAdmin = await createUser({
      email: "new-admin@titanpm.io",
      fullName: "New Admin",
      role: "admin",
    });

    expect(createdPm.ok).toBe(true);
    expect(createdAdmin.ok).toBe(true);
    if (!createdPm.ok || !createdAdmin.ok) return;
    expect(createdPm.data.active).toBe(true);
    expect(createdAdmin.data.role).toBe("admin");
    expect(createdAdmin.data.adminOverviewEnabled).toBe(false);

    const roleChange = await updateUser(createdPm.data.id, {
      fullName: "Promoted Member",
      phone: "555-0200",
      role: "admin",
    });

    expect(roleChange.ok).toBe(true);
    if (!roleChange.ok) return;
    expect(roleChange.data.role).toBe("admin");
    expect(roleChange.data.fullName).toBe("Promoted Member");

    const auditResult = await getAuditEvents({ entityType: "user", entityId: createdPm.data.id });
    expect(auditResult.ok).toBe(true);
    if (!auditResult.ok) return;
    expect(auditResult.data.some((event) => event.action === "role_changed")).toBe(true);
  });

  it("has valid seed phase schedules within project bounds", async () => {
    setCurrentUser("user-admin");
    const [projectsResult, phasesResult] = await Promise.all([
      getProjects(),
      getAllPhases(),
    ]);

    expect(projectsResult.ok).toBe(true);
    expect(phasesResult.ok).toBe(true);
    if (!projectsResult.ok || !phasesResult.ok) return;

    const projectsById = new Map(projectsResult.data.map((p) => [p.id, p]));

    for (const phase of phasesResult.data) {
      const start = phase.scheduledStart;
      const end = phase.scheduledEnd;
      if (start && end) {
        expect(new Date(start).getTime()).toBeLessThan(new Date(end).getTime());
      }

      const project = projectsById.get(phase.projectId);
      if (project?.scheduledStart && project?.scheduledEnd && start && end) {
        const phaseStartMs = new Date(start).getTime();
        const phaseEndMs = new Date(end).getTime();
        const projStartMs = new Date(project.scheduledStart).getTime();
        const projEndMs = new Date(project.scheduledEnd).getTime();
        expect(phaseStartMs).toBeGreaterThanOrEqual(projStartMs);
        expect(phaseEndMs).toBeLessThanOrEqual(projEndMs);
      }
    }
  });

  it("allows the completed ready-complete seed scenario to be archived", async () => {
    setCurrentUser("user-pm-2");

    const result = await archiveProject("proj-ready-complete");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.status).toBe("archived");

    setCurrentUser("user-admin");
  });
});
