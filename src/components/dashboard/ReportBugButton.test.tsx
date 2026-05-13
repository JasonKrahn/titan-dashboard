import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReportBugButton } from "./ReportBugButton";
import type { User } from "@/lib/types";

const { getCurrentUser, toastSuccess } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    getCurrentUser,
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
  },
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

function renderReporter(initialEntry = "/project/proj-1/phase/phase-1?tab=materials") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="*" element={<ReportBugButton />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ReportBugButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUser.mockResolvedValue({ ok: true, data: admin });
    Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 844, configurable: true });
    Object.defineProperty(window, "devicePixelRatio", { value: 3, configurable: true });
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
  });

  it("opens from every route and shows attached app context", async () => {
    renderReporter();

    fireEvent.click(screen.getByRole("button", { name: "Report a bug" }));

    expect(await screen.findByRole("dialog", { name: "Report a bug" })).toBeInTheDocument();
    expect(screen.getByText("Attached demo context")).toBeInTheDocument();
    expect(screen.getByText("Phase detail")).toBeInTheDocument();
    expect(screen.getByText("/project/proj-1/phase/phase-1?tab=materials")).toBeInTheDocument();
    expect(screen.getByText("390×844 @3x")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("James Harrison · admin")).toBeInTheDocument());
  });

  it("requires issue text and shows a demo sent notification", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    renderReporter("/inventory");

    fireEvent.click(screen.getByRole("button", { name: "Report a bug" }));
    const dialog = await screen.findByRole("dialog", { name: "Report a bug" });
    expect(within(dialog).getByRole("button", { name: "Send report" })).toBeDisabled();

    fireEvent.change(within(dialog).getByLabelText("Bug or issue"), {
      target: { value: "The pickup sheet did not save my quantity." },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Send report" }));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Bug report sent", expect.objectContaining({
      description: "Thanks — the demo report details were captured.",
    })));
    expect(info).toHaveBeenCalledWith("Demo bug report", expect.objectContaining({
      issue: "The pickup sheet did not save my quantity.",
      context: expect.objectContaining({ routeLabel: "Inventory Tracker", path: "/inventory" }),
    }));
    expect(screen.queryByRole("dialog", { name: "Report a bug" })).not.toBeInTheDocument();

    info.mockRestore();
  });

  it("labels unknown routes in the attached context", async () => {
    renderReporter("/missing");

    fireEvent.click(screen.getByRole("button", { name: "Report a bug" }));

    expect(await screen.findByRole("dialog", { name: "Report a bug" })).toBeInTheDocument();
    expect(screen.getByText("Unknown screen")).toBeInTheDocument();
    expect(screen.getByText("/missing")).toBeInTheDocument();
  });
});
