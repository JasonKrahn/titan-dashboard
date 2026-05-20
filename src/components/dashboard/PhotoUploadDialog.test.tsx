import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PhotoUploadDialog } from "./PhotoUploadDialog";
import type { Phase } from "@/lib/types";

const { uploadPhotoEvidence } = vi.hoisted(() => ({
  uploadPhotoEvidence: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  uploadPhotoEvidence,
}));

const phases: Phase[] = [
  {
    id: "phase-insulation",
    projectId: "project-1",
    type: "insulation",
    status: "in_progress",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
  },
  {
    id: "phase-drywall",
    projectId: "project-1",
    type: "drywall",
    status: "not_started",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
  },
];

function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <PhotoUploadDialog
        open
        onOpenChange={vi.fn()}
        phases={phases}
        defaultPhaseId="phase-insulation"
        projectId="project-1"
        deficiencies={[]}
        allowAllPhases
      />
    </QueryClientProvider>,
  );
}

describe("PhotoUploadDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadPhotoEvidence.mockResolvedValue({
      ok: true,
      data: {
        id: "photo-1",
        projectId: "project-1",
        purpose: "general",
        objectKey: "uploads/photo-1.jpg",
        mimeType: "image/jpeg",
        status: "confirmed",
        uploadedByUserId: "user-1",
        createdAt: "2026-05-01T00:00:00.000Z",
        updatedAt: "2026-05-01T00:00:00.000Z",
      },
    });
  });

  it("uploads each selected general photo against the selected phase", async () => {
    renderDialog();

    const files = [
      new File(["one"], "one.jpg", { type: "image/jpeg" }),
      new File(["two"], "two.jpg", { type: "image/jpeg" }),
    ];
    fireEvent.change(screen.getByLabelText("Photo *"), { target: { files } });
    fireEvent.click(screen.getByRole("button", { name: "Upload" }));

    await waitFor(() => expect(uploadPhotoEvidence).toHaveBeenCalledTimes(2));
    expect(uploadPhotoEvidence).toHaveBeenNthCalledWith(1, expect.objectContaining({
      projectId: "project-1",
      phaseId: "phase-insulation",
      purpose: "general",
      file: files[0],
    }));
    expect(uploadPhotoEvidence).toHaveBeenNthCalledWith(2, expect.objectContaining({
      projectId: "project-1",
      phaseId: "phase-insulation",
      purpose: "general",
      file: files[1],
    }));
  });

  it("submits All Phases uploads without a phase id", async () => {
    renderDialog();

    const phaseSelect = document.querySelectorAll("select")[0] as HTMLSelectElement;
    fireEvent.change(phaseSelect, { target: { value: "__all_phases__" } });

    const file = new File(["project"], "project.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("Photo *"), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Upload" }));

    await waitFor(() => expect(uploadPhotoEvidence).toHaveBeenCalledTimes(1));
    expect(uploadPhotoEvidence).toHaveBeenCalledWith(expect.objectContaining({
      projectId: "project-1",
      phaseId: undefined,
      purpose: "general",
      file,
    }));
  });
});
