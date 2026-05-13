import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { PageNav } from "@/components/dashboard/PageNav";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderPageNav(
  props: ComponentProps<typeof PageNav>,
  initialEntries: string[] = ["/"],
) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <PageNav {...props} />
    </MemoryRouter>,
  );
}

describe("PageNav", () => {
  it("keeps the dedicated Back button history-based while breadcrumbs remain route links", () => {
    Object.defineProperty(window, "history", { value: { length: 5 }, writable: true });

    renderPageNav({
      backFallback: "/",
      backLabel: "Back to Projects",
      items: [
        { label: "All Projects", to: "/" },
        { label: "Fortress Ready Complete Bungalow" },
      ],
    });

    const desktopBreadcrumb = within(screen.getByTestId("page-nav-desktop-breadcrumb"));
    const crumb = desktopBreadcrumb.getByRole("link", { name: "All Projects" });
    expect(crumb).toHaveAttribute("href", "/");

    fireEvent.click(screen.getByRole("button", { name: "Back to Projects" }));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("uses a contextual back label on the project view", () => {
    renderPageNav({
      backFallback: "/",
      backLabel: "Back to Projects",
      items: [
        { label: "All Projects", to: "/" },
        { label: "Fortress Developments", to: "/clients/fortress-developments" },
        { label: "Fortress Ready Complete Bungalow" },
      ],
    });

    const desktopBreadcrumb = within(screen.getByTestId("page-nav-desktop-breadcrumb"));

    expect(screen.getByRole("button", { name: "Back to Projects" })).toBeInTheDocument();
    expect(desktopBreadcrumb.getAllByRole("link").map((link) => link.textContent?.trim())).toEqual([
      "All Projects",
      "Fortress Developments",
    ]);
    expect(desktopBreadcrumb.getByText("Fortress Ready Complete Bungalow").closest('[aria-current="page"]')).not.toBeNull();
  });

  it("keeps the current phase crumb non-interactive and preserves breadcrumb order", () => {
    renderPageNav({
      backFallback: "/project/proj-ready-complete",
      backLabel: "Back to Project",
      items: [
        { label: "All Projects", to: "/" },
        { label: "Fortress Ready Complete Bungalow", to: "/project/proj-ready-complete" },
        { label: "Insulation" },
      ],
    });

    const desktopBreadcrumb = within(screen.getByTestId("page-nav-desktop-breadcrumb"));

    expect(screen.getByRole("button", { name: "Back to Project" })).toBeInTheDocument();
    expect(desktopBreadcrumb.getAllByRole("link").map((link) => link.textContent?.trim())).toEqual([
      "All Projects",
      "Fortress Ready Complete Bungalow",
    ]);
    expect(desktopBreadcrumb.queryByRole("link", { name: "Insulation" })).not.toBeInTheDocument();
    expect(desktopBreadcrumb.getByText("Insulation").closest('[aria-current="page"]')).not.toBeNull();
  });

  it("collapses middle crumbs in the mobile breadcrumb row", () => {
    renderPageNav({
      backFallback: "/",
      backLabel: "Back to Projects",
      items: [
        { label: "All Projects", to: "/" },
        { label: "Fortress Developments", to: "/clients/fortress-developments" },
        { label: "Fortress Cedar Point Villas" },
      ],
    });

    const mobileBreadcrumb = within(screen.getByTestId("page-nav-mobile-breadcrumb"));

    expect(mobileBreadcrumb.getByRole("link", { name: "All Projects" })).toBeInTheDocument();
    expect(mobileBreadcrumb.queryByText("Fortress Developments")).not.toBeInTheDocument();
    expect(mobileBreadcrumb.getByText("Fortress Cedar Point Villas").closest('[aria-current="page"]')).not.toBeNull();
  });
});
