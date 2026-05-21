import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProjectDetailPage from "./ProjectDetail";
import type { InventoryPickup, ProjectDetail } from "@/lib/types";

const { getProject, getCurrentUser, getPhotoViewUrl, getUsers, setCurrentUser, getProjectEquipment, getCompanyHardwareStock, getPhaseMaterials, getPhase, getProjectInventoryPickups, updateProjectEquipmentBatch, exportProjectZip } = vi.hoisted(() => ({
  getProject: vi.fn(),
  getCurrentUser: vi.fn(),
  getPhotoViewUrl: vi.fn(),
  getUsers: vi.fn(),
  setCurrentUser: vi.fn(),
  getProjectEquipment: vi.fn(),
  getCompanyHardwareStock: vi.fn(),
  getPhaseMaterials: vi.fn(),
  getPhase: vi.fn(),
  getProjectInventoryPickups: vi.fn(),
  updateProjectEquipmentBatch: vi.fn(),
  exportProjectZip: vi.fn(),
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    getProject,
    getCurrentUser,
    getPhotoViewUrl,
    getUsers,
    setCurrentUser,
    getProjectEquipment,
    getCompanyHardwareStock,
    getPhaseMaterials,
    getPhase,
    getProjectInventoryPickups,
    updateProjectEquipmentBatch,
    updateAtticGate: vi.fn(),
    updatePhaseSchedules: vi.fn(),
  };
});

vi.mock("@/lib/projectExport", () => ({
  exportProjectZip,
}));

const equipmentLogs = [
  {
    id: "equipment-proj-1-baker-scaffold",
    projectId: "proj-1",
    itemKey: "baker_scaffold",
    quantity: 2,
    updatedAt: "2026-05-01T00:00:00.000Z",
  },
  {
    id: "equipment-proj-1-site-lighting",
    projectId: "proj-1",
    itemKey: "site_lighting",
    quantity: 0,
    updatedAt: "2026-05-01T00:00:00.000Z",
  },
];

const equipmentPickup: InventoryPickup = {
  id: "pickup-equipment-1",
  projectId: "proj-1",
  pickedUpByUserId: "user-inventory-1",
  items: [{ kind: "equipment", itemKey: "baker_scaffold", quantity: 1 }],
  createdAt: "2026-05-13T10:00:00.000Z",
};

const materialLog = {
  id: "material-phase-insulation-r20-batt",
  projectId: "proj-1",
  phaseId: "phase-insulation",
  itemKey: "r20_batt",
  quantity: 4,
  updatedAt: "2026-05-12T00:00:00.000Z",
};

const adminUser = {
  id: "user-admin",
  role: "admin" as const,
  fullName: "Admin User",
  email: "admin@titanpm.test",
  active: true,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
};

const projectManagerUser = {
  id: "user-pm",
  role: "project_manager" as const,
  fullName: "Project Manager",
  email: "pm@titanpm.test",
  active: true,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
};

const detail: ProjectDetail = {
  project: {
    id: "proj-1",
    clientId: "client-1",
    projectNumber: "TP-2026-001",
    name: "Oak Bend",
    siteAddress: "99 Mill Rock Road",
    status: "active",
    scheduledStart: "2026-05-01",
    scheduledEnd: "2026-05-31",
    atticCheckStatus: "not_started",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
  },
  client: {
    id: "client-1",
    name: "Acme",
    archived: false,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
  },
  phases: [
    {
      id: "phase-insulation",
      projectId: "proj-1",
      type: "insulation",
      status: "not_started",
      scheduledStart: "2026-05-01",
      scheduledEnd: "2026-05-06",
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z",
    },
    {
      id: "phase-drywall",
      projectId: "proj-1",
      type: "drywall",
      status: "not_started",
      scheduledStart: "2026-05-07",
      scheduledEnd: "2026-05-12",
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z",
    },
    {
      id: "phase-finishing",
      projectId: "proj-1",
      type: "finishing",
      status: "not_started",
      scheduledStart: "2026-05-13",
      scheduledEnd: "2026-05-18",
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z",
    },
  ],
  gates: [],
  deficiencies: [],
  photoEvidence: [],
  subcontractors: [],
  auditEvents: [],
};

function renderPage(initialState?: { initialMobileTab?: "overview" | "deficiencies" | "notes" | "photos" | "activity" }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[{ pathname: "/project/proj-1", state: initialState }]}>
        <Routes>
          <Route path="/project/:id" element={<ProjectDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ProjectDetailPage schedule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      configurable: true,
    });
    getProject.mockResolvedValue({ ok: true, data: detail });
    getCurrentUser.mockResolvedValue({ ok: false, error: { message: "No current user" } });
    getPhotoViewUrl.mockResolvedValue({ ok: true, data: { url: "https://example.com/photo.jpg" } });
    getUsers.mockResolvedValue({ ok: true, data: [] });
    getProjectEquipment.mockResolvedValue({ ok: true, data: equipmentLogs });
    getCompanyHardwareStock.mockResolvedValue({
      ok: true,
      data: [
        { itemKey: "baker_scaffold", totalQuantity: 3, allocatedQuantity: 2, availableQuantity: 1, updatedAt: "2026-05-01T00:00:00.000Z" },
        { itemKey: "drywall_lift", totalQuantity: 2, allocatedQuantity: 1, availableQuantity: 1, updatedAt: "2026-05-01T00:00:00.000Z" },
      ],
    });
    getPhaseMaterials.mockImplementation((phaseId: string) => Promise.resolve({
      ok: true,
      data: [{ ...materialLog, id: `material-${phaseId}-r20-batt`, phaseId }],
    }));
    getPhase.mockResolvedValue({ ok: true, data: { phase: {}, project: {}, gates: [], deficiencies: [], photoEvidence: [], subcontractors: [], auditEvents: [], checklistItems: [] } });
    getProjectInventoryPickups.mockResolvedValue({ ok: true, data: [] });
    exportProjectZip.mockResolvedValue(undefined);
    updateProjectEquipmentBatch.mockResolvedValue({
      ok: true,
      data: {
        ...equipmentLogs[0],
        itemKey: "drywall_lift",
        quantity: 1,
      },
    });
  });

  it("renders the project schedule module", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Project Schedule" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Phases" })).toBeInTheDocument();
  });

  it("keeps the operational project detail page on the original empty-state layout", async () => {
    renderPage();

    expect(await screen.findByText("No active deficiencies")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Attic Check Details" })).not.toBeInTheDocument();
  });

  it("keeps the project photo upload header action desktop-only", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Project Photos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload Photos" })).toHaveClass("hidden", "md:inline-flex");
  });

  it("opens the mobile project action sheet from the floating project action button with the fixed action order", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Phases" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Project actions" }));

    const dialog = await screen.findByRole("dialog", { name: "Project actions" });
    const labels = within(dialog)
      .getAllByRole("button")
      .map((button) => button.textContent?.replace(/\s+/g, " ").trim())
      .filter((label) => label && label !== "Close");

    expect(labels).toEqual([
      "Upload photoAdd photo evidence to this project",
      "Add deficiencyLog an issue against this project",
      "Edit projectUpdate project details",
      "DeficienciesJump to active project issues",
      "PhotosReview project photo evidence",
      "ActivityReview recent project changes",
    ]);
  });

  it("honors the initial mobile tab route state", async () => {
    renderPage({ initialMobileTab: "photos" });

    await screen.findByRole("heading", { name: "Project Photos" });

    expect(screen.getByRole("button", { name: "Photos" })).toHaveClass("bg-primary");
    expect(screen.getByRole("button", { name: "Overview" })).not.toHaveClass("bg-primary");
  });

  it("shows attic evidence without a phase in Project Photos and the viewer", async () => {
    getProject.mockResolvedValue({
      ok: true,
      data: {
        ...detail,
        gates: [
          {
            id: "gate-attic",
            projectId: "proj-1",
            type: "attic_check",
            status: "passed",
            requiredPhotoEvidence: true,
            createdAt: "2026-05-01T00:00:00.000Z",
            updatedAt: "2026-05-01T00:00:00.000Z",
          },
        ],
        deficiencies: [
          {
            id: "def-1",
            projectId: "proj-1",
            phaseId: "phase-insulation",
            title: "Missing vapor barrier",
            severity: "medium",
            status: "open",
            createdAt: "2026-05-01T00:00:00.000Z",
            updatedAt: "2026-05-01T00:00:00.000Z",
          },
        ],
        photoEvidence: [
          {
            id: "photo-attic",
            projectId: "proj-1",
            gateId: "gate-attic",
            purpose: "attic_check",
            objectKey: "attic.jpg",
            mimeType: "image/jpeg",
            status: "confirmed",
            uploadedByUserId: "user-pm",
            createdAt: "2026-05-03T00:00:00.000Z",
            updatedAt: "2026-05-03T00:00:00.000Z",
          },
          {
            id: "photo-general",
            projectId: "proj-1",
            phaseId: "phase-insulation",
            purpose: "general",
            objectKey: "general.jpg",
            mimeType: "image/jpeg",
            status: "confirmed",
            uploadedByUserId: "user-pm",
            createdAt: "2026-05-04T00:00:00.000Z",
            updatedAt: "2026-05-04T00:00:00.000Z",
          },
          {
            id: "photo-deficiency-before",
            projectId: "proj-1",
            phaseId: "phase-insulation",
            deficiencyId: "def-1",
            purpose: "deficiency_before",
            objectKey: "before.jpg",
            mimeType: "image/jpeg",
            status: "confirmed",
            uploadedByUserId: "user-pm",
            createdAt: "2026-05-05T00:00:00.000Z",
            updatedAt: "2026-05-05T00:00:00.000Z",
          },
        ],
      },
    });

    renderPage();

    const heading = await screen.findByRole("heading", { name: "Project Photos" });
    const photosSection = heading.closest("section") as HTMLElement;
    expect(within(photosSection).getAllByText("Attic Check").length).toBeGreaterThan(0);
    expect(within(photosSection).getByText("General")).toBeInTheDocument();
    expect(within(photosSection).getByText("Before")).toBeInTheDocument();

    fireEvent.click(await within(photosSection).findByRole("button", { name: "Attic Check" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(await screen.findByText("Photo 1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next photo" })).toBeInTheDocument();
  });

  it("keeps phase actions separate from phase navigation links", async () => {
    getProject.mockResolvedValue({
      ok: true,
      data: {
        ...detail,
        gates: [
          {
            id: "gate-site-insulation",
            projectId: "proj-1",
            phaseId: "phase-insulation",
            type: "site_check",
            status: "not_started",
            requiredPhotoEvidence: false,
            createdAt: "2026-05-01T00:00:00.000Z",
            updatedAt: "2026-05-01T00:00:00.000Z",
          },
        ],
      },
    });

    renderPage();

    const insulationLink = await screen.findByRole("link", { name: /Insulation/i });
    expect(insulationLink).toHaveAttribute("href", "/project/proj-1/phase/phase-insulation");
    expect(screen.getByRole("button", { name: "Site Checked" }).closest("a")).toBeNull();
    expect(screen.getByRole("button", { name: "Site Blocked" }).closest("a")).toBeNull();
  });

  it("defaults admins to the executive summary and shows all project photo evidence", async () => {
    getCurrentUser.mockResolvedValue({ ok: true, data: adminUser });
    getProject.mockResolvedValue({
      ok: true,
      data: {
        ...detail,
        project: {
          ...detail.project,
          notes: "Client wants daily status updates.",
        },
        gates: [
          {
            id: "gate-attic",
            projectId: "proj-1",
            type: "attic_check",
            status: "passed",
            requiredPhotoEvidence: true,
            callInDate: "2026-05-02T00:00:00.000Z",
            installDate: "2026-05-09T00:00:00.000Z",
            callInSubcontractorId: "sub-attic",
            notes: "Attic access confirmed for the morning shift.",
            createdAt: "2026-05-01T00:00:00.000Z",
            updatedAt: "2026-05-01T00:00:00.000Z",
          },
        ],
        subcontractors: [
          {
            id: "sub-attic",
            displayName: "Dale Insulation",
            companyName: "Thermal Shield",
            trade: "insulation",
            active: true,
            createdAt: "2026-05-01T00:00:00.000Z",
            updatedAt: "2026-05-01T00:00:00.000Z",
          },
        ],
        deficiencies: [
          {
            id: "def-1",
            projectId: "proj-1",
            phaseId: "phase-insulation",
            title: "Missing vapor barrier",
            severity: "high",
            status: "open",
            createdAt: "2026-05-02T00:00:00.000Z",
            updatedAt: "2026-05-02T00:00:00.000Z",
          },
        ],
        photoEvidence: [
          {
            id: "photo-attic",
            projectId: "proj-1",
            purpose: "attic_check",
            objectKey: "photo-attic.jpg",
            mimeType: "image/jpeg",
            fileSizeBytes: 2048,
            status: "confirmed",
            uploadedByUserId: "user-pm",
            createdAt: "2026-05-03T00:00:00.000Z",
            updatedAt: "2026-05-03T00:00:00.000Z",
          },
          {
            id: "photo-phase",
            projectId: "proj-1",
            phaseId: "phase-insulation",
            purpose: "general",
            objectKey: "photo-phase.jpg",
            mimeType: "image/jpeg",
            status: "uploaded",
            uploadedByUserId: "user-pm",
            createdAt: "2026-05-04T00:00:00.000Z",
            updatedAt: "2026-05-04T00:00:00.000Z",
          },
        ],
      },
    });

    renderPage();

    expect(await screen.findByText("Executive Summary")).toBeInTheDocument();
    expect(screen.getByText("Client wants daily status updates.")).toBeInTheDocument();
    expect(screen.getByText("Missing vapor barrier")).toBeInTheDocument();
    expect(screen.getByText("Photo Evidence")).toBeInTheDocument();
    expect(screen.getByText("2 photos")).toBeInTheDocument();
    expect(screen.getByText("Attic Check")).toBeInTheDocument();
    expect(screen.getByText("Project")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Site Checked" })).not.toBeInTheDocument();
    const atticDetailsCard = document.getElementById("attic-check-details");
    expect(atticDetailsCard).not.toBeNull();
    const atticDetails = within(atticDetailsCard!);
    expect(await screen.findByRole("heading", { name: "Attic Check Details" })).toBeInTheDocument();
    expect(atticDetails.getByText("May 2, 2026")).toBeInTheDocument();
    expect(atticDetails.getByText("May 9, 2026")).toBeInTheDocument();
    expect(atticDetails.getByText("Dale Insulation · Thermal Shield")).toBeInTheDocument();
    expect(atticDetails.getByText("Attic access confirmed for the morning shift.")).toBeInTheDocument();
    const deficienciesHeading = screen.getByRole("heading", { name: "Deficiencies" });
    const projectNotesHeading = screen.getByRole("heading", { name: "Project Notes" });
    expect(deficienciesHeading.compareDocumentPosition(projectNotesHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(projectNotesHeading.compareDocumentPosition(atticDetailsCard) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("lets admins enter the unchanged operational detail view from the summary", async () => {
    getCurrentUser.mockResolvedValue({ ok: true, data: adminUser });

    renderPage();

    const detailButtons = await screen.findAllByRole("button", { name: /View Full Project Details/i });
    fireEvent.click(detailButtons[0]);

    expect(await screen.findByRole("heading", { name: "Phases" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enable Editing" })).toBeInTheDocument();
    expect(screen.queryByText("Executive Summary")).not.toBeInTheDocument();
  });

  it("bypasses the executive summary for project managers", async () => {
    getCurrentUser.mockResolvedValue({ ok: true, data: projectManagerUser });

    renderPage();

    expect(await screen.findByRole("heading", { name: "Phases" })).toBeInTheDocument();
    expect(screen.queryByText("Executive Summary")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /View Full Project Details/i })).not.toBeInTheDocument();
  });

  it("exports directly from the archived admin executive summary", async () => {
    getCurrentUser.mockResolvedValue({ ok: true, data: adminUser });
    getProject.mockResolvedValue({
      ok: true,
      data: {
        ...detail,
        project: {
          ...detail.project,
          status: "archived",
        },
      },
    });

    renderPage();

    expect(await screen.findByText("Executive Summary")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Export" }));

    await waitFor(() => {
      expect(exportProjectZip).toHaveBeenCalledTimes(1);
    }, { timeout: 3000 });
    expect(exportProjectZip).toHaveBeenCalledWith(
      expect.objectContaining({ project: expect.objectContaining({ status: "archived" }) }),
      detail.client,
      undefined,
      expect.objectContaining({
        equipmentLogs,
        inventoryPickups: [],
      }),
    );
  });
});

describe("ProjectDetailPage equipment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      configurable: true,
    });
    getProject.mockResolvedValue({ ok: true, data: detail });
    getCurrentUser.mockResolvedValue({ ok: false, error: { message: "No current user" } });
    getPhotoViewUrl.mockResolvedValue({ ok: true, data: { url: "https://example.com/photo.jpg" } });
    getUsers.mockResolvedValue({ ok: true, data: [] });
    getProjectEquipment.mockResolvedValue({ ok: true, data: equipmentLogs });
    getCompanyHardwareStock.mockResolvedValue({
      ok: true,
      data: [
        { itemKey: "baker_scaffold", totalQuantity: 3, allocatedQuantity: 2, availableQuantity: 1, updatedAt: "2026-05-01T00:00:00.000Z" },
        { itemKey: "drywall_lift", totalQuantity: 2, allocatedQuantity: 1, availableQuantity: 1, updatedAt: "2026-05-01T00:00:00.000Z" },
      ],
    });
    getPhaseMaterials.mockImplementation((phaseId: string) => Promise.resolve({
      ok: true,
      data: [{ ...materialLog, id: `material-${phaseId}-r20-batt`, phaseId }],
    }));
    getPhase.mockResolvedValue({ ok: true, data: { phase: {}, project: {}, gates: [], deficiencies: [], photoEvidence: [], subcontractors: [], auditEvents: [], checklistItems: [] } });
    getProjectInventoryPickups.mockResolvedValue({ ok: true, data: [] });
    exportProjectZip.mockResolvedValue(undefined);
    updateProjectEquipmentBatch.mockResolvedValue({
      ok: true,
      data: {
        id: "equipment-proj-1-drywall-lift",
        projectId: "proj-1",
        itemKey: "drywall_lift",
        quantity: 1,
        updatedAt: "2026-05-01T00:00:00.000Z",
      },
    });
  });

  it("renders non-zero project equipment quantities in the overview", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Equipment" })).toBeInTheDocument();
    expect(screen.getByText("Baker Scaffolds")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.queryByText("Temporary Site Lighting")).not.toBeInTheDocument();
  });

  it("renders equipment pickup summaries and activity details", async () => {
    getProject.mockResolvedValue({
      ok: true,
      data: {
        ...detail,
        auditEvents: [{
          id: "audit-pickup-1",
          entityType: "project",
          entityId: "proj-1",
          action: "inventory_picked_up",
          actorUserId: "user-inventory-1",
          metadata: {
            pickupId: "pickup-equipment-1",
            summary: "Baker Scaffolds ×1",
            note: "North side",
          },
          createdAt: "2026-05-13T10:00:00.000Z",
        }],
      },
    });
    getProjectInventoryPickups.mockResolvedValue({ ok: true, data: [equipmentPickup] });

    renderPage();

    expect(await screen.findByText("Picked up:")).toBeInTheDocument();
    expect(screen.getAllByText("Baker Scaffolds ×1").length).toBeGreaterThan(0);
    expect(screen.getByText("Inventory picked up")).toBeInTheDocument();
    expect(screen.getByText("Picked up: Baker Scaffolds ×1 · Note: North side")).toBeInTheDocument();
  });

  it("exports equipment, pickups, and phase materials with the project archive", async () => {
    getProject.mockResolvedValue({
      ok: true,
      data: {
        ...detail,
        project: {
          ...detail.project,
          status: "archived",
        },
      },
    });
    getProjectInventoryPickups.mockResolvedValue({ ok: true, data: [equipmentPickup] });

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Export" }));

    await waitFor(() => {
      expect(exportProjectZip).toHaveBeenCalledTimes(1);
    });
    expect(getPhaseMaterials).toHaveBeenCalledWith("phase-insulation");
    expect(getPhaseMaterials).toHaveBeenCalledWith("phase-drywall");
    expect(getPhaseMaterials).toHaveBeenCalledWith("phase-finishing");
    expect(getPhase).toHaveBeenCalledWith("phase-insulation");
    expect(getPhase).toHaveBeenCalledWith("phase-drywall");
    expect(getPhase).toHaveBeenCalledWith("phase-finishing");
    expect(exportProjectZip).toHaveBeenCalledWith(
      expect.objectContaining({ project: expect.objectContaining({ status: "archived" }) }),
      detail.client,
      undefined,
      {
        equipmentLogs,
        inventoryPickups: [equipmentPickup],
        materialLogs: [
          { ...materialLog, id: "material-phase-insulation-r20-batt", phaseId: "phase-insulation" },
          { ...materialLog, id: "material-phase-drywall-r20-batt", phaseId: "phase-drywall" },
          { ...materialLog, id: "material-phase-finishing-r20-batt", phaseId: "phase-finishing" },
        ],
        checklistItems: [],
      },
    );
  });

  it("renders archived detail materials and normalized photo activity", async () => {
    getCurrentUser.mockResolvedValue({ ok: true, data: projectManagerUser });
    getProject.mockResolvedValue({
      ok: true,
      data: {
        ...detail,
        project: {
          ...detail.project,
          status: "archived",
        },
        gates: [
          {
            id: "gate-inspection",
            projectId: "proj-1",
            phaseId: "phase-insulation",
            type: "inspection",
            status: "passed",
            requiredPhotoEvidence: true,
            createdAt: "2026-05-01T00:00:00.000Z",
            updatedAt: "2026-05-01T00:00:00.000Z",
          },
        ],
        photoEvidence: [
          {
            id: "photo-inspection",
            projectId: "proj-1",
            phaseId: "phase-insulation",
            gateId: "gate-inspection",
            purpose: "inspection",
            objectKey: "inspection.jpg",
            mimeType: "image/jpeg",
            status: "confirmed",
            uploadedByUserId: "user-pm",
            createdAt: "2026-05-04T00:00:00.000Z",
            updatedAt: "2026-05-04T00:00:00.000Z",
          },
        ],
        auditEvents: [
          {
            id: "audit-photo",
            entityType: "photo_evidence",
            entityId: "photo-inspection",
            action: "photo_uploaded",
            actorUserId: "user-pm",
            createdAt: "2026-05-04T00:00:00.000Z",
          },
        ],
      },
    });

    renderPage({ initialMobileTab: "activity" });

    expect(await screen.findByRole("heading", { name: "Materials" })).toBeInTheDocument();
    expect(screen.getAllByText("R-20 Batts").length).toBeGreaterThan(0);
    expect(screen.getByText("Photo uploaded")).toBeInTheDocument();
    expect(screen.getByText("Oak Bend · Insulation · Inspection")).toBeInTheDocument();
  });

  it("opens the equipment catalog and saves only changed draft quantities", async () => {
    renderPage();

    await screen.findByRole("heading", { name: "Equipment" });
    fireEvent.click(screen.getByRole("button", { name: "Manage" }));

    expect(await screen.findByRole("heading", { name: "Manage Equipment" })).toBeInTheDocument();
    expect(screen.getAllByText("Baker Scaffolds").length).toBeGreaterThan(0);
    expect(screen.getByText("Drywall Lifts")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Increase Drywall Lifts" }));
    expect(updateProjectEquipmentBatch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(updateProjectEquipmentBatch).toHaveBeenCalledTimes(1);
    });
    expect(updateProjectEquipmentBatch).toHaveBeenCalledWith({
      projectId: "proj-1",
      changes: [{ itemKey: "drywall_lift", quantity: 1 }],
    });
  });

  it("shows equipment availability and prevents increasing past company stock", async () => {
    getCompanyHardwareStock.mockResolvedValue({
      ok: true,
      data: [
        { itemKey: "baker_scaffold", totalQuantity: 3, allocatedQuantity: 2, availableQuantity: 1, updatedAt: "2026-05-01T00:00:00.000Z" },
        { itemKey: "drywall_lift", totalQuantity: 1, allocatedQuantity: 1, availableQuantity: 0, updatedAt: "2026-05-01T00:00:00.000Z" },
      ],
    });
    renderPage();

    await screen.findByRole("heading", { name: "Equipment" });
    fireEvent.click(screen.getByRole("button", { name: "Manage" }));

    expect(await screen.findByText("Available ×0")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Increase Drywall Lifts" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Increase Drywall Lifts" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(updateProjectEquipmentBatch).not.toHaveBeenCalled();
  });
});
