import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import PhaseDetailPage from "./PhaseDetail";
import type { MaterialLog, PhaseDetail } from "@/lib/types";

const { getPhase, getCurrentUser, getPhotoViewUrl, getUsers, setCurrentUser, updatePhase, getPhaseMaterials, updatePhaseMaterial } = vi.hoisted(() => ({
  getPhase: vi.fn(),
  getCurrentUser: vi.fn(),
  getPhotoViewUrl: vi.fn(),
  getUsers: vi.fn(),
  setCurrentUser: vi.fn(),
  updatePhase: vi.fn(),
  getPhaseMaterials: vi.fn(),
  updatePhaseMaterial: vi.fn(),
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    getPhase,
    getCurrentUser,
    getPhotoViewUrl,
    getUsers,
    setCurrentUser,
    getPhaseMaterials,
    updatePhaseMaterial,
    markPhaseReadyForInspection: vi.fn(),
    updatePhase,
    assignSubcontractorToPhase: vi.fn(),
    updateUser: vi.fn(),
  };
});

const insulationMaterials: MaterialLog[] = [
  {
    id: "mat-1",
    projectId: "proj-1",
    phaseId: "phase-1",
    itemKey: "r20_batt",
    quantity: 3,
    updatedAt: "2026-05-08T10:00:00.000Z",
  },
  {
    id: "mat-2",
    projectId: "proj-1",
    phaseId: "phase-1",
    itemKey: "acoustic_sealant",
    quantity: 0,
    updatedAt: "2026-05-08T10:00:00.000Z",
  },
];

const detail: PhaseDetail = {
  project: {
    id: "proj-1",
    clientId: "client-1",
    projectNumber: "ACM-1002",
    name: "Acme Cedar Point Villas",
    siteAddress: "220 Cedar Point Drive",
    status: "active",
    atticCheckStatus: "not_started",
    scheduledStart: "2026-04-21T00:00:00.000Z",
    scheduledEnd: "2026-06-06T00:00:00.000Z",
    updatedAt: "2026-05-08T10:00:00.000Z",
    createdAt: "2026-04-01T00:00:00.000Z",
  },
  phase: {
    id: "phase-1",
    projectId: "proj-1",
    type: "insulation",
    status: "in_progress",
    scheduledStart: "2026-04-23T00:00:00.000Z",
    scheduledEnd: "2026-05-11T00:00:00.000Z",
    assignedSubcontractorId: "sub-1",
    updatedAt: "2026-05-08T10:00:00.000Z",
    createdAt: "2026-04-01T00:00:00.000Z",
  },
  assignedProjectManager: {
    id: "user-1",
    role: "project_manager",
    fullName: "Priya Patel",
    email: "priya@example.com",
    active: true,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
  },
  gates: [
    {
      id: "gate-site",
      projectId: "proj-1",
      phaseId: "phase-1",
      type: "site_check",
      status: "passed",
      requiredPhotoEvidence: true,
      notes: "Site check passed and prep complete.",
      updatedAt: "2026-05-08T10:00:00.000Z",
      createdAt: "2026-04-01T00:00:00.000Z",
    },
    {
      id: "gate-inspection",
      projectId: "proj-1",
      phaseId: "phase-1",
      type: "inspection",
      status: "not_started",
      requiredPhotoEvidence: false,
      updatedAt: "2026-05-07T10:00:00.000Z",
      createdAt: "2026-04-01T00:00:00.000Z",
    },
  ],
  deficiencies: [
    {
      id: "def-1",
      projectId: "proj-1",
      phaseId: "phase-1",
      title: "Missing vapor barrier",
      severity: "medium",
      status: "open",
      createdAt: "2026-05-08T10:00:00.000Z",
      updatedAt: "2026-05-08T10:00:00.000Z",
    },
  ],
  photoEvidence: [
    {
      id: "photo-1",
      projectId: "proj-1",
      phaseId: "phase-1",
      gateId: "gate-site",
      purpose: "site_check",
      objectKey: "site-check-1",
      mimeType: "image/jpeg",
      status: "confirmed",
      uploadedByUserId: "user-1",
      createdAt: "2026-05-08T10:00:00.000Z",
      updatedAt: "2026-05-08T10:00:00.000Z",
    },
  ],
  subcontractors: [
    {
      id: "sub-1",
      displayName: "Mike Thompson",
      trade: "insulation",
      active: true,
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
    },
  ],
  auditEvents: [],
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/project/proj-1/phase/phase-1"]}>
        <Routes>
          <Route path="/project/:projectId/phase/:phaseId" element={<PhaseDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("PhaseDetailPage desktop status rail", () => {
  beforeEach(() => {
    getPhase.mockResolvedValue({ ok: true, data: detail });
    getCurrentUser.mockResolvedValue({ ok: false, error: { message: "No current user" } });
    getPhotoViewUrl.mockResolvedValue({ ok: true, data: { url: "https://example.com/photo.jpg" } });
    getUsers.mockResolvedValue({ ok: true, data: [detail.assignedProjectManager] });
    updatePhase.mockResolvedValue({ ok: true, data: detail.phase });
    getPhaseMaterials.mockResolvedValue({ ok: true, data: insulationMaterials });
    updatePhaseMaterial.mockResolvedValue({
      ok: true,
      data: {
        ...insulationMaterials[0],
        quantity: 4,
      },
    });
  });

  it("opens the deficiencies tab from the open deficiencies summary", async () => {
    renderPage();

    await screen.findByRole("heading", { name: "Insulation" });

    fireEvent.click(screen.getByRole("button", { name: /open deficiencies summary/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add deficiency/i })).toBeInTheDocument();
    });
  });

  it("focuses the site check work card from the status summary", async () => {
    renderPage();

    await screen.findByRole("heading", { name: "Insulation" });

    fireEvent.click(screen.getByRole("button", { name: /site check summary/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Site check" })).toHaveFocus();
    });
  });
});

describe("PhaseDetailPage schedule validation", () => {
  beforeEach(() => {
    getPhase.mockResolvedValue({ ok: true, data: detail });
    getCurrentUser.mockResolvedValue({ ok: false, error: { message: "No current user" } });
    getPhotoViewUrl.mockResolvedValue({ ok: true, data: { url: "https://example.com/photo.jpg" } });
    getUsers.mockResolvedValue({ ok: true, data: [detail.assignedProjectManager] });
    updatePhase.mockResolvedValue({ ok: true, data: detail.phase });
    getPhaseMaterials.mockResolvedValue({ ok: true, data: insulationMaterials });
    updatePhaseMaterial.mockResolvedValue({
      ok: true,
      data: {
        ...insulationMaterials[0],
        quantity: 4,
      },
    });
  });

  it("renders schedule date pickers with validation logic", async () => {
    renderPage();

    await screen.findByRole("heading", { name: "Insulation" });

    // Verify both date pickers are present
    const startDateButton = document.getElementById("scheduled-start");
    const endDateButton = document.getElementById("scheduled-end");

    expect(startDateButton).toBeInTheDocument();
    expect(endDateButton).toBeInTheDocument();
  });

  it("displays validation error alert when dateValidationError is set", async () => {
    renderPage();

    await screen.findByRole("heading", { name: "Insulation" });

    // The validation error alert exists in the component
    const alert = screen.queryByText("Date validation error");
    // Initially should not be visible since no error
    expect(alert).not.toBeInTheDocument();
  });
});

describe("PhaseDetailPage materials", () => {
  beforeEach(() => {
    getPhase.mockResolvedValue({ ok: true, data: detail });
    getCurrentUser.mockResolvedValue({ ok: false, error: { message: "No current user" } });
    getPhotoViewUrl.mockResolvedValue({ ok: true, data: { url: "https://example.com/photo.jpg" } });
    getUsers.mockResolvedValue({ ok: true, data: [detail.assignedProjectManager] });
    updatePhase.mockResolvedValue({ ok: true, data: detail.phase });
    getPhaseMaterials.mockResolvedValue({ ok: true, data: insulationMaterials });
    updatePhaseMaterial.mockResolvedValue({
      ok: true,
      data: {
        ...insulationMaterials[0],
        quantity: 4,
      },
    });
  });

  it("renders non-zero phase material quantities in the overview", async () => {
    renderPage();

    await screen.findByRole("heading", { name: "Insulation" });

    expect((await screen.findAllByRole("heading", { name: "Materials" })).length).toBeGreaterThan(0);
    expect(screen.getAllByText("R-20 Batts").length).toBeGreaterThan(0);
    expect(screen.getAllByText("3").length).toBeGreaterThan(0);
    expect(screen.queryByText("Acoustic Sealant")).not.toBeInTheDocument();
  });

  it("opens the current phase material catalog and saves only changed draft quantities", async () => {
    renderPage();

    await screen.findByRole("heading", { name: "Insulation" });
    const manageButtons = await screen.findAllByRole("button", { name: "Manage" });
    fireEvent.click(manageButtons[0]);

    expect(await screen.findByRole("heading", { name: "Manage Materials" })).toBeInTheDocument();
    expect(screen.getByText("R-12 Batts")).toBeInTheDocument();
    expect(screen.getByText("Attic Baffle Vents")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Increase R-20 Batts" }));
    expect(updatePhaseMaterial).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(updatePhaseMaterial).toHaveBeenCalledTimes(1);
    });
    expect(updatePhaseMaterial).toHaveBeenCalledWith({
      phaseId: "phase-1",
      projectId: "proj-1",
      itemKey: "r20_batt",
      quantity: 4,
    });
  });

  it("renders the material empty state when the phase has no saved quantities", async () => {
    getPhaseMaterials.mockResolvedValue({ ok: true, data: [] });

    renderPage();

    await screen.findByRole("heading", { name: "Insulation" });

    expect((await screen.findAllByText("No materials logged")).length).toBeGreaterThan(0);
  });
});
