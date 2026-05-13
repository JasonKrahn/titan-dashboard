import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProjectDetailPage from "./ProjectDetail";
import type { InventoryPickup, ProjectDetail } from "@/lib/types";

const { getProject, getCurrentUser, getPhotoViewUrl, getUsers, setCurrentUser, getProjectEquipment, getPhaseMaterials, getProjectInventoryPickups, updateProjectEquipmentBatch, exportProjectZip } = vi.hoisted(() => ({
  getProject: vi.fn(),
  getCurrentUser: vi.fn(),
  getPhotoViewUrl: vi.fn(),
  getUsers: vi.fn(),
  setCurrentUser: vi.fn(),
  getProjectEquipment: vi.fn(),
  getPhaseMaterials: vi.fn(),
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
    getPhaseMaterials,
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

const detail: ProjectDetail = {
  project: {
    id: "proj-1",
    clientId: "client-1",
    projectNumber: "TP-2026-001",
    name: "Oak Bend",
    siteAddress: "14 Oak Bend Way",
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

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/project/proj-1"]}>
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
    getProject.mockResolvedValue({ ok: true, data: detail });
    getCurrentUser.mockResolvedValue({ ok: false, error: { message: "No current user" } });
    getPhotoViewUrl.mockResolvedValue({ ok: true, data: { url: "https://example.com/photo.jpg" } });
    getUsers.mockResolvedValue({ ok: true, data: [] });
    getProjectEquipment.mockResolvedValue({ ok: true, data: equipmentLogs });
    getPhaseMaterials.mockResolvedValue({ ok: true, data: [materialLog] });
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
});

describe("ProjectDetailPage equipment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProject.mockResolvedValue({ ok: true, data: detail });
    getCurrentUser.mockResolvedValue({ ok: false, error: { message: "No current user" } });
    getPhotoViewUrl.mockResolvedValue({ ok: true, data: { url: "https://example.com/photo.jpg" } });
    getUsers.mockResolvedValue({ ok: true, data: [] });
    getProjectEquipment.mockResolvedValue({ ok: true, data: equipmentLogs });
    getPhaseMaterials.mockResolvedValue({ ok: true, data: [materialLog] });
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
    expect(screen.getByText("Picked up: Baker Scaffolds ×1")).toBeInTheDocument();
    expect(screen.getByText("“North side”")).toBeInTheDocument();
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
    expect(exportProjectZip).toHaveBeenCalledWith(
      expect.objectContaining({ project: expect.objectContaining({ status: "archived" }) }),
      detail.client,
      undefined,
      {
        equipmentLogs,
        inventoryPickups: [equipmentPickup],
        materialLogs: [materialLog, materialLog, materialLog],
      },
    );
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
});
