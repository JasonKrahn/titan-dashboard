import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppHeader } from "./AppHeader";
import type { AppNotification, User } from "@/lib/types";

const { getNotifications, markNotificationRead, setCurrentUser } = vi.hoisted(() => ({
  getNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
  setCurrentUser: vi.fn(),
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    getNotifications,
    markNotificationRead,
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

const notification: AppNotification = {
  id: "notification-1",
  recipientUserId: "pm-1",
  type: "inventory_audit_request",
  projectId: "proj-1",
  message: "Dale requested materials and hardware audit for Fortress Cedar Point Villas",
  metadata: {
    auditRequestType: "both",
    requesterUserId: "user-inventory-1",
  },
  createdAt: "2026-05-13T18:00:00.000Z",
};

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderHeader(props?: { currentUser?: User }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AppHeader currentUser={props?.currentUser} />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getNotifications.mockResolvedValue({ ok: true, data: [] });
  markNotificationRead.mockResolvedValue({ ok: true, data: notification });
});

describe("AppHeader admin tools", () => {
  it("links admins to the inventory tracker", async () => {
    renderHeader({ currentUser: admin });

    const links = await screen.findAllByRole("link", { name: /Inventory/i });
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/inventory");
    }
  });

  it("links admins to organization member management", async () => {
    renderHeader({ currentUser: admin });

    expect(await screen.findByRole("link", { name: /Organization Members/i })).toBeInTheDocument();
  });

  it("shows activity but hides admin overview from admin tools by default", async () => {
    renderHeader({ currentUser: admin });

    expect(await screen.findAllByRole("button", { name: /Admin Tools/i })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Activity" })).toHaveLength(2);
    expect(screen.queryByRole("link", { name: "Admin Overview" })).not.toBeInTheDocument();
  });

  it("shows admin overview in admin tools when the admin setting is enabled", async () => {
    renderHeader({ currentUser: { ...admin, adminOverviewEnabled: true } });

    const adminOverviewLinks = await screen.findAllByRole("link", { name: "Admin Overview" });
    expect(adminOverviewLinks).toHaveLength(2);
    for (const link of adminOverviewLinks) {
      expect(link).toHaveAttribute("href", "/command");
    }
  });

  it("hides admin tools for project managers", async () => {
    renderHeader({ currentUser: pm });

    expect(await screen.findByText("Titan PM")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Admin Tools/i })).not.toBeInTheDocument();
  });
});

describe("AppHeader project manager notifications", () => {
  it("shows project managers a notification menu", async () => {
    renderHeader({ currentUser: pm });

    expect(await screen.findByRole("button", { name: "Notifications" })).toBeInTheDocument();
    expect(screen.getByText("No notifications yet.")).toBeInTheDocument();
    expect(screen.queryByTestId("notification-unread-marker")).not.toBeInTheDocument();
  });

  it("hides project manager notifications for admins", async () => {
    renderHeader({ currentUser: admin });

    expect(await screen.findByText("Titan PM")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Notifications" })).not.toBeInTheDocument();
  });

  it("opens a project and clears the clicked notification", async () => {
    getNotifications.mockResolvedValue({ ok: true, data: [notification] });
    renderHeader({ currentUser: pm });

    expect(await screen.findByTestId("notification-unread-marker")).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: notification.message }));

    await waitFor(() => expect(markNotificationRead).toHaveBeenCalledWith(notification.id));
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/project/proj-1"));
  });
});

