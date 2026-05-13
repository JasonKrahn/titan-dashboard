import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsDialog } from "./SettingsDialog";
import type { User } from "@/lib/types";

const { updateUser } = vi.hoisted(() => ({
  updateUser: vi.fn(),
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    updateUser,
  };
});

const admin: User = {
  id: "admin-1",
  role: "admin",
  fullName: "James Harrison",
  email: "james@titanpm.io",
  adminOverviewEnabled: false,
  active: true,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
};

function renderDialog(user: User) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <SettingsDialog open onOpenChange={vi.fn()} user={user} />
    </QueryClientProvider>,
  );
}

describe("SettingsDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      configurable: true,
    });
    Object.defineProperty(globalThis, "ResizeObserver", {
      value: class {
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = vi.fn();
      },
      configurable: true,
    });
    updateUser.mockResolvedValue({ ok: true, data: admin });
  });

  it("defaults the admin overview setting off", () => {
    renderDialog(admin);

    expect(screen.getByRole("switch", { name: "Admin overview" })).toHaveAttribute("aria-checked", "false");
  });

  it("saves admin overview toggle changes", async () => {
    renderDialog(admin);

    fireEvent.click(screen.getByRole("switch", { name: "Admin overview" }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(updateUser).toHaveBeenCalledWith("admin-1", expect.objectContaining({
      fullName: "James Harrison",
      email: "james@titanpm.io",
      adminOverviewEnabled: true,
    })));
  });
});
