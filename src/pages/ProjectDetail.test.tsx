import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProjectDetailPage from "./ProjectDetail";
import type { ProjectDetail } from "@/lib/types";

const { getProject, getCurrentUser, getPhotoViewUrl, getUsers, setCurrentUser } = vi.hoisted(() => ({
  getProject: vi.fn(),
  getCurrentUser: vi.fn(),
  getPhotoViewUrl: vi.fn(),
  getUsers: vi.fn(),
  setCurrentUser: vi.fn(),
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
    updateAtticGate: vi.fn(),
    updatePhaseSchedules: vi.fn(),
  };
});

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
    getProject.mockResolvedValue({ ok: true, data: detail });
    getCurrentUser.mockResolvedValue({ ok: false, error: { message: "No current user" } });
    getPhotoViewUrl.mockResolvedValue({ ok: true, data: { url: "https://example.com/photo.jpg" } });
    getUsers.mockResolvedValue({ ok: true, data: [] });
  });

  it("renders the project schedule module", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Project Schedule" })).toBeInTheDocument();
  });
});
