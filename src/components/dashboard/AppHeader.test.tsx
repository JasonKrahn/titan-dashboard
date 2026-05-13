import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AppHeader } from "./AppHeader";
import type { User } from "@/lib/types";

const { setCurrentUser } = vi.hoisted(() => ({
  setCurrentUser: vi.fn(),
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    setCurrentUser,
  };
});

vi.mock("@/components/dashboard/SettingsDialog", () => ({
  SettingsDialog: () => null,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const admin: User = {
  id: "admin-1",
  role: "admin",
  fullName: "James Harrison",
  email: "james@titanpm.io",
  active: true,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
};

const pm: User = {
  id: "pm-1",
  role: "project_manager",
  fullName: "Robert Thompson",
  email: "robert@titanpm.io",
  active: true,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
};

function renderHeader(props?: { currentUser?: User }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AppHeader currentUser={props?.currentUser} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AppHeader admin tools", () => {

  it("links admins to organization member management", async () => {
    renderHeader({ currentUser: admin });

    expect(await screen.findByRole("link", { name: /Organization Members/i })).toBeInTheDocument();
  });

  it("hides admin tools for project managers", async () => {
    renderHeader({ currentUser: pm });

    expect(await screen.findByText("Titan PM")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Admin Tools/i })).not.toBeInTheDocument();
  });
});

