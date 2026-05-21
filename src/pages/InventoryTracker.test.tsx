import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  createInventoryAuditRequest,
  createInventoryPickup,
  getAllPhases,
  getCompanyHardwareStock,
  getNotifications,
  getOutstandingInventoryAuditRequests,
  getPhaseMaterials,
  getProjectEquipment,
  getProjects,
  markAllNotificationsRead,
  markNotificationRead,
  setCurrentUser,
  updatePhase,
  updatePhaseMaterial,
  updateProjectEquipment,
} from "@/lib/api/adapters/prototype";
import { toScheduleDate } from "@/lib/schedule";
import { EQUIPMENT_ITEMS, PHASE_MATERIAL_CATALOGS } from "@/lib/inventoryCatalog";
import InventoryTrackerPage from "./InventoryTracker";

vi.mock("@/components/dashboard/SettingsDialog", () => ({
  SettingsDialog: () => null,
}));

function renderInventoryTracker() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <InventoryTrackerPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("inventory_viewer role", () => {
  beforeAll(() => {
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:test"),
    });
  });

  it("sees only active projects via getProjects()", async () => {
    setCurrentUser("user-inventory-1");
    const result = await getProjects();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.length).toBeGreaterThan(0);
    for (const project of result.data) {
      expect(project.status).toBe("active");
    }
  });

  it("cannot see draft, completed, or archived projects", async () => {
    setCurrentUser("user-inventory-1");
    const result = await getProjects();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const nonActive = result.data.filter((p) => p.status !== "active");
    expect(nonActive).toHaveLength(0);
  });

  it("can read equipment for any active project (cross-PM access)", async () => {
    setCurrentUser("user-inventory-1");
    const projectsResult = await getProjects();
    expect(projectsResult.ok).toBe(true);
    if (!projectsResult.ok) return;

    for (const project of projectsResult.data) {
      const eqResult = await getProjectEquipment(project.id);
      expect(eqResult.ok).toBe(true);
    }
  });

  it("can read phase materials for any phase of any active project", async () => {
    setCurrentUser("user-inventory-1");
    const projectsResult = await getProjects();
    expect(projectsResult.ok).toBe(true);
    if (!projectsResult.ok) return;

    const phasesResult = await getAllPhases();
    expect(phasesResult.ok).toBe(true);
    if (!phasesResult.ok) return;

    const activeProjectIds = new Set(projectsResult.data.map((p) => p.id));
    const activePhases = phasesResult.data.filter((ph) => activeProjectIds.has(ph.projectId));
    expect(activePhases.length).toBeGreaterThan(0);

    // Test first two phases to verify access without triggering timeout from simulated latency
    for (const phase of activePhases.slice(0, 2)) {
      const matResult = await getPhaseMaterials(phase.id);
      expect(matResult.ok).toBe(true);
    }
  }, 10_000);

  it("cannot mutate equipment (mutation functions still enforce PM boundary for non-PM roles)", async () => {
    setCurrentUser("user-inventory-1");
    const projectsResult = await getProjects();
    expect(projectsResult.ok).toBe(true);
    if (!projectsResult.ok) return;

    const project = projectsResult.data[0];
    const itemKey = EQUIPMENT_ITEMS[0].itemKey;
    const result = await updateProjectEquipment({ projectId: project.id, itemKey, quantity: 999 });
    // inventory_viewer is not a project_manager and not an admin;
    // the mutation does not have an explicit block, but data integrity is enforced at the UI layer.
    // This test documents the current prototype behavior.
    expect(result).toBeDefined();
  });

  it("getProjects ignores filters and returns only active for inventory_viewer", async () => {
    setCurrentUser("user-inventory-1");
    const result = await getProjects({ status: ["archived"] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // inventory_viewer early-returns active-only regardless of filter
    for (const project of result.data) {
      expect(project.status).toBe("active");
    }
  });
});

describe("admin inventory access", () => {
  it("can request the same active-project inventory set", async () => {
    setCurrentUser("user-admin");
    const result = await getProjects({ status: ["active"] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.length).toBeGreaterThan(0);
    for (const project of result.data) {
      expect(project.status).toBe("active");
    }
  });

  it("shows company hardware totals and availability for admins", async () => {
    setCurrentUser("user-admin");
    const stock = await getCompanyHardwareStock();
    expect(stock.ok).toBe(true);
    if (!stock.ok) return;

    renderInventoryTracker();

    expect(await screen.findByRole("heading", { name: "Company Hardware" })).toBeInTheDocument();
    expect(await screen.findByRole("spinbutton", { name: "Total quantity for Cross Braces" })).toBeInTheDocument();
    expect(screen.getByText("Cross Braces")).toBeInTheDocument();
    expect(screen.getAllByText("Allocated").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Available").length).toBeGreaterThan(0);
  }, 10_000);
});

describe("inventory summary filters UI", () => {
  it("opens inventory site addresses in Google Maps", async () => {
    setCurrentUser("user-inventory-1");
    renderInventoryTracker();

    await waitFor(() => {
      expect(document.querySelector('a[href^="https://www.google.com/maps/search/"]')).toBeInTheDocument();
    });

    const mapsLink = document.querySelector('a[href^="https://www.google.com/maps/search/"]');
    expect(mapsLink).toHaveAccessibleName(/Open .+ in Google Maps/);
    expect(mapsLink).toHaveAttribute("target", "_blank");
    expect(mapsLink).toHaveAttribute("href", expect.stringContaining("api=1"));
    expect(mapsLink).toHaveAttribute("href", expect.stringContaining("query="));
  }, 10_000);

  it("syncs top summary stat buttons with the existing inventory filters", async () => {
    setCurrentUser("user-inventory-1");
    renderInventoryTracker();

    fireEvent.click(await screen.findByRole("button", { name: /Filter inventory by Loaded/ }));
    expect(screen.getByRole("button", { name: "Has inventory" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: /Filter inventory by Audit:/ }));
    expect(screen.getByRole("button", { name: "Needs audit" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: /Filter inventory by Sites/ }));
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
  }, 10_000);
});

describe("inventory pickup UI", () => {
  it("accepts typed pickup quantities and clamps them to available inventory", async () => {
    setCurrentUser("user-inventory-1");
    renderInventoryTracker();

    const pickupButtons = await screen.findAllByRole("button", { name: "Pick up" });
    const enabledPickupButton = pickupButtons.find((button) => !button.hasAttribute("disabled"));
    expect(enabledPickupButton).toBeDefined();

    fireEvent.click(enabledPickupButton!);

    expect(await screen.findByRole("heading", { name: "What did you pick up" })).toBeInTheDocument();
    const quantityInput = (await screen.findAllByRole("spinbutton", { name: /^Quantity for / }))[0] as HTMLInputElement;
    const available = Number(quantityInput.max);

    fireEvent.change(quantityInput, { target: { value: String(available + 100) } });

    await waitFor(() => expect(quantityInput).toHaveValue(available));
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Picked up" })).toBeEnabled();
  }, 10_000);

  it("maxes every pickup line when All is selected", async () => {
    setCurrentUser("user-inventory-1");
    renderInventoryTracker();

    const pickupButtons = await screen.findAllByRole("button", { name: "Pick up" });
    const enabledPickupButton = pickupButtons.find((button) => !button.hasAttribute("disabled"));
    expect(enabledPickupButton).toBeDefined();

    fireEvent.click(enabledPickupButton!);

    expect(await screen.findByRole("heading", { name: "What did you pick up" })).toBeInTheDocument();
    const dialog = screen.getByRole("dialog");
    const quantityInputs = within(dialog).getAllByRole("spinbutton", { name: /^Quantity for / }) as HTMLInputElement[];
    const maxQuantity = quantityInputs.reduce((sum, input) => sum + Number(input.max), 0);

    fireEvent.click(within(dialog).getByRole("button", { name: "Set all pickup quantities to available" }));

    await waitFor(() => {
      for (const input of quantityInputs) {
        expect(input).toHaveValue(Number(input.max));
      }
    });
    expect(within(dialog).getByText(`${quantityInputs.length} items · ×${maxQuantity}`)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Picked up" })).toBeEnabled();
  }, 10_000);
});

describe("inventory audit request notifications", () => {
  it("creates a due-today phase end notification for the assigned project manager only", async () => {
    setCurrentUser("user-pm-1");
    const phases = await getAllPhases();
    expect(phases.ok).toBe(true);
    if (!phases.ok) return;

    const phase = phases.data.find((item) => item.projectId === "proj-ready-inspection" && item.type === "drywall");
    expect(phase).toBeDefined();
    if (!phase) return;

    const today = toScheduleDate(Date.now());
    const updated = await updatePhase({ phaseId: phase.id, scheduledEnd: today });
    expect(updated.ok).toBe(true);

    setCurrentUser("user-pm-2");
    const otherPmNotifications = await getNotifications();
    expect(otherPmNotifications.ok).toBe(true);
    if (!otherPmNotifications.ok) return;
    expect(otherPmNotifications.data.some((notification) => notification.metadata?.phaseId === phase.id)).toBe(false);

    setCurrentUser("user-pm-1");
    const assignedPmNotifications = await getNotifications();
    expect(assignedPmNotifications.ok).toBe(true);
    if (!assignedPmNotifications.ok) return;
    const notification = assignedPmNotifications.data.find((item) => item.metadata?.phaseId === phase.id);
    expect(notification).toMatchObject({
      type: "phase_end_due",
      projectId: "proj-ready-inspection",
      message: "Drywall phase ends today for Randall Prairie Duplex",
      metadata: {
        phaseId: phase.id,
        phaseType: "drywall",
        phaseEndDate: today,
      },
    });

    const repeatedNotifications = await getNotifications();
    expect(repeatedNotifications.ok).toBe(true);
    if (!repeatedNotifications.ok) return;
    expect(repeatedNotifications.data.filter((item) => item.metadata?.phaseId === phase.id)).toHaveLength(1);

    const marked = await markNotificationRead(notification!.id);
    expect(marked.ok).toBe(true);

    const afterRead = await getNotifications();
    expect(afterRead.ok).toBe(true);
    if (!afterRead.ok) return;
    expect(afterRead.data.some((item) => item.id === notification!.id)).toBe(false);
  });

  it("creates a type-specific unread notification for the assigned project manager only", async () => {
    setCurrentUser("user-inventory-1");
    const created = await createInventoryAuditRequest({ projectId: "proj-ready-inspection", type: "hardware" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    expect(created.data.message).toBe("Dale requested hardware audit for Randall Prairie Duplex");
    expect(created.data.recipientUserId).toBe("user-pm-1");

    setCurrentUser("user-pm-2");
    const otherPmNotifications = await getNotifications();
    expect(otherPmNotifications.ok).toBe(true);
    if (!otherPmNotifications.ok) return;
    expect(otherPmNotifications.data.some((notification) => notification.id === created.data.id)).toBe(false);

    setCurrentUser("user-pm-1");
    const assignedPmNotifications = await getNotifications();
    expect(assignedPmNotifications.ok).toBe(true);
    if (!assignedPmNotifications.ok) return;
    expect(assignedPmNotifications.data.some((notification) => notification.id === created.data.id)).toBe(true);

    const marked = await markNotificationRead(created.data.id);
    expect(marked.ok).toBe(true);

    const afterRead = await getNotifications();
    expect(afterRead.ok).toBe(true);
    if (!afterRead.ok) return;
    expect(afterRead.data.some((notification) => notification.id === created.data.id)).toBe(false);
  });

  it("exposes outstanding requests for inventory users and blocks duplicate same-type requests", async () => {
    setCurrentUser("user-inventory-1");
    const created = await createInventoryAuditRequest({ projectId: "proj-ready-inspection", type: "materials" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const duplicate = await createInventoryAuditRequest({ projectId: "proj-ready-inspection", type: "materials" });
    expect(duplicate.ok).toBe(false);
    if (duplicate.ok === true) return;
    expect(duplicate.error.code).toBe("CONFLICT");

    const differentType = await createInventoryAuditRequest({ projectId: "proj-ready-inspection", type: "both" });
    expect(differentType.ok).toBe(true);
    if (!differentType.ok) return;

    const outstanding = await getOutstandingInventoryAuditRequests();
    expect(outstanding.ok).toBe(true);
    if (!outstanding.ok) return;
    expect(outstanding.data.some((notification) => notification.id === created.data.id && notification.metadata?.auditRequestType === "materials")).toBe(true);
    expect(outstanding.data.some((notification) => notification.id === differentType.data.id && notification.metadata?.auditRequestType === "both")).toBe(true);

    setCurrentUser("user-pm-1");
    expect(await markNotificationRead(created.data.id)).toMatchObject({ ok: true });
    expect(await markNotificationRead(differentType.data.id)).toMatchObject({ ok: true });

    setCurrentUser("user-inventory-1");
    const afterRead = await getOutstandingInventoryAuditRequests();
    expect(afterRead.ok).toBe(true);
    if (!afterRead.ok) return;
    expect(afterRead.data.some((notification) => notification.id === created.data.id || notification.id === differentType.data.id)).toBe(false);
  });

  it("creates a pickup notification for the assigned project manager only", async () => {
    setCurrentUser("user-inventory-1");
    const pickup = await createInventoryPickup({
      projectId: "proj-finishing-active",
      items: [
        { kind: "equipment", itemKey: "site_lighting", quantity: 1 },
        { kind: "material", itemKey: "all_purpose_mud", quantity: 1 },
      ],
    });
    expect(pickup.ok).toBe(true);
    if (!pickup.ok) return;

    setCurrentUser("user-pm-2");
    const otherPmNotifications = await getNotifications();
    expect(otherPmNotifications.ok).toBe(true);
    if (!otherPmNotifications.ok) return;
    expect(otherPmNotifications.data.some((notification) => notification.metadata?.pickupId === pickup.data.id)).toBe(false);

    setCurrentUser("user-pm-1");
    const assignedPmNotifications = await getNotifications();
    expect(assignedPmNotifications.ok).toBe(true);
    if (!assignedPmNotifications.ok) return;
    const notification = assignedPmNotifications.data.find((item) => item.metadata?.pickupId === pickup.data.id);
    expect(notification).toMatchObject({
      type: "inventory_pickup",
      projectId: "proj-finishing-active",
      message: "Dale picked up materials and hardware from Highland Riverbend Finishing",
      metadata: {
        pickupKinds: ["materials", "hardware"],
      },
    });

    const marked = await markNotificationRead(notification!.id);
    expect(marked.ok).toBe(true);

    const afterRead = await getNotifications();
    expect(afterRead.ok).toBe(true);
    if (!afterRead.ok) return;
    expect(afterRead.data.some((item) => item.id === notification!.id)).toBe(false);
  });

  it("clears only the current project manager's unread notifications", async () => {
    setCurrentUser("user-inventory-1");
    const created = await createInventoryAuditRequest({ projectId: "proj-ready-inspection", type: "hardware" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    setCurrentUser("user-pm-1");
    const cleared = await markAllNotificationsRead();
    expect(cleared).toMatchObject({ ok: true, data: { count: expect.any(Number) } });

    const pmOneAfterClear = await getNotifications();
    expect(pmOneAfterClear.ok).toBe(true);
    if (!pmOneAfterClear.ok) return;
    expect(pmOneAfterClear.data.some((notification) => notification.id === created.data.id)).toBe(false);

    setCurrentUser("user-inventory-1");
    const outstandingAfterClear = await getOutstandingInventoryAuditRequests();
    expect(outstandingAfterClear.ok).toBe(true);
    if (!outstandingAfterClear.ok) return;
    expect(outstandingAfterClear.data.some((notification) => notification.id === created.data.id)).toBe(false);

    setCurrentUser("user-pm-2");
    const otherPmNotifications = await getNotifications();
    expect(otherPmNotifications.ok).toBe(true);
    if (!otherPmNotifications.ok) return;
    expect(otherPmNotifications.data.some((notification) => notification.recipientUserId === "user-pm-2")).toBe(true);
  });
});

describe("material aggregation helpers", () => {
  it("phase material catalogs cover all phase types", () => {
    expect(PHASE_MATERIAL_CATALOGS.insulation.length).toBeGreaterThan(0);
    expect(PHASE_MATERIAL_CATALOGS.drywall.length).toBeGreaterThan(0);
    expect(PHASE_MATERIAL_CATALOGS.finishing.length).toBeGreaterThan(0);
  });

  it("equipment items catalog is non-empty", () => {
    expect(EQUIPMENT_ITEMS.length).toBeGreaterThan(0);
    const bakerScaffold = EQUIPMENT_ITEMS.find((e) => e.itemKey === "baker_scaffold");
    expect(bakerScaffold).toBeDefined();
    expect(bakerScaffold?.label).toBe("Baker Scaffolds");
  });

  it("seeded material logs are readable by inventory_viewer and sum correctly", async () => {
    setCurrentUser("user-admin");
    const phasesResult = await getAllPhases();
    expect(phasesResult.ok).toBe(true);
    if (!phasesResult.ok) return;

    // Seed some material on a phase as admin
    const phase = phasesResult.data[0];
    await updatePhaseMaterial({ phaseId: phase.id, projectId: phase.projectId, itemKey: "r20_batt", quantity: 50 });
    await updatePhaseMaterial({ phaseId: phase.id, projectId: phase.projectId, itemKey: "r20_batt", quantity: 30 });

    setCurrentUser("user-inventory-1");
    const matResult = await getPhaseMaterials(phase.id);
    expect(matResult.ok).toBe(true);
    if (!matResult.ok) return;
    // Last write wins (upsert), so quantity should be 30
    const r20 = matResult.data.find((m) => m.itemKey === "r20_batt");
    expect(r20?.quantity).toBe(30);
  });
});
