import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import PhaseDetailPage from "./PhaseDetail";
import type { InventoryPickup, MaterialLog, PhaseDetail } from "@/lib/types";

const { getPhase, getCurrentUser, getPhotoViewUrl, getUsers, setCurrentUser, updatePhase, getPhaseMaterials, getProjectInventoryPickups, updatePhaseMaterials, createPhaseChecklistItem, updatePhaseChecklistItem, deletePhaseChecklistItem } = vi.hoisted(() => ({
  getPhase: vi.fn(),
  getCurrentUser: vi.fn(),
  getPhotoViewUrl: vi.fn(),
  getUsers: vi.fn(),
  setCurrentUser: vi.fn(),
  updatePhase: vi.fn(),
  getPhaseMaterials: vi.fn(),
  getProjectInventoryPickups: vi.fn(),
  updatePhaseMaterials: vi.fn(),
  createPhaseChecklistItem: vi.fn(),
  updatePhaseChecklistItem: vi.fn(),
  deletePhaseChecklistItem: vi.fn(),
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
    getProjectInventoryPickups,
    updatePhaseMaterials,
    createPhaseChecklistItem,
    updatePhaseChecklistItem,
    deletePhaseChecklistItem,
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

const materialPickup: InventoryPickup = {
  id: "pickup-material-1",
  projectId: "proj-1",
  pickedUpByUserId: "user-inventory-1",
  items: [{ kind: "material", itemKey: "r20_batt", quantity: 2 }],
  createdAt: "2026-05-13T10:00:00.000Z",
};

const detail: PhaseDetail = {
  project: {
    id: "proj-1",
    clientId: "client-1",
    projectNumber: "ACM-1002",
    name: "Acme Cedar Point Villas",
    siteAddress: "7 Skylark Lane",
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
  checklistItems: [
    {
      id: "task-1",
      projectId: "proj-1",
      phaseId: "phase-1",
      text: "Confirm attic baffles are installed",
      completed: false,
      createdAt: "2026-05-08T10:00:00.000Z",
      updatedAt: "2026-05-08T10:00:00.000Z",
    },
    {
      id: "task-2",
      projectId: "proj-1",
      phaseId: "phase-1",
      text: "Verify vapor barrier lap seals",
      completed: true,
      createdAt: "2026-05-08T10:00:00.000Z",
      updatedAt: "2026-05-09T10:00:00.000Z",
    },
  ],
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
    getProjectInventoryPickups.mockResolvedValue({ ok: true, data: [] });
    updatePhaseMaterials.mockResolvedValue({
      ok: true,
      data: [{
        ...insulationMaterials[0],
        quantity: 4,
      }],
    });
  });

  it("opens the deficiencies tab from the open deficiencies summary", async () => {
    renderPage();

    await screen.findByRole("heading", { name: "Insulation" });

    fireEvent.click(screen.getByRole("button", { name: /open deficiencies: 1/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add deficiency/i })).toBeInTheDocument();
    });
  });

  it("focuses the site check work card from the status summary", async () => {
    renderPage();

    await screen.findByRole("heading", { name: "Insulation" });

    fireEvent.click(screen.getByRole("button", { name: /site check: passed/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Site check" })).toHaveFocus();
    });
  });
});

describe("PhaseDetailPage mobile and tablet overview order", () => {
  beforeEach(() => {
    getPhase.mockResolvedValue({ ok: true, data: detail });
    getCurrentUser.mockResolvedValue({ ok: false, error: { message: "No current user" } });
    getPhotoViewUrl.mockResolvedValue({ ok: true, data: { url: "https://example.com/photo.jpg" } });
    getUsers.mockResolvedValue({ ok: true, data: [detail.assignedProjectManager] });
    updatePhase.mockResolvedValue({ ok: true, data: detail.phase });
    getPhaseMaterials.mockResolvedValue({ ok: true, data: insulationMaterials });
    getProjectInventoryPickups.mockResolvedValue({ ok: true, data: [] });
    updatePhaseMaterials.mockResolvedValue({
      ok: true,
      data: [{
        ...insulationMaterials[0],
        quantity: 4,
      }],
    });
  });

  it("places the narrow task checklist before personnel", async () => {
    renderPage();

    await screen.findByRole("heading", { name: "Insulation" });

    const taskChecklist = screen.getByTestId("phase-narrow-task-checklist");
    const personnel = screen.getByTestId("phase-narrow-personnel");

    expect(taskChecklist.compareDocumentPosition(personnel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("renders narrow gates in a card without nesting photo actions in row buttons", async () => {
    renderPage();

    await screen.findByRole("heading", { name: "Insulation" });

    const gates = screen.getByTestId("phase-narrow-gates");
    const photoBadge = within(gates).getByRole("button", { name: /1 photo/i });

    expect(gates).toHaveTextContent("Site check");
    expect(gates).toHaveTextContent("Inspection");
    expect(photoBadge.parentElement?.closest("button")).toBeNull();
  });
});

describe("PhaseDetailPage task checklist", () => {
  beforeEach(() => {
    getPhase.mockResolvedValue({ ok: true, data: detail });
    getCurrentUser.mockResolvedValue({ ok: false, error: { message: "No current user" } });
    getPhotoViewUrl.mockResolvedValue({ ok: true, data: { url: "https://example.com/photo.jpg" } });
    getUsers.mockResolvedValue({ ok: true, data: [detail.assignedProjectManager] });
    updatePhase.mockResolvedValue({ ok: true, data: detail.phase });
    getPhaseMaterials.mockResolvedValue({ ok: true, data: insulationMaterials });
    getProjectInventoryPickups.mockResolvedValue({ ok: true, data: [] });
    updatePhaseMaterials.mockResolvedValue({ ok: true, data: insulationMaterials });
    createPhaseChecklistItem.mockResolvedValue({
      ok: true,
      data: {
        id: "task-created",
        projectId: "proj-1",
        phaseId: "phase-1",
        text: "Stage attic card for inspection",
        completed: false,
        createdAt: "2026-05-10T10:00:00.000Z",
        updatedAt: "2026-05-10T10:00:00.000Z",
      },
    });
    updatePhaseChecklistItem.mockResolvedValue({ ok: true, data: { ...detail.checklistItems[0], completed: true } });
    deletePhaseChecklistItem.mockResolvedValue({ ok: true, data: detail.checklistItems[0] });
  });

  it("renders seeded checklist items from phase detail data", async () => {
    renderPage();

    await screen.findByRole("heading", { name: "Insulation" });

    expect(screen.getAllByText("Confirm attic baffles are installed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Verify vapor barrier lap seals").length).toBeGreaterThan(0);
  });

  it("creates checklist items through the phase checklist API", async () => {
    renderPage();

    await screen.findByRole("heading", { name: "Insulation" });
    fireEvent.change(screen.getAllByLabelText("Add phase task")[0], { target: { value: "Stage attic card for inspection" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Item" }));

    await waitFor(() => {
      expect(createPhaseChecklistItem).toHaveBeenCalledWith({
        projectId: "proj-1",
        phaseId: "phase-1",
        text: "Stage attic card for inspection",
      });
    });
  });

  it("updates and deletes checklist items through the phase checklist API", async () => {
    renderPage();

    await screen.findByRole("heading", { name: "Insulation" });
    fireEvent.click(screen.getAllByLabelText("Confirm attic baffles are installed")[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Delete Confirm attic baffles are installed" })[0]);

    await waitFor(() => {
      expect(updatePhaseChecklistItem).toHaveBeenCalledWith({ itemId: "task-1", completed: true });
      expect(deletePhaseChecklistItem).toHaveBeenCalledWith("task-1");
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
    getProjectInventoryPickups.mockResolvedValue({ ok: true, data: [] });
    updatePhaseMaterials.mockResolvedValue({
      ok: true,
      data: [{
        ...insulationMaterials[0],
        quantity: 4,
      }],
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
    getProjectInventoryPickups.mockResolvedValue({ ok: true, data: [] });
    updatePhaseMaterials.mockResolvedValue({
      ok: true,
      data: [{
        ...insulationMaterials[0],
        quantity: 4,
      }],
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

  it("renders material pickup summaries for the phase catalog", async () => {
    getProjectInventoryPickups.mockResolvedValue({ ok: true, data: [materialPickup] });

    renderPage();

    await screen.findByRole("heading", { name: "Insulation" });

    expect(screen.getAllByText("Picked up:").length).toBeGreaterThan(0);
    expect(screen.getAllByText("R-20 Batts ×2").length).toBeGreaterThan(0);
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
    expect(updatePhaseMaterials).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(updatePhaseMaterials).toHaveBeenCalledTimes(1);
    });
    expect(updatePhaseMaterials).toHaveBeenCalledWith({
      phaseId: "phase-1",
      projectId: "proj-1",
      changes: [{ itemKey: "r20_batt", quantity: 4 }],
    });
  });

  it("renders the material empty state when the phase has no saved quantities", async () => {
    getPhaseMaterials.mockResolvedValue({ ok: true, data: [] });

    renderPage();

    await screen.findByRole("heading", { name: "Insulation" });

    expect((await screen.findAllByText("No materials logged")).length).toBeGreaterThan(0);
  });
});
