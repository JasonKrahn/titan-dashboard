import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PhaseHealthPill } from "@/components/dashboard/PhaseHealthPill";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import type { PhaseHealth } from "@/lib/derived";

describe("status animation behavior", () => {
  it("adds spinner animation class for in-progress status badges", () => {
    render(<StatusBadge tone="in-progress" label="In progress" />);

    const icon = screen.getByText("In progress").closest("div")?.querySelector("svg");
    expect(icon).toHaveClass("motion-safe:animate-spin");
    expect(icon).toHaveClass("motion-reduce:animate-none");
  });

  it("does not add spinner animation class for non in-progress status badges", () => {
    render(<StatusBadge tone="closed" label="Closed" />);

    const icon = screen.getByText("Closed").closest("div")?.querySelector("svg");
    expect(icon).not.toHaveClass("motion-safe:animate-spin");
  });

  it("adds spinner animation class for in-progress phase health pills", () => {
    const health: PhaseHealth = { tone: "in-progress", label: "In progress", reason: "Work in progress" };
    render(<PhaseHealthPill health={health} />);

    const icon = screen.getByText("In progress").closest("div")?.querySelector("svg");
    expect(icon).toHaveClass("motion-safe:animate-spin");
    expect(icon).toHaveClass("motion-reduce:animate-none");
  });
});
