import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { ClientProjectsView } from "./ClientProjectsView";
import type { ClientRecord, Project } from "@/lib/types";

vi.mock("@/components/dashboard/ProjectResults", () => ({
  ProjectResults: () => <div data-testid="project-results" />,
}));

vi.mock("@/components/dashboard/ActivityTray", () => ({
  ActivityTray: () => <aside data-testid="activity-tray">Recent Activity</aside>,
}));

const client: ClientRecord = {
  id: "client-1",
  name: "Fortress Developments",
  archived: false,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
};

const project: Project = {
  id: "project-1",
  clientId: "client-1",
  projectNumber: "TP-2026-001",
  name: "Fortress Cedar Point Villas",
  siteAddress: "7 Skylark Lane, Winnipeg, MB R3Y 1G4",
  status: "active",
  atticCheckStatus: "not_started",
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
};

function renderView(props: Partial<ComponentProps<typeof ClientProjectsView>> = {}) {
  return render(
    <ClientProjectsView
      client={client}
      projects={[project]}
      users={[]}
      phases={[]}
      gates={[]}
      deficiencies={[]}
      filter="all"
      onFilterChange={vi.fn()}
      onBack={vi.fn()}
      isAdmin
      {...props}
    />,
  );
}

describe("ClientProjectsView activity rail preference", () => {
  it("renders the activity rail for admins when enabled", () => {
    renderView({ clientActivityRailEnabled: true });

    expect(screen.getByTestId("activity-tray")).toBeInTheDocument();
  });

  it("omits the activity rail for admins when disabled", () => {
    renderView({ clientActivityRailEnabled: false });

    expect(screen.queryByTestId("activity-tray")).not.toBeInTheDocument();
    expect(screen.getByTestId("project-results")).toBeInTheDocument();
  });

  it("omits the activity rail for admins by default", () => {
    renderView();

    expect(screen.queryByTestId("activity-tray")).not.toBeInTheDocument();
    expect(screen.getByTestId("project-results")).toBeInTheDocument();
  });

  it("does not render the activity rail for non-admins", () => {
    renderView({ isAdmin: false, clientActivityRailEnabled: true });

    expect(screen.queryByTestId("activity-tray")).not.toBeInTheDocument();
  });
});
