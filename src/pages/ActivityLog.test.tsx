import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ActivityLogPage from "./ActivityLog";
import type { AuditEvent, ClientRecord, Deficiency, Gate, Phase, PhotoEvidence, Project, User } from "@/lib/types";

const {
  getAuditEvents,
  getProjects,
  getAllPhases,
  getUsers,
  getAllGates,
  getAllDeficiencies,
  getClients,
  getAllPhotos,
  getPhotoViewUrl,
} = vi.hoisted(() => ({
  getAuditEvents: vi.fn(),
  getProjects: vi.fn(),
  getAllPhases: vi.fn(),
  getUsers: vi.fn(),
  getAllGates: vi.fn(),
  getAllDeficiencies: vi.fn(),
  getClients: vi.fn(),
  getAllPhotos: vi.fn(),
  getPhotoViewUrl: vi.fn(),
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
    getClients,
    getAllPhotos,
    getPhotoViewUrl,
  };
});

vi.mock("@/components/dashboard/AppHeader", () => ({
  AppHeader: () => <div data-testid="app-header" />,
}));

const user: User = {
  id: "user-1",
  role: "project_manager",
  fullName: "Robert Thompson",
  email: "robert@titanpm.io",
  active: true,
  createdAt: "2026-05-01T10:00:00.000Z",
  updatedAt: "2026-05-01T10:00:00.000Z",
};

const client: ClientRecord = {
  id: "client-1",
  name: "Acme Drywall",
  archived: false,
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

function photo(overrides: Partial<PhotoEvidence> & Pick<PhotoEvidence, "id" | "purpose">): PhotoEvidence {
  return {
    projectId: "project-1",
    phaseId: "phase-1",
    objectKey: `${overrides.id}.jpg`,
    mimeType: "image/jpeg",
    fileSizeBytes: 2048,
    status: "confirmed",
    uploadedByUserId: "user-1",
    createdAt: "2026-05-01T10:00:00.000Z",
    updatedAt: "2026-05-01T10:00:00.000Z",
    ...overrides,
  };
}

function event(overrides: Partial<AuditEvent> & Pick<AuditEvent, "entityType" | "entityId" | "action">): AuditEvent {
  return {
    id: `audit-${overrides.entityType}-${overrides.entityId}`,
    actorUserId: "user-1",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function mockApi(input: { events: AuditEvent[]; photos: PhotoEvidence[] }) {
  getAuditEvents.mockResolvedValue({ ok: true, data: input.events });
  getProjects.mockResolvedValue({ ok: true, data: [project] });
  getAllPhases.mockResolvedValue({ ok: true, data: [phase] });
  getUsers.mockResolvedValue({ ok: true, data: [user] });
  getAllGates.mockResolvedValue({ ok: true, data: [gate] });
  getAllDeficiencies.mockResolvedValue({ ok: true, data: [deficiency] });
  getClients.mockResolvedValue({ ok: true, data: [client] });
  getAllPhotos.mockResolvedValue({ ok: true, data: input.photos });
  getPhotoViewUrl.mockImplementation(async (photoId: string) => ({
    ok: true,
    data: { url: `https://example.com/${photoId}.jpg`, expiresAt: "2026-05-01T11:00:00.000Z" },
  }));
}

function renderActivityLog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/activity"]}>
        <ActivityLogPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function renderedCard() {
  const context = await screen.findByText(/Acme Cedar Point Villas/);
  const card = context.closest(".rounded-lg");
  expect(card).not.toBeNull();
  return card as HTMLElement;
}

describe("ActivityLogPage related photos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    {
      name: "deficiency",
      activity: event({ entityType: "deficiency", entityId: "def-1", action: "create_deficiency" }),
      relatedPhoto: photo({ id: "photo-deficiency", deficiencyId: "def-1", purpose: "deficiency_before" }),
      label: "Open related photo: Deficiency: Missing vapor barrier, Before",
    },
    {
      name: "gate",
      activity: event({ entityType: "gate", entityId: "gate-1", action: "inspection_completed" }),
      relatedPhoto: photo({ id: "photo-gate", gateId: "gate-1", purpose: "inspection" }),
      label: "Open related photo: Inspection · Insulation, Inspection",
    },
    {
      name: "photo upload",
      activity: event({ entityType: "photo_evidence", entityId: "photo-upload", action: "photo_uploaded" }),
      relatedPhoto: photo({ id: "photo-upload", purpose: "general" }),
      label: "Open related photo: Insulation, General",
    },
  ])("shows relevant entity photos for $name activity", async ({ activity, relatedPhoto, label }) => {
    mockApi({
      events: [activity],
      photos: [
        relatedPhoto,
        photo({ id: "photo-unrelated", projectId: "project-other", phaseId: undefined, purpose: "general" }),
      ],
    });

    renderActivityLog();

    const thumbnail = await screen.findByRole("button", { name: label });
    const card = thumbnail.closest(".rounded-lg");
    expect(card).not.toBeNull();

    expect(within(card as HTMLElement).getByText("1 related photo")).toBeInTheDocument();
    expect(thumbnail).toBeInTheDocument();
    expect(within(card as HTMLElement).queryByRole("button", { name: /photo-unrelated/i })).not.toBeInTheDocument();
  });

  it.each([
    {
      name: "project notes",
      activity: event({ entityType: "project", entityId: "project-1", action: "project_notes_updated" }),
    },
    {
      name: "phase material updates",
      activity: event({ entityType: "phase", entityId: "phase-1", action: "materials_updated" }),
    },
  ])("does not inherit broad project or phase photos for $name", async ({ activity }) => {
    mockApi({
      events: [activity],
      photos: [
        photo({ id: "photo-phase", purpose: "general" }),
        photo({ id: "photo-project", phaseId: undefined, purpose: "attic_check" }),
      ],
    });

    renderActivityLog();

    const card = await renderedCard();

    expect(within(card).queryByText(/related photos?/)).not.toBeInTheDocument();
    expect(within(card).queryByRole("button", { name: /Open related photo:/ })).not.toBeInTheDocument();
  });

  it("opens the existing photo viewer from a thumbnail without nesting the button inside the row link", async () => {
    const activity = event({ entityType: "gate", entityId: "gate-1", action: "inspection_completed" });
    const photos = [
      photo({ id: "photo-one", purpose: "inspection", gateId: "gate-1", createdAt: "2026-05-03T10:00:00.000Z" }),
      photo({ id: "photo-two", purpose: "inspection", gateId: "gate-1", createdAt: "2026-05-02T10:00:00.000Z" }),
      photo({ id: "photo-three", purpose: "site_check", gateId: "gate-1", createdAt: "2026-05-01T10:00:00.000Z" }),
    ];
    mockApi({ events: [activity], photos });

    renderActivityLog();

    const card = await renderedCard();
    const rowLink = within(card).getByRole("link", { name: /Inspection Completed/i });
    const thumbnail = within(card).getAllByRole("button", { name: "Open related photo: Inspection · Insulation, Inspection" })[0];

    expect(rowLink).toHaveAttribute("href", "/project/project-1/phase/phase-1");
    expect(rowLink.contains(thumbnail)).toBe(false);
    expect(thumbnail.closest("a")).toBeNull();

    fireEvent.click(thumbnail);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Inspection · Insulation, Inspection")).toBeInTheDocument();
    expect(screen.getByText("Photo 1 of 3")).toBeInTheDocument();
    expect(getPhotoViewUrl).toHaveBeenCalledWith("photo-one");
  });

  it("keeps the row compact when there are more photos than visible thumbnails", async () => {
    const activity = event({ entityType: "gate", entityId: "gate-1", action: "site_check_completed" });
    const photos = Array.from({ length: 5 }, (_, index) => photo({
      id: `photo-${index + 1}`,
      gateId: "gate-1",
      purpose: "general",
      createdAt: `2026-05-0${index + 1}T10:00:00.000Z`,
    }));
    mockApi({ events: [activity], photos });

    renderActivityLog();

    const card = await renderedCard();

    expect(within(card).getByText("5 related photos")).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: /Open 1 more related photos/ })).toBeInTheDocument();
    expect(within(card).getAllByRole("button", { name: /Open related photo:/ })).toHaveLength(4);
  });
});
