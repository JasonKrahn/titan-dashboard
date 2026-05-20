import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { NewProjectDialog } from "./NewProjectDialog";
import type { Project, User } from "@/lib/types";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    getClients: vi.fn(async () => ({ ok: true, data: [] })),
    getProjects: vi.fn(async () => ({ ok: true, data: [] })),
    getUsers: vi.fn(async () => ({ ok: true, data: [] })),
  };
});

const admin: User = {
  id: "admin-1",
  role: "admin",
  fullName: "James Harrison",
  email: "james@titanpm.io",
  active: true,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
};

const project: Project = {
  id: "project-1",
  clientId: "client-1",
  projectNumber: "TP-2026-001",
  name: "Oak Bend",
  siteAddress: "99 Mill Rock Road",
  status: "active",
  scheduledStart: "2026-04-25T17:34:25.551Z",
  scheduledEnd: "2026-06-10T17:34:25.551Z",
  assignedProjectManagerId: "admin-1",
  atticCheckStatus: "not_started",
  finishLevel: 4,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
};

function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <NewProjectDialog open onOpenChange={vi.fn()} currentUser={admin} project={project} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("NewProjectDialog", () => {
  it("pre-populates edit project schedule dates from ISO timestamps", async () => {
    renderDialog();

    expect(await screen.findByText("Apr 25, 2026")).toBeInTheDocument();
    expect(screen.getByText("Jun 10, 2026")).toBeInTheDocument();
  });
});
