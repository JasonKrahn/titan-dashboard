import { describe, expect, it } from "vitest";
import { buildProjectCsv } from "./projectExport";
import type { ProjectDetail } from "@/lib/types";

const detail: ProjectDetail = {
  project: {
    id: "proj-1",
    clientId: "client-1",
    projectNumber: "TP-2026-001",
    name: "Oak Bend",
    siteAddress: "14 Oak Bend Way",
    status: "archived",
    assignedProjectManagerId: "user-pm-1",
    scheduledStart: "2026-05-01",
    scheduledEnd: "2026-05-31",
    atticCheckStatus: "passed",
    finishLevel: 4,
    completedAt: "2026-05-31T12:00:00.000Z",
    notes: "Archive-ready notes",
    notesLastEditedBy: "user-pm-1",
    notesLastEditedAt: "2026-05-30T12:00:00.000Z",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-31T12:00:00.000Z",
  },
  client: {
    id: "client-1",
    name: "Acme Homes",
    primaryContactName: "Alex Acme",
    phone: "555-0101",
    email: "alex@example.com",
    billingAddress: "100 Billing Rd",
    notes: "Preferred client",
    archived: false,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-02T00:00:00.000Z",
  },
  assignedProjectManager: {
    id: "user-pm-1",
    role: "project_manager",
    fullName: "Pat Manager",
    email: "pat@example.com",
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  },
  phases: [
    {
      id: "phase-insulation",
      projectId: "proj-1",
      type: "insulation",
      status: "closed",
      scheduledStart: "2026-05-01",
      scheduledEnd: "2026-05-10",
      closedAt: "2026-05-10T12:00:00.000Z",
      assignedSubcontractorId: "sub-1",
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-10T12:00:00.000Z",
    },
  ],
  gates: [
    {
      id: "gate-attic",
      projectId: "proj-1",
      phaseId: "phase-insulation",
      type: "attic_check",
      status: "passed",
      completedByUserId: "user-pm-1",
      completedAt: "2026-05-10T11:00:00.000Z",
      requiredPhotoEvidence: true,
      notes: "Attic complete",
      callInDate: "2026-05-09",
      installDate: "2026-05-10",
      callInSubcontractorId: "sub-1",
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-10T11:00:00.000Z",
    },
  ],
  deficiencies: [
    {
      id: "def-1",
      projectId: "proj-1",
      phaseId: "phase-insulation",
      title: "Air sealing gap",
      description: "North wall gap",
      severity: "medium",
      status: "resolved",
      assignedSubcontractorId: "sub-1",
      resolvedAt: "2026-05-11T00:00:00.000Z",
      resolvedByUserId: "user-pm-1",
      createdAt: "2026-05-10T00:00:00.000Z",
      updatedAt: "2026-05-11T00:00:00.000Z",
    },
  ],
  photoEvidence: [
    {
      id: "photo-1",
      projectId: "proj-1",
      phaseId: "phase-insulation",
      gateId: "gate-attic",
      purpose: "attic_check",
      objectKey: "photos/photo-1.jpg",
      contentHash: "hash-1",
      mimeType: "image/jpeg",
      fileSizeBytes: 12345,
      status: "confirmed",
      uploadedByUserId: "user-pm-1",
      createdAt: "2026-05-10T00:00:00.000Z",
      updatedAt: "2026-05-10T00:00:00.000Z",
    },
  ],
  subcontractors: [
    {
      id: "sub-1",
      displayName: "Sam Sub",
      companyName: "Sub Co",
      trade: "insulation",
      phone: "555-0202",
      email: "sam@example.com",
      active: true,
      notes: "Primary insulation crew",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    },
    {
      id: "sub-unreferenced",
      displayName: "Unused Sub",
      trade: "drywall",
      active: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    },
  ],
  auditEvents: [
    {
      id: "audit-materials",
      entityType: "phase",
      entityId: "phase-insulation",
      action: "materials_updated",
      actorUserId: "user-pm-1",
      metadata: {
        inventoryChanges: [
          { itemKey: "r20_batt", label: "R-20 Batts", previousQuantity: 3, quantity: 4 },
        ],
      },
      createdAt: "2026-05-13T10:00:00.000Z",
    },
    {
      id: "audit-pickup",
      entityType: "project",
      entityId: "proj-1",
      action: "inventory_picked_up",
      actorUserId: "user-inventory-1",
      metadata: {
        pickupId: "pickup-1",
        summary: "Baker Scaffolds ×1",
        note: "North side",
      },
      createdAt: "2026-05-13T11:00:00.000Z",
    },
  ],
};

describe("buildProjectCsv", () => {
  it("exports project information sections and inventory details", () => {
    const csv = buildProjectCsv(detail, detail.client, detail.assignedProjectManager, {
      equipmentLogs: [
        {
          id: "equipment-1",
          projectId: "proj-1",
          itemKey: "baker_scaffold",
          quantity: 2,
          updatedAt: "2026-05-12T00:00:00.000Z",
        },
      ],
      materialLogs: [
        {
          id: "material-1",
          projectId: "proj-1",
          phaseId: "phase-insulation",
          itemKey: "r20_batt",
          quantity: 4,
          updatedAt: "2026-05-12T00:00:00.000Z",
        },
      ],
      inventoryPickups: [
        {
          id: "pickup-1",
          projectId: "proj-1",
          pickedUpByUserId: "user-inventory-1",
          items: [
            { kind: "equipment", itemKey: "baker_scaffold", quantity: 1 },
            { kind: "material", itemKey: "r20_batt", quantity: 2 },
          ],
          note: "North side",
          createdAt: "2026-05-13T11:00:00.000Z",
        },
      ],
    });

    expect(csv).toContain("SECTION,PROJECT DETAILS");
    expect(csv).toContain("Archive-ready notes");
    expect(csv).toContain("SECTION,CLIENT DETAILS");
    expect(csv).toContain("Acme Homes");
    expect(csv).toContain("SECTION,PHASES");
    expect(csv).toContain("phase-insulation,insulation,closed");
    expect(csv).toContain("SECTION,GATES");
    expect(csv).toContain("gate-attic,phase-insulation,attic_check,passed");
    expect(csv).toContain("SECTION,DEFICIENCIES");
    expect(csv).toContain("Air sealing gap");
    expect(csv).toContain("SECTION,PHOTO EVIDENCE");
    expect(csv).toContain("photo-1,phase-insulation,gate-attic,,attic_check");
    expect(csv).toContain("SECTION,SUBCONTRACTORS");
    expect(csv).toContain("Sam Sub");
    expect(csv).not.toContain("Unused Sub");
    expect(csv).toContain("SECTION,PROJECT EQUIPMENT");
    expect(csv).toContain("equipment-1,baker_scaffold,Baker Scaffolds,2");
    expect(csv).toContain("SECTION,PHASE MATERIALS");
    expect(csv).toContain("material-1,phase-insulation,insulation,r20_batt,R-20 Batts,4");
    expect(csv).toContain("SECTION,INVENTORY PICKUPS");
    expect(csv).toContain("pickup-1,user-inventory-1,2026-05-13T11:00:00.000Z,equipment,baker_scaffold,Baker Scaffolds,1,North side");
    expect(csv).toContain("pickup-1,user-inventory-1,2026-05-13T11:00:00.000Z,material,r20_batt,R-20 Batts,2,North side");
  });

  it("exports activity metadata for audit events", () => {
    const csv = buildProjectCsv(detail, detail.client, detail.assignedProjectManager);

    expect(csv).toContain("SECTION,ACTIVITY LOG");
    expect(csv).toContain("Event ID,Timestamp,Actor ID,Entity Type,Entity ID,Action,Previous Value,Next Value,Metadata");
    expect(csv).toContain("audit-pickup");
    expect(csv).toContain("inventory_picked_up");
    expect(csv).toContain("pickup-1");
    expect(csv).toContain("Baker Scaffolds ×1");
    expect(csv).toContain("inventoryChanges");
    expect(csv).toContain("R-20 Batts");
  });
});
