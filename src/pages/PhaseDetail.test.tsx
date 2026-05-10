import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import PhaseDetailPage from "./PhaseDetail";
import type { PhaseDetail } from "@/lib/types";

const { getPhase, getCurrentUser, getPhotoViewUrl, getUsers, setCurrentUser } = vi.hoisted(() => ({
  getPhase: vi.fn(),
  getCurrentUser: vi.fn(),
  getPhotoViewUrl: vi.fn(),
  getUsers: vi.fn(),
  setCurrentUser: vi.fn(),
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    getPhase,
    getCurrentUser,
    getPhotoViewUrl,
    getUsers,
    setCurrentUser,
    markPhaseReadyForInspection: vi.fn(),
    updatePhase: vi.fn(),
    assignSubcontractorToPhase: vi.fn(),
    updateUser: vi.fn(),
  };
});

const detail: PhaseDetail = {
  project: {
    id: "proj-1",
    clientId: "client-1",
    projectNumber: "ACM-1002",
    name: "Acme Cedar Point Villas",
    siteAddress: "220 Cedar Point Drive",
    status: "active",
    atticCheckStatus: "not_started",
    scheduledStart: "2026-04-21T00:00:00.000Z",
    scheduledEnd: "2026-06-06T00:00:00.000Z",
    updatedAt: "2026-05-08T10:00:00.000Z",
    createdAt: "2026-04-01T00:00:00.000Z",
  },
  phase: {
    id: "phase-1",
    projectId: "proj-1",
    type: "insulation",
    status: "in_progress",
    scheduledStart: "2026-04-23T00:00:00.000Z",
    scheduledEnd: "2026-05-11T00:00:00.000Z",
    assignedSubcontractorId: "sub-1",
    updatedAt: "2026-05-08T10:00:00.000Z",
    createdAt: "2026-04-01T00:00:00.000Z",
  },
  assignedProjectManager: {
    id: "user-1",
    role: "project_manager",
    fullName: "Priya Patel",
    email: "priya@example.com",
    active: true,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
  },
  gates: [
    {
      id: "gate-site",
      projectId: "proj-1",
      phaseId: "phase-1",
      type: "site_check",
      status: "passed",
      requiredPhotoEvidence: true,
      notes: "Site check passed and prep complete.",
      updatedAt: "2026-05-08T10:00:00.000Z",
      createdAt: "2026-04-01T00:00:00.000Z",
    },
    {
      id: "gate-inspection",
      projectId: "proj-1",
      phaseId: "phase-1",
      type: "inspection",
      status: "not_started",
      requiredPhotoEvidence: false,
      updatedAt: "2026-05-07T10:00:00.000Z",
      createdAt: "2026-04-01T00:00:00.000Z",
    },
  ],
  deficiencies: [
    {
      id: "def-1",
      projectId: "proj-1",
      phaseId: "phase-1",
      title: "Missing vapor barrier",
      severity: "medium",
      status: "open",
      createdAt: "2026-05-08T10:00:00.000Z",
      updatedAt: "2026-05-08T10:00:00.000Z",
    },
  ],
  photoEvidence: [
    {
      id: "photo-1",
      projectId: "proj-1",
      phaseId: "phase-1",
      gateId: "gate-site",
      purpose: "site_check",
      objectKey: "site-check-1",
      mimeType: "image/jpeg",
      status: "confirmed",
      uploadedByUserId: "user-1",
      createdAt: "2026-05-08T10:00:00.000Z",
      updatedAt: "2026-05-08T10:00:00.000Z",
    },
  ],
  subcontractors: [
    {
      id: "sub-1",
      displayName: "Mike Thompson",
      trade: "insulation",
      active: true,
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
    },
  ],
  auditEvents: [],
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/project/proj-1/phase/phase-1"]}>
        <Routes>
          <Route path="/project/:projectId/phase/:phaseId" element={<PhaseDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("PhaseDetailPage desktop status rail", () => {
  beforeEach(() => {
    getPhase.mockResolvedValue({ ok: true, data: detail });
    getCurrentUser.mockResolvedValue({ ok: false, error: { message: "No current user" } });
    getPhotoViewUrl.mockResolvedValue({ ok: true, data: { url: "https://example.com/photo.jpg" } });
    getUsers.mockResolvedValue({ ok: true, data: [detail.assignedProjectManager] });
  });

  it("opens the deficiencies tab from the open deficiencies summary", async () => {
    renderPage();

    await screen.findByRole("heading", { name: "Insulation" });

    fireEvent.click(screen.getByRole("button", { name: /open deficiencies summary/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add deficiency/i })).toBeInTheDocument();
    });
  });

  it("focuses the site check work card from the status summary", async () => {
    renderPage();

    await screen.findByRole("heading", { name: "Insulation" });

    fireEvent.click(screen.getByRole("button", { name: /site check summary/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Site check" })).toHaveFocus();
    });
  });
});
