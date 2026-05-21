import { describe, expect, it } from "vitest";
import type { AuditEvent, Deficiency, Gate, Phase, PhotoEvidence, Project, User } from "@/lib/types";
import { formatAuditEvent, resolveProjectId } from "./audit";

const baseProject: Project = {
  id: "project-1",
  clientId: "client-1",
  projectNumber: "TP-2026-001",
  name: "Acme Cedar Point Villas",
  siteAddress: "123 Main St, Winnipeg, MB R3C 1A3",
  status: "active",
  atticCheckStatus: "not_started",
  createdAt: "2026-05-01T10:00:00.000Z",
  updatedAt: "2026-05-01T10:00:00.000Z",
};

const basePhase: Phase = {
  id: "phase-1",
  projectId: "project-1",
  type: "insulation",
  status: "in_progress",
  createdAt: "2026-05-01T10:00:00.000Z",
  updatedAt: "2026-05-01T10:00:00.000Z",
};

const baseGate: Gate = {
  id: "gate-1",
  projectId: "project-1",
  phaseId: "phase-1",
  type: "inspection",
  status: "passed",
  requiredPhotoEvidence: false,
  createdAt: "2026-05-01T10:00:00.000Z",
  updatedAt: "2026-05-01T10:00:00.000Z",
};

const baseDeficiency: Deficiency = {
  id: "def-1",
  projectId: "project-1",
  phaseId: "phase-1",
  title: "Missing vapor barrier",
  severity: "medium",
  status: "open",
  createdAt: "2026-05-01T10:00:00.000Z",
  updatedAt: "2026-05-01T10:00:00.000Z",
};

const baseUser: User = {
  id: "user-1",
  role: "admin",
  fullName: "Avery Stone",
  email: "avery@example.com",
  active: true,
  createdAt: "2026-05-01T10:00:00.000Z",
  updatedAt: "2026-05-01T10:00:00.000Z",
};

const basePhoto: PhotoEvidence = {
  id: "photo-1",
  projectId: "project-1",
  phaseId: "phase-1",
  gateId: "gate-1",
  purpose: "inspection",
  objectKey: "photo-1.jpg",
  mimeType: "image/jpeg",
  status: "confirmed",
  uploadedByUserId: "user-1",
  createdAt: "2026-05-01T10:00:00.000Z",
  updatedAt: "2026-05-01T10:00:00.000Z",
};

function event(overrides: Partial<AuditEvent>): AuditEvent {
  return {
    id: "audit-1",
    entityType: "phase",
    entityId: "phase-1",
    action: "updated",
    actorUserId: "user-1",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("formatAuditEvent", () => {
  const lookups = {
    projects: [baseProject],
    phases: [basePhase],
    gates: [baseGate],
    deficiencies: [baseDeficiency],
    users: [baseUser],
  };

  it("renders create deficiency with canonical title and resolved context", () => {
    const display = formatAuditEvent(
      event({
        entityType: "deficiency",
        entityId: "def-1",
        action: "create_deficiency",
      }),
      lookups,
    );

    expect(display.title).toBe("Deficiency opened");
    expect(display.context).toContain("Acme Cedar Point Villas");
    expect(display.context).toContain("Insulation");
    expect(display.context).toContain("Missing vapor barrier");
  });

  it("renders phase ready for inspection and preserves metadata details", () => {
    const display = formatAuditEvent(
      event({
        entityType: "phase",
        entityId: "phase-1",
        action: "phase_ready_for_inspection",
        metadata: {
          inspectorName: "Jordan Vale",
          notes: "Panel signed off",
        },
      }),
      lookups,
    );

    expect(display.title).toBe("Ready for inspection");
    expect(display.metadataText).toBe("Inspector: Jordan Vale · Notes: Panel signed off");
  });

  it("renders subcontractor assignment metadata and actor details", () => {
    const display = formatAuditEvent(
      event({
        entityType: "phase",
        entityId: "phase-1",
        action: "subcontractor_assigned",
        metadata: {
          subcontractorId: "sub-1",
          subcontractorName: "Mike Thompson",
        },
      }),
      lookups,
    );

    expect(display.title).toBe("Subcontractor assigned");
    expect(display.metadataText).toBe("Subcontractor: Mike Thompson");
    expect(display.actorName).toBe("Avery Stone");
    expect(display.actorInitials).toBe("AS");
  });

  it("prefers status text from next value when present", () => {
    const display = formatAuditEvent(
      event({
        entityType: "deficiency",
        entityId: "def-1",
        action: "updated",
        nextValue: { status: "resolved" },
      }),
      lookups,
    );

    expect(display.statusText).toBe("Resolved");
  });

  it("resolves photo evidence activity back to the project", () => {
    const projectId = resolveProjectId(
      event({
        entityType: "photo_evidence",
        entityId: "photo-1",
        action: "photo_uploaded",
      }),
      [basePhase],
      [baseGate],
      [baseDeficiency],
      [basePhoto],
    );

    expect(projectId).toBe("project-1");
  });
});
