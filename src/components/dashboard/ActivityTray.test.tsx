import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActivityTray } from "./ActivityTray";
import type { AuditEvent, Deficiency, Gate, Phase, PhotoEvidence, Project, User } from "@/lib/types";

const {
  getAuditEvents,
  getProjects,
  getAllPhases,
  getUsers,
  getAllGates,
  getAllDeficiencies,
  getAllPhotos,
} = vi.hoisted(() => ({
  getAuditEvents: vi.fn(),
  getProjects: vi.fn(),
  getAllPhases: vi.fn(),
  getUsers: vi.fn(),
  getAllGates: vi.fn(),
  getAllDeficiencies: vi.fn(),
  getAllPhotos: vi.fn(),
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    getAuditEvents,
    getProjects,
    getAllPhases,
    getUsers,
    getAllGates,
    getAllDeficiencies,
    getAllPhotos,
  };
});

const user: User = {
  id: "user-1",
  role: "project_manager",
  fullName: "Robert Thompson",
  email: "robert@titanpm.io",
  active: true,
  createdAt: "2026-05-01T10:00:00.000Z",
  updatedAt: "2026-05-01T10:00:00.000Z",
};

const project: Project = {
  id: "project-1",
  clientId: "client-1",
  projectNumber: "TP-2026-001",
  name: "Acme Cedar Point Villas",
  siteAddress: "123 Main St, Winnipeg, MB R3C 1A3",
  status: "active",
  assignedProjectManagerId: "user-1",
  atticCheckStatus: "not_started",
  createdAt: "2026-05-01T10:00:00.000Z",
  updatedAt: "2026-05-01T10:00:00.000Z",
};

const otherProject: Project = {
  ...project,
  id: "project-other",
  clientId: "client-other",
  projectNumber: "TP-2026-002",
  name: "Outside Client Project",
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

const photo: PhotoEvidence = {
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

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function event(overrides: Partial<AuditEvent> & Pick<AuditEvent, "entityType" | "entityId" | "action">): AuditEvent {
  return {
    id: `audit-${overrides.entityType}-${overrides.entityId}-${overrides.action}`,
    actorUserId: "user-1",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function mockApi(events: AuditEvent[]) {
  getAuditEvents.mockResolvedValue({ ok: true, data: events });
  getProjects.mockResolvedValue({ ok: true, data: [project, otherProject] });
  getAllPhases.mockResolvedValue({ ok: true, data: [phase] });
  getUsers.mockResolvedValue({ ok: true, data: [user] });
  getAllGates.mockResolvedValue({ ok: true, data: [gate] });
  getAllDeficiencies.mockResolvedValue({ ok: true, data: [deficiency] });
  getAllPhotos.mockResolvedValue({ ok: true, data: [photo] });
}

function renderTray(projectIds = ["project-1"]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ActivityTray projectIds={projectIds} clientId="client-1" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ActivityTray", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders grouped compact client activity rows", async () => {
    mockApi([
      event({ id: "audit-today", entityType: "gate", entityId: "gate-1", action: "inspection_completed", createdAt: daysAgo(0) }),
      event({ id: "audit-yesterday", entityType: "deficiency", entityId: "def-1", action: "create_deficiency", createdAt: daysAgo(1), metadata: { notes: "East wall discontinuity" } }),
      event({ id: "audit-week", entityType: "phase", entityId: "phase-1", action: "phase_ready_for_inspection", createdAt: daysAgo(3) }),
      event({ id: "audit-earlier", entityType: "project", entityId: "project-1", action: "project_notes_updated", createdAt: daysAgo(12), metadata: { notes: "Client asked for daily updates" } }),
      event({ id: "audit-other", entityType: "project", entityId: "project-other", action: "project_notes_updated", createdAt: daysAgo(0), metadata: { notes: "Should be filtered out" } }),
    ]);

    renderTray();

    expect(await screen.findByText("Recent Activity")).toBeInTheDocument();
    expect(screen.getByText("4 latest")).toBeInTheDocument();
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Yesterday")).toBeInTheDocument();
    expect(screen.getByText("This Week")).toBeInTheDocument();
    expect(screen.getByText("Earlier")).toBeInTheDocument();

    const rows = screen.getAllByRole("article");
    expect(rows).toHaveLength(4);
    expect(within(rows[0]).getByText("Inspection completed")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Deficiency opened")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Notes: East wall discontinuity")).toBeInTheDocument();
    expect(screen.queryByText("Should be filtered out")).not.toBeInTheDocument();
  });

  it("limits the rail to the latest 15 events", async () => {
    const events = Array.from({ length: 16 }, (_, index) =>
      event({
        id: `audit-${index}`,
        entityType: "project",
        entityId: "project-1",
        action: "project_notes_updated",
        createdAt: daysAgo(index),
        metadata: { notes: `Activity ${index}` },
      }),
    );

    mockApi(events);
    renderTray();

    expect(await screen.findByText("15 latest")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(15);
    expect(screen.getByText("Notes: Activity 0")).toBeInTheDocument();
    expect(screen.queryByText("Notes: Activity 15")).not.toBeInTheDocument();
  });

  it("shows an empty state when the selected client projects have no activity", async () => {
    mockApi([
      event({ entityType: "project", entityId: "project-other", action: "project_notes_updated" }),
    ]);

    renderTray();

    expect(await screen.findByText("No recent activity for this client")).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("includes photo evidence events for selected client projects", async () => {
    mockApi([
      event({ entityType: "photo_evidence", entityId: "photo-1", action: "photo_uploaded" }),
      event({ entityType: "project", entityId: "project-other", action: "project_notes_updated" }),
    ]);

    renderTray();

    expect(await screen.findByText("Photo uploaded")).toBeInTheDocument();
    expect(screen.getByText("Acme Cedar Point Villas · Insulation · Inspection")).toBeInTheDocument();
    expect(screen.queryByText("Outside Client Project")).not.toBeInTheDocument();
  });
});
