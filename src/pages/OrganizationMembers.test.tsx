import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OrganizationMembersPage from "./OrganizationMembers";
import type { Project, User } from "@/lib/types";

const {
  createUser,
  deactivateUser,
  getCurrentUser,
  getProjects,
  getUsers,
  setCurrentUser,
  updateUser,
} = vi.hoisted(() => ({
  createUser: vi.fn(),
  deactivateUser: vi.fn(),
  getCurrentUser: vi.fn(),
  getProjects: vi.fn(),
  getUsers: vi.fn(),
  setCurrentUser: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    createUser,
    deactivateUser,
    getCurrentUser,
    getProjects,
    getUsers,
    setCurrentUser,
    updateUser,
  };
});

vi.mock("@/components/dashboard/AppHeader", () => ({
  AppHeader: () => <header data-testid="app-header" />,
}));

const users: User[] = [
  {
    id: "admin-1",
    role: "admin",
    fullName: "James Harrison",
    email: "james@titanpm.io",
    active: true,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
  },
  {
    id: "pm-1",
    role: "project_manager",
    fullName: "Robert Thompson",
    email: "robert@titanpm.io",
    phone: "555-0101",
    active: true,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
  },
  {
    id: "pm-inactive",
    role: "project_manager",
    fullName: "Inactive Manager",
    email: "inactive@titanpm.io",
    active: false,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
  },
];

const projects: Project[] = [
  {
    id: "project-1",
    clientId: "client-1",
    projectNumber: "TP-001",
    name: "Oak Bend",
    siteAddress: "1 Main St",
    status: "active",
    assignedProjectManagerId: "pm-1",
    atticCheckStatus: "not_started",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
  },
];

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/organization"]}>
        <Routes>
          <Route path="/organization" element={<OrganizationMembersPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("OrganizationMembersPage", () => {
  beforeEach(() => {
    getCurrentUser.mockResolvedValue({ ok: true, data: users[0] });
    getUsers.mockResolvedValue({ ok: true, data: users });
    getProjects.mockResolvedValue({ ok: true, data: projects });
    createUser.mockResolvedValue({ ok: true, data: users[1] });
    updateUser.mockResolvedValue({ ok: true, data: users[1] });
    deactivateUser.mockResolvedValue({ ok: true, data: { ...users[1], active: false } });
  });

  it("shows member counts and disables removal for assigned project managers", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Organization Members" })).toBeInTheDocument();
    expect(screen.getByText("Active members")).toBeInTheDocument();
    expect(screen.getAllByText("Project Managers").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Inactive").length).toBeGreaterThan(0);

    const pmRow = screen.getByTestId("member-row-pm-1");
    expect(within(pmRow).getByText("1 active project")).toBeInTheDocument();
    expect(within(pmRow).getByRole("button", { name: "Remove Robert Thompson" })).toBeDisabled();
  });

  it("filters members by search and role", async () => {
    renderPage();

    expect(await screen.findByText("Robert Thompson")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search name, email, or phone..."), {
      target: { value: "inactive" },
    });
    expect(screen.getByText("Inactive Manager")).toBeInTheDocument();
    expect(screen.queryByText("Robert Thompson")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Filter by role"), {
      target: { value: "admin" },
    });
    expect(screen.getByText("No members found")).toBeInTheDocument();
  });

  it("blocks project managers from viewing organization management", async () => {
    getCurrentUser.mockResolvedValue({ ok: true, data: users[1] });

    renderPage();

    expect(await screen.findByRole("heading", { name: "Admin only" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Organization Members" })).not.toBeInTheDocument();
  });
});
