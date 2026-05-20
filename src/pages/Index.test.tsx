import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "./Index";
import type { ClientRecord, Project, User } from "@/lib/types";

const { api } = vi.hoisted(() => ({
  api: {
    getAllDeficiencies: vi.fn(),
    getAllGates: vi.fn(),
    getAllPhases: vi.fn(),
    getAllPhotos: vi.fn(),
    getClients: vi.fn(),
    getCurrentUser: vi.fn(),
    getProjects: vi.fn(),
    getUsers: vi.fn(),
  },
}));

vi.mock("@/lib/api", () => api);

vi.mock("@/components/dashboard/AppHeader", () => ({
  AppHeader: ({ onSelectDashboardView }: { onSelectDashboardView?: (view: "clients" | "dashboard") => void }) => (
    <header>
      <button type="button" onClick={() => onSelectDashboardView?.("clients")}>Header Clients</button>
      <button type="button" onClick={() => onSelectDashboardView?.("dashboard")}>Header All Projects</button>
    </header>
  ),
}));

vi.mock("@/components/dashboard/StatsRow", () => ({
  StatsRow: () => <div data-testid="stats-row" />,
}));

vi.mock("@/components/dashboard/FilterBar", () => ({
  FilterBar: () => <div data-testid="filter-bar" />,
}));

vi.mock("@/components/dashboard/ProjectResults", () => ({
  ProjectResults: ({ title }: { title: string }) => <div data-testid="project-results">{title}</div>,
}));

vi.mock("@/components/dashboard/ClientDirectory", () => ({
  ClientDirectory: ({ clients, onOpenClient }: { clients: ClientRecord[]; onOpenClient: (id: string) => void }) => (
    <div data-testid="client-directory">
      <button type="button" onClick={() => onOpenClient(clients[0]?.id ?? "client-1")}>Open Client</button>
    </div>
  ),
}));

vi.mock("@/components/dashboard/ClientProjectsView", () => ({
  ClientProjectsView: ({ client }: { client: ClientRecord }) => <div data-testid="client-projects">{client.name}</div>,
}));

vi.mock("@/components/dashboard/AlertPanels", () => ({
  ArchivePanel: () => <div data-testid="archive-panel" />,
  DueInspectionsPanel: () => <div data-testid="due-inspections-panel" />,
}));

vi.mock("@/components/dashboard/EmptyState", () => ({
  EmptyState: () => <div data-testid="empty-state" />,
}));

vi.mock("@/components/dashboard/ArchiveProjectDialog", () => ({
  ArchiveProjectDialog: () => null,
}));

vi.mock("@/components/dashboard/NewClientDialog", () => ({
  NewClientDialog: () => null,
}));

vi.mock("@/components/dashboard/NewProjectDialog", () => ({
  NewProjectDialog: () => null,
}));

vi.mock("@/components/ui/bottom-sheet", () => ({
  BottomSheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const admin: User = {
  id: "user-admin",
  role: "admin",
  fullName: "James Harrison",
  email: "james@titanpm.io",
  active: true,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
};

const pm: User = {
  id: "user-pm-1",
  role: "project_manager",
  fullName: "Robert Thompson",
  email: "robert@titanpm.io",
  active: true,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
};

const client: ClientRecord = {
  id: "client-1",
  name: "Cedar Hollow Homes",
  archived: false,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
};

const project: Project = {
  id: "project-1",
  clientId: client.id,
  projectNumber: "TP-2026-001",
  name: "Cedar Lot 12",
  siteAddress: "123 Main St, Winnipeg, MB R3C 1A3",
  status: "active",
  assignedProjectManagerId: pm.id,
  atticCheckStatus: "not_started",
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
};

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/"]}>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getAllDeficiencies.mockResolvedValue({ ok: true, data: [] });
  api.getAllGates.mockResolvedValue({ ok: true, data: [] });
  api.getAllPhases.mockResolvedValue({ ok: true, data: [] });
  api.getAllPhotos.mockResolvedValue({ ok: true, data: [] });
  api.getClients.mockResolvedValue({ ok: true, data: [client] });
  api.getProjects.mockResolvedValue({ ok: true, data: [project] });
  api.getUsers.mockResolvedValue({ ok: true, data: [admin, pm] });
});

describe("DashboardPage role defaults", () => {
  it("defaults project managers to projects but keeps an explicit Clients selection", async () => {
    api.getCurrentUser.mockResolvedValue({ ok: true, data: pm });

    renderDashboard();

    expect(await screen.findByTestId("project-results")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Header Clients" }));

    await waitFor(() => expect(screen.getByTestId("client-directory")).toBeInTheDocument());
    expect(screen.queryByTestId("project-results")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open Client" }));

    await waitFor(() => expect(screen.getByTestId("client-projects")).toHaveTextContent(client.name));
  });

  it("keeps admins defaulted to Clients", async () => {
    api.getCurrentUser.mockResolvedValue({ ok: true, data: admin });

    renderDashboard();

    expect(await screen.findByTestId("client-directory")).toBeInTheDocument();
    expect(screen.queryByTestId("project-results")).not.toBeInTheDocument();
  });
});
