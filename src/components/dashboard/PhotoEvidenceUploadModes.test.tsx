import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { DeficiencyDialog } from "./DeficiencyDialog";
import { InspectionResultDialog } from "./InspectionResultDialog";
import { SiteBlockDialog } from "./SiteBlockDialog";
import { SiteCheckDialog } from "./SiteCheckDialog";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    blockSiteCheck: vi.fn(),
    completeInspection: vi.fn(),
    completeSiteCheck: vi.fn(),
    createDeficiency: vi.fn(),
    updateDeficiency: vi.fn(),
  };
});

function renderWithQuery(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>,
  );
}

describe("photo evidence upload modes", () => {
  it("allows multiple photos for completed site checks", () => {
    renderWithQuery(
      <SiteCheckDialog
        open
        onOpenChange={vi.fn()}
        gateId="gate-site"
        phaseId="phase-1"
        projectId="project-1"
        phaseLabel="Insulation"
      />,
    );

    expect(screen.getByLabelText(/Photo/)).toHaveAttribute("multiple");
  });

  it("allows multiple photos for passed inspection evidence only", () => {
    const { rerender } = renderWithQuery(
      <InspectionResultDialog
        open
        onOpenChange={vi.fn()}
        gateId="gate-inspection"
        phaseId="phase-1"
        projectId="project-1"
        phaseLabel="Insulation"
        mode="passed"
      />,
    );

    expect(screen.getByLabelText(/Photo evidence/)).toHaveAttribute("multiple");

    rerender(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <InspectionResultDialog
          open
          onOpenChange={vi.fn()}
          gateId="gate-inspection"
          phaseId="phase-1"
          projectId="project-1"
          phaseLabel="Insulation"
          mode="failed"
        />
      </QueryClientProvider>,
    );

    expect(screen.getByLabelText(/Photo evidence/)).not.toHaveAttribute("multiple");
  });

  it("keeps before-style deficiency and blocked-site evidence single-photo", () => {
    const { rerender } = renderWithQuery(
      <DeficiencyDialog
        open
        onOpenChange={vi.fn()}
        projectId="project-1"
        phaseId="phase-1"
        phaseLabel="Insulation"
        mode="create"
      />,
    );

    expect(screen.getByLabelText(/Photo evidence/)).not.toHaveAttribute("multiple");

    rerender(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <SiteBlockDialog
          open
          onOpenChange={vi.fn()}
          gateId="gate-site"
          phaseId="phase-1"
          projectId="project-1"
          phaseLabel="Insulation"
        />
      </QueryClientProvider>,
    );

    expect(screen.getByLabelText(/Photo evidence/)).not.toHaveAttribute("multiple");
  });
});
