import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Phase, Project } from "@/lib/types";
import { ProjectScheduleTimeline } from "./ProjectScheduleTimeline";

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: "project-1",
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
    ...overrides,
  };
}

function phase(id: string, type: Phase["type"], start: string, end: string): Phase {
  return {
    id,
    projectId: "project-1",
    type,
    status: "not_started",
    scheduledStart: start,
    scheduledEnd: end,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
  };
}

describe("ProjectScheduleTimeline", () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      width: 300,
      height: 44,
      top: 0,
      right: 300,
      bottom: 44,
      left: 0,
      toJSON: () => ({}),
    });
  });

  it("renders the project schedule section", () => {
    render(
      <ProjectScheduleTimeline
        project={project()}
        phases={[
          phase("phase-insulation", "insulation", "2026-05-01", "2026-05-06"),
          phase("phase-drywall", "drywall", "2026-05-10", "2026-05-15"),
          phase("phase-finishing", "finishing", "2026-05-20", "2026-05-25"),
        ]}
        onScheduleChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Project Schedule" })).toBeInTheDocument();
    expect(screen.getByText("Insulation")).toBeInTheDocument();
    expect(screen.getByText("Drywall")).toBeInTheDocument();
    expect(screen.getByText("Finishing")).toBeInTheDocument();
  });

  it("persists only the dragged phase change when resizing end into an adjacent phase", () => {
    const onScheduleChange = vi.fn();
    render(
      <ProjectScheduleTimeline
        project={project()}
        phases={[
          phase("phase-insulation", "insulation", "2026-05-01", "2026-05-06"),
          phase("phase-drywall", "drywall", "2026-05-07", "2026-05-12"),
          phase("phase-finishing", "finishing", "2026-05-13", "2026-05-18"),
        ]}
        onScheduleChange={onScheduleChange}
      />,
    );

    const handle = screen.getByLabelText("Resize Insulation end date");
    fireEvent(handle, new MouseEvent("pointerdown", { bubbles: true, clientX: 100 }));
    fireEvent(window, new MouseEvent("pointermove", { bubbles: true, clientX: 150 }));
    fireEvent(window, new MouseEvent("pointerup", { bubbles: true, clientX: 150 }));

    expect(onScheduleChange).toHaveBeenCalledWith([
      { phaseId: "phase-insulation", scheduledStart: "2026-05-01", scheduledEnd: "2026-05-11" },
    ]);
  });

  it("shows an error and does not persist when resize-end exceeds the project deadline", () => {
    const onScheduleChange = vi.fn();
    render(
      <ProjectScheduleTimeline
        project={project()}
        phases={[
          phase("phase-finishing", "finishing", "2026-05-25", "2026-05-31"),
        ]}
        onScheduleChange={onScheduleChange}
      />,
    );

    const handle = screen.getByLabelText("Resize Finishing end date");
    fireEvent(handle, new MouseEvent("pointerdown", { bubbles: true, clientX: 100 }));
    fireEvent(window, new MouseEvent("pointermove", { bubbles: true, clientX: 150 }));
    fireEvent(window, new MouseEvent("pointerup", { bubbles: true, clientX: 150 }));

    expect(onScheduleChange).not.toHaveBeenCalled();
    expect(screen.getByText(/project deadline/i)).toBeInTheDocument();
  });

  it("opens a mobile phase editor and persists the selected phase schedule", () => {
    const onScheduleChange = vi.fn();
    render(
      <ProjectScheduleTimeline
        project={project({ scheduledStart: "2026-05-01T00:00:00.000Z", scheduledEnd: "2026-05-31T00:00:00.000Z" })}
        phases={[
          phase("phase-insulation", "insulation", "2026-05-01T00:00:00.000Z", "2026-05-06T00:00:00.000Z"),
          phase("phase-drywall", "drywall", "2026-05-07", "2026-05-12"),
        ]}
        onScheduleChange={onScheduleChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Schedule 2 phases/i }));
    const insulationCard = screen
      .getAllByRole("button", { name: /Insulation/i })
      .find((button) => !button.getAttribute("aria-label")?.startsWith("Resize"));
    expect(insulationCard).toBeDefined();
    fireEvent.click(insulationCard!);

    expect(screen.getByLabelText("Start date")).toHaveValue("2026-05-01");
    expect(screen.getByLabelText("End date")).toHaveValue("2026-05-06");
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-05-02" } });
    fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-05-08" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onScheduleChange).toHaveBeenCalledWith([
      { phaseId: "phase-insulation", scheduledStart: "2026-05-02", scheduledEnd: "2026-05-08" },
    ]);
  });

  it("blocks mobile schedule edits outside project bounds", () => {
    const onScheduleChange = vi.fn();
    render(
      <ProjectScheduleTimeline
        project={project()}
        phases={[
          phase("phase-insulation", "insulation", "2026-05-01", "2026-05-06"),
        ]}
        onScheduleChange={onScheduleChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Schedule 1 phases/i }));
    const insulationCard = screen
      .getAllByRole("button", { name: /Insulation/i })
      .find((button) => !button.getAttribute("aria-label")?.startsWith("Resize"));
    expect(insulationCard).toBeDefined();
    fireEvent.click(insulationCard!);

    fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-06-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onScheduleChange).not.toHaveBeenCalled();
    expect(screen.getByText(/on or before the project end date/i)).toBeInTheDocument();
  });

  it("renders a forced read-only schedule without drag or mobile editing controls", () => {
    const onScheduleChange = vi.fn();
    render(
      <ProjectScheduleTimeline
        project={project()}
        phases={[
          phase("phase-insulation", "insulation", "2026-05-01", "2026-05-06"),
        ]}
        onScheduleChange={onScheduleChange}
        canEdit={false}
      />,
    );

    expect(screen.getAllByText("Read-only").length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("Resize Insulation end date")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Schedule 1 phases/i }));
    const insulationCard = screen
      .getAllByRole("button", { name: /Insulation/i })
      .find((button) => !button.getAttribute("aria-label")?.startsWith("Resize"));
    expect(insulationCard).toBeDefined();
    fireEvent.click(insulationCard!);

    expect(screen.queryByLabelText("Start date")).not.toBeInTheDocument();
    expect(onScheduleChange).not.toHaveBeenCalled();
  });
});
