import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  archiveProject,
  createPhaseChecklistItem,
  createProject,
  createUser,
  createInventoryPickup,
  completeInspection,
  completeSiteCheck,
  deletePhaseChecklistItem,
  deactivateUser,
  getAuditEvents,
  getAllDeficiencies,
  getAllGates,
  getAllPhases,
  getAllPhotos,
  getPhase,
  getPhaseMaterials,
  getClients,
  getCompanyHardwareStock,
  getOutstandingInventoryAuditRequests,
  getProjectEquipment,
  getProjectInventoryPickups,
  getProject,
  getProjects,
  getUsers,
  markPhaseReadyForInspection,
  resetPrototypeSeed,
  setCurrentUser,
  updateAtticGate,
  updatePhaseChecklistItem,
  updatePhaseMaterial,
  updatePhaseMaterials,
  updateCompanyHardwareStock,
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

  beforeEach(() => {
    resetPrototypeSeed();
    setCurrentUser("user-admin");
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
          scheduledStart: "2026-05-03",
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
      ["proj-active-insulation-phase-insulation", "2026-05-03", "2026-05-10"],
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

  it("lets admins manage company hardware totals without dropping below allocated stock", async () => {
    setCurrentUser("user-admin");
    const stockBefore = await getCompanyHardwareStock();
    expect(stockBefore.ok).toBe(true);
    if (!stockBefore.ok) return;

    const bakerStock = stockBefore.data.find((item) => item.itemKey === "baker_scaffold");
    expect(bakerStock).toBeDefined();
    if (!bakerStock) return;

    const allowedTotal = bakerStock.allocatedQuantity + 1;
    const updated = await updateCompanyHardwareStock({
      itemKey: "baker_scaffold",
      totalQuantity: allowedTotal,
    });
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.data).toMatchObject({
      itemKey: "baker_scaffold",
      totalQuantity: allowedTotal,
      allocatedQuantity: bakerStock.allocatedQuantity,
      availableQuantity: 1,
    });

    const blocked = await updateCompanyHardwareStock({
      itemKey: "baker_scaffold",
      totalQuantity: bakerStock.allocatedQuantity - 1,
    });
    expect(blocked.ok).toBe(false);
    if (blocked.ok) return;
    expect(blocked.error.code).toBe("VALIDATION_ERROR");
    expect(blocked.error.fieldErrors?.totalQuantity).toContain("allocated");
  });

  it("enforces company hardware availability for project equipment increases while allowing reductions", async () => {
    setCurrentUser("user-admin");
    const stock = await updateCompanyHardwareStock({ itemKey: "cross_braces", totalQuantity: 1 });
    expect(stock.ok).toBe(true);

    setCurrentUser("user-pm-2");
    const firstAllocation = await updateProjectEquipmentBatch({
      projectId: "proj-active-insulation",
      changes: [{ itemKey: "cross_braces", quantity: 1 }],
    });
    expect(firstAllocation.ok).toBe(true);

    const overAllocation = await updateProjectEquipmentBatch({
      projectId: "proj-active-insulation",
      changes: [{ itemKey: "cross_braces", quantity: 2 }],
    });
    expect(overAllocation.ok).toBe(false);
    if (overAllocation.ok) return;
    expect(overAllocation.error.code).toBe("VALIDATION_ERROR");
    expect(overAllocation.error.fieldErrors?.cross_braces).toContain("available");

    const reduction = await updateProjectEquipmentBatch({
      projectId: "proj-active-insulation",
      changes: [{ itemKey: "cross_braces", quantity: 0 }],
    });
    expect(reduction.ok).toBe(true);
  });

  it("returns picked up hardware to available company stock immediately", async () => {
    setCurrentUser("user-admin");
    const before = await getCompanyHardwareStock();
    expect(before.ok).toBe(true);
    if (!before.ok) return;

    const siteLightingBefore = before.data.find((item) => item.itemKey === "site_lighting");
    expect(siteLightingBefore).toBeDefined();
    if (!siteLightingBefore) return;

    const totalReset = await updateCompanyHardwareStock({
      itemKey: "site_lighting",
      totalQuantity: siteLightingBefore.allocatedQuantity,
    });
    expect(totalReset.ok).toBe(true);

    setCurrentUser("user-inventory-1");
    const pickup = await createInventoryPickup({
      projectId: "proj-finishing-active",
      items: [{ kind: "equipment", itemKey: "site_lighting", quantity: 1 }],
    });
    expect(pickup.ok).toBe(true);

    setCurrentUser("user-admin");
    const after = await getCompanyHardwareStock();
    expect(after.ok).toBe(true);
    if (!after.ok) return;

    const siteLightingAfter = after.data.find((item) => item.itemKey === "site_lighting");
    expect(siteLightingAfter).toMatchObject({
      itemKey: "site_lighting",
      totalQuantity: siteLightingBefore.allocatedQuantity,
      allocatedQuantity: siteLightingBefore.allocatedQuantity - 1,
      availableQuantity: 1,
    });
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

  it("stores multiple normal gate photos while keeping failed inspection before evidence single-photo", async () => {
    setCurrentUser("user-admin");
    const projectResult = await createProject({
      clientId: "client-1",
      projectNumber: `TP-MULTI-${Date.now()}`,
      name: "Multi photo workflow",
      siteAddress: "100 Evidence Way",
      assignedProjectManagerId: "user-pm-1",
    });
    expect(projectResult.ok).toBe(true);
    if (!projectResult.ok) return;

    const projectId = projectResult.data.id;
    const project = await getProject(projectId);
    expect(project.ok).toBe(true);
    if (!project.ok) return;

    const insulationPhase = project.data.phases.find((phase) => phase.type === "insulation");
    const drywallPhase = project.data.phases.find((phase) => phase.type === "drywall");
    const finishingPhase = project.data.phases.find((phase) => phase.type === "finishing");
    const siteGate = project.data.gates.find((gate) => gate.phaseId === insulationPhase?.id && gate.type === "site_check");
    const passedInspectionGate = project.data.gates.find((gate) => gate.phaseId === drywallPhase?.id && gate.type === "inspection");
    const failedInspectionGate = project.data.gates.find((gate) => gate.phaseId === finishingPhase?.id && gate.type === "inspection");
    expect(insulationPhase && drywallPhase && finishingPhase && siteGate && passedInspectionGate && failedInspectionGate).toBeTruthy();
    if (!insulationPhase || !drywallPhase || !finishingPhase || !siteGate || !passedInspectionGate || !failedInspectionGate) return;

    const sitePhotos = [
      new File(["site one"], "site-one.jpg", { type: "image/jpeg" }),
      new File(["site two"], "site-two.jpg", { type: "image/jpeg" }),
    ];
    const inspectionPhotos = [
      new File(["pass one"], "pass-one.jpg", { type: "image/jpeg" }),
      new File(["pass two"], "pass-two.jpg", { type: "image/jpeg" }),
    ];
    const failedBefore = new File(["before"], "before.jpg", { type: "image/jpeg" });

    const siteResult = await completeSiteCheck({
      gateId: siteGate.id,
      phaseId: insulationPhase.id,
      projectId,
      photos: sitePhotos,
    });
    const passedInspectionResult = await completeInspection({
      gateId: passedInspectionGate.id,
      phaseId: drywallPhase.id,
      projectId,
      passed: true,
      inspectorName: "Inspector One",
      inspectionDate: new Date().toISOString(),
      photos: inspectionPhotos,
    });
    const failedInspectionResult = await completeInspection({
      gateId: failedInspectionGate.id,
      phaseId: finishingPhase.id,
      projectId,
      passed: false,
      inspectorName: "Inspector One",
      inspectionDate: new Date().toISOString(),
      notes: "Missing finish coat before approval.",
      photo: failedBefore,
      photos: [
        failedBefore,
        new File(["ignored"], "ignored.jpg", { type: "image/jpeg" }),
      ],
      deficiencyTitle: "Missing finish coat",
      deficiencyDescription: "Finish coat was not completed before inspection.",
      deficiencySeverity: "medium",
    });

    expect(siteResult.ok).toBe(true);
    expect(passedInspectionResult.ok).toBe(true);
    expect(failedInspectionResult.ok).toBe(true);

    const updated = await getProject(projectId);
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;

    expect(updated.data.photoEvidence.filter((photo) => photo.gateId === siteGate.id && photo.purpose === "site_check")).toHaveLength(2);
    expect(updated.data.photoEvidence.filter((photo) => photo.gateId === passedInspectionGate.id && photo.purpose === "inspection")).toHaveLength(2);
    expect(updated.data.photoEvidence.filter((photo) => photo.gateId === failedInspectionGate.id && photo.purpose === "deficiency_before")).toHaveLength(1);
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
    expect(createdAdmin.data.clientActivityRailEnabled).toBe(false);

    const roleChange = await updateUser(createdPm.data.id, {
      fullName: "Promoted Member",
      phone: "555-0200",
      role: "admin",
      clientActivityRailEnabled: false,
    });

    expect(roleChange.ok).toBe(true);
    if (!roleChange.ok) return;
    expect(roleChange.data.role).toBe("admin");
    expect(roleChange.data.fullName).toBe("Promoted Member");
    expect(roleChange.data.clientActivityRailEnabled).toBe(false);

    const auditResult = await getAuditEvents({ entityType: "user", entityId: createdPm.data.id });
    expect(auditResult.ok).toBe(true);
    if (!auditResult.ok) return;
    expect(auditResult.data.some((event) => event.action === "role_changed")).toBe(true);
  });

  it("returns seeded phase checklist items and persists checklist mutations", async () => {
    setCurrentUser("user-pm-2");

    const detail = await getPhase("proj-active-insulation-phase-insulation");
    expect(detail.ok).toBe(true);
    if (!detail.ok) return;
    expect(detail.data.checklistItems.map((item) => item.text)).toEqual(expect.arrayContaining([
      "Confirm attic baffles are installed at all eaves",
      "Verify vapor barrier lap seals at exterior corners",
    ]));

    const created = await createPhaseChecklistItem({
      projectId: "proj-active-insulation",
      phaseId: "proj-active-insulation-phase-insulation",
      text: "Stage attic card for inspection",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const updated = await updatePhaseChecklistItem({ itemId: created.data.id, completed: true });
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.data.completed).toBe(true);

    const afterUpdate = await getPhase("proj-active-insulation-phase-insulation");
    expect(afterUpdate.ok).toBe(true);
    if (!afterUpdate.ok) return;
    expect(afterUpdate.data.checklistItems.find((item) => item.id === created.data.id)?.completed).toBe(true);

    const deleted = await deletePhaseChecklistItem(created.data.id);
    expect(deleted.ok).toBe(true);

    const afterDelete = await getPhase("proj-active-insulation-phase-insulation");
    expect(afterDelete.ok).toBe(true);
    if (!afterDelete.ok) return;
    expect(afterDelete.data.checklistItems.some((item) => item.id === created.data.id)).toBe(false);

    setCurrentUser("user-admin");
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
        // Use day-level comparison to avoid test order dependency
        const phaseStartDay = start.slice(0, 10);
        const phaseEndDay = end.slice(0, 10);
        const projStartDay = project.scheduledStart.slice(0, 10);
        const projEndDay = project.scheduledEnd.slice(0, 10);
        expect(phaseStartDay >= projStartDay).toBe(true);
        expect(phaseEndDay <= projEndDay).toBe(true);
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

  it("seeds the Randall Homes perfect archive project with full history", async () => {
    setCurrentUser("user-admin");

    // Verify project appears in archived list
    const archived = await getProjects({ status: ["archived"] });
    expect(archived.ok).toBe(true);
    if (!archived.ok) return;
    const randallProject = archived.data.find((p) => p.id === "proj-randall-perfect-archive");
    expect(randallProject).toBeDefined();
    expect(randallProject?.clientId).toBe("client-3");
    expect(randallProject?.name).toBe("Randall Homes Sage Creek Closeout");

    // Verify project details
    const detail = await getProject("proj-randall-perfect-archive");
    expect(detail.ok).toBe(true);
    if (!detail.ok) return;

    // Verify project dates
    expect(detail.data.project.scheduledStart).toBe("2026-02-03");
    expect(detail.data.project.scheduledEnd).toBe("2026-03-20");
    expect(detail.data.project.completedAt).toBe("2026-03-20T17:00:00.000Z");
    expect(detail.data.project.status).toBe("archived");
    expect(detail.data.project.atticCheckStatus).toBe("passed");

    // Verify all three phases are closed
    expect(detail.data.phases).toHaveLength(3);
    expect(detail.data.phases.every((phase) => phase.status === "closed")).toBe(true);

    // Verify every phase has photos
    const phaseIds = detail.data.phases.map((p) => p.id);
    for (const phaseId of phaseIds) {
      const phasePhotos = detail.data.photoEvidence.filter((p) => p.phaseId === phaseId);
      expect(phasePhotos.length).toBeGreaterThan(0);
    }

    // Verify every phase has exactly one closed deficiency with confirmed before and after photos
    expect(detail.data.deficiencies).toHaveLength(3);
    expect(detail.data.deficiencies.every((d) => d.status === "closed")).toBe(true);
    for (const deficiency of detail.data.deficiencies) {
      const beforePhoto = detail.data.photoEvidence.find(
        (p) => p.deficiencyId === deficiency.id && p.purpose === "deficiency_before"
      );
      const afterPhoto = detail.data.photoEvidence.find(
        (p) => p.deficiencyId === deficiency.id && p.purpose === "deficiency_after"
      );
      expect(beforePhoto).toBeDefined();
      expect(beforePhoto?.status).toBe("confirmed");
      expect(afterPhoto).toBeDefined();
      expect(afterPhoto?.status).toBe("confirmed");
    }

    // Verify attic gate is passed with details
    const atticGate = detail.data.gates.find((g) => g.type === "attic_check");
    expect(atticGate?.status).toBe("passed");
    expect(atticGate?.callInDate).toBe("2026-03-15T09:00:00.000Z");
    expect(atticGate?.installDate).toBe("2026-03-19T11:00:00.000Z");
    expect(atticGate?.callInSubcontractorId).toBe("sub-5");
    expect(atticGate?.notes).toContain("Attic hatch installed");

    // Verify attic photos exist
    const atticPhotos = detail.data.photoEvidence.filter(
      (p) => p.gateId === atticGate?.id && p.purpose === "attic_check"
    );
    expect(atticPhotos.length).toBeGreaterThan(0);

    // Verify audit trail includes create, complete, and archive events
    expect(detail.data.auditEvents.some((e) => e.action === "create_project")).toBe(true);
    expect(detail.data.auditEvents.some((e) => e.action === "complete_project")).toBe(true);
    expect(detail.data.auditEvents.some((e) => e.action === "archive_project")).toBe(true);
    expect(detail.data.auditEvents.filter((e) => e.action === "photo_uploaded").length).toBeGreaterThanOrEqual(10);

    // Verify archive inventory and checklist history are complete enough for closeout review
    const equipment = await getProjectEquipment("proj-randall-perfect-archive");
    const pickups = await getProjectInventoryPickups("proj-randall-perfect-archive");
    expect(equipment.ok).toBe(true);
    expect(pickups.ok).toBe(true);
    if (!equipment.ok || !pickups.ok) return;
    expect(equipment.data.filter((log) => log.quantity > 0).length).toBeGreaterThanOrEqual(4);
    expect(pickups.data.length).toBeGreaterThanOrEqual(1);

    const materialResults = await Promise.all(detail.data.phases.map((phase) => getPhaseMaterials(phase.id)));
    expect(materialResults.every((result) => result.ok)).toBe(true);
    const materialLogs = materialResults.flatMap((result) => (result.ok ? result.data : []));
    expect(materialLogs.filter((log) => log.quantity > 0).length).toBeGreaterThanOrEqual(6);

    const phaseDetails = await Promise.all(detail.data.phases.map((phase) => getPhase(phase.id)));
    expect(phaseDetails.every((result) => result.ok)).toBe(true);
    const checklistItems = phaseDetails.flatMap((result) => (result.ok ? result.data.checklistItems : []));
    expect(checklistItems.length).toBeGreaterThanOrEqual(2);
  });
});
