import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ActivityList } from "./ActivityList";
import type { AuditEvent, Deficiency, Gate, Phase, Project } from "@/lib/types";

const project: Project = {
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

const phase: Phase = {
  id: "phase-1",
  projectId: "project-1",
  type: "insulation",
  status: "in_progress",
  createdAt: "2026-05-01T10:00:00.000Z",
  updatedAt: "2026-05-01T10:00:00.000Z",
};

const gate: Gate = {
  id: "gate-1",
  projectId: "project-1",
  phaseId: "phase-1",
  type: "inspection",
  status: "passed",
  requiredPhotoEvidence: false,
  createdAt: "2026-05-01T10:00:00.000Z",
  updatedAt: "2026-05-01T10:00:00.000Z",
};

const deficiency: Deficiency = {
  id: "def-1",
  projectId: "project-1",
  phaseId: "phase-1",
  title: "Missing vapor barrier",
  severity: "medium",
  status: "open",
  createdAt: "2026-05-01T10:00:00.000Z",
  updatedAt: "2026-05-01T10:00:00.000Z",
};

describe("ActivityList", () => {
  it("renders normalized title, context, and metadata for phase activity", () => {
    const event: AuditEvent = {
      id: "audit-1",
      entityType: "deficiency",
      entityId: "def-1",
      action: "create_deficiency",
      actorUserId: "user-1",
      createdAt: new Date().toISOString(),
      metadata: {
        notes: "Missing vapor barrier at east wall",
      },
    };

    render(
      <ActivityList
        events={[event]}
        lookups={{
          projects: [project],
          phases: [phase],
          gates: [gate],
          deficiencies: [deficiency],
        }}
      />,
    );

    expect(screen.getByText("Deficiency opened")).toBeInTheDocument();
    expect(screen.getByText("Acme Cedar Point Villas · Insulation · Missing vapor barrier")).toBeInTheDocument();
    expect(screen.getByText("Notes: Missing vapor barrier at east wall")).toBeInTheDocument();
  });

  it("renders summarized inventory quantity changes", () => {
    const event: AuditEvent = {
      id: "audit-materials",
      entityType: "phase",
      entityId: "phase-1",
      action: "materials_updated",
      actorUserId: "user-1",
      createdAt: new Date().toISOString(),
      metadata: {
        inventoryChanges: [
          { itemKey: "r20_batt", label: "R-20 Batts", previousQuantity: 3, quantity: 4 },
          { itemKey: "red_tuck_tape", label: "Red Tuck Tape", previousQuantity: 0, quantity: 2 },
        ],
      },
    };

    render(
      <ActivityList
        events={[event]}
        lookups={{
          projects: [project],
          phases: [phase],
          gates: [gate],
          deficiencies: [deficiency],
        }}
      />,
    );

    expect(screen.getByText("Materials updated")).toBeInTheDocument();
    expect(screen.getByText("Acme Cedar Point Villas · Insulation")).toBeInTheDocument();
    expect(screen.getByText("R-20 Batts: 3 → 4 · Red Tuck Tape: 0 → 2")).toBeInTheDocument();
  });
});
