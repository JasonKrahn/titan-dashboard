import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectResults } from "./ProjectResults";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ClientRecord, Project, User } from "@/lib/types";

const client: ClientRecord = {
  id: "client-1",
  name: "Cedar Hollow Homes",
  archived: false,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
};

const pm: User = {
  id: "user-pm",
  role: "project_manager",
  fullName: "Robert Thompson",
  email: "robert@titanpm.io",
  active: true,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
};

const activeProject: Project = {
  id: "project-1",
  clientId: client.id,
  projectNumber: "TP-2026-001",
  name: "Cedar Lot 12",
  siteAddress: "123 Main St, Winnipeg, MB R3C 1A3",
  status: "active",
  assignedProjectManagerId: pm.id,
  atticCheckStatus: "not_started",
  scheduledStart: "2026-05-01",
  scheduledEnd: "2026-05-31",
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-02T00:00:00.000Z",
};

const completedProject: Project = {
  ...activeProject,
  id: "project-2",
  projectNumber: "TP-2026-002",
  name: "Summit Block C",
  status: "completed",
};

function renderResults({
  projects = [activeProject],
  displayMode = "cards" as const,
  onOpenProject = vi.fn(),
  onEditProject = vi.fn(),
  onArchiveProject = vi.fn(),
} = {}) {
  render(
    <TooltipProvider>
      <ProjectResults
        title="Projects"
        projects={projects}
        clients={[client]}
        users={[pm]}
        phases={[]}
        gates={[]}
        deficiencies={[]}
        emptyState={<div>Empty</div>}
        onOpenProject={onOpenProject}
        onEditProject={onEditProject}
        onArchiveProject={onArchiveProject}
        displayMode={displayMode}
        onDisplayModeChange={() => undefined}
      />
    </TooltipProvider>,
  );

  return { onOpenProject, onEditProject, onArchiveProject };
}

beforeEach(() => {
  Object.defineProperty(window, "localStorage", {
    value: {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    },
    configurable: true,
  });
});

describe("ProjectResults mobile project actions", () => {
  it("keeps card tap navigation separate from the overflow action sheet", async () => {
    const onOpenProject = vi.fn();

    renderResults({ onOpenProject, displayMode: "cards" });

    fireEvent.click(screen.getByRole("button", { name: /Open actions for Cedar Lot 12/i }));

    expect(onOpenProject).not.toHaveBeenCalled();

    const dialog = await screen.findByRole("dialog", { name: "Project actions" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Photos Review project photo evidence" }));

    expect(onOpenProject).toHaveBeenCalledWith("project-1", { initialMobileTab: "photos" });
  });

  it("keeps list row tap navigation separate from the overflow action sheet", async () => {
    const onOpenProject = vi.fn();

    renderResults({ onOpenProject, displayMode: "list" });

    fireEvent.click(screen.getByRole("button", { name: /Open actions for Cedar Lot 12/i }));

    expect(onOpenProject).not.toHaveBeenCalled();

    const dialog = await screen.findByRole("dialog", { name: "Project actions" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Activity Review recent project changes" }));

    expect(onOpenProject).toHaveBeenCalledWith("project-1", { initialMobileTab: "activity" });
  });

  it("routes completed-project archive actions through the existing archive callback", async () => {
    const onArchiveProject = vi.fn();

    renderResults({
      projects: [completedProject],
      displayMode: "cards",
      onArchiveProject,
      onEditProject: undefined,
    });

    fireEvent.click(screen.getByRole("button", { name: /Open actions for Summit Block C/i }));

    const dialog = await screen.findByRole("dialog", { name: "Project actions" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Archive project Move completed work out of active views" }));

    expect(onArchiveProject).toHaveBeenCalledWith("project-2", "Summit Block C");
  });
});
