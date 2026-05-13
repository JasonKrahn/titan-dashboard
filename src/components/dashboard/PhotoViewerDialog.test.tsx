import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PhotoViewerDialog, type PhotoViewerItem } from "./PhotoViewerDialog";
import { getPhotoViewUrl } from "@/lib/api";
import type { PhotoEvidence } from "@/lib/types";

vi.mock("@/lib/api", () => ({
  getPhotoViewUrl: vi.fn(),
}));

const basePhoto: Omit<PhotoEvidence, "id" | "purpose" | "objectKey"> = {
  projectId: "project-1",
  phaseId: "phase-1",
  mimeType: "image/jpeg",
  fileSizeBytes: 2048,
  status: "confirmed",
  uploadedByUserId: "user-1",
  createdAt: "2026-05-01T10:00:00.000Z",
  updatedAt: "2026-05-01T10:00:00.000Z",
};

const items: PhotoViewerItem[] = [
  {
    photo: {
      ...basePhoto,
      id: "photo-before",
      purpose: "deficiency_before",
      objectKey: "before.jpg",
      deficiencyId: "def-1",
    },
    caption: "Deficiency: Vapor barrier discontinuity, Before",
  },
  {
    photo: {
      ...basePhoto,
      id: "photo-after",
      purpose: "deficiency_after",
      objectKey: "after.jpg",
      deficiencyId: "def-1",
    },
    caption: "Deficiency: Vapor barrier discontinuity, After",
  },
];

describe("PhotoViewerDialog", () => {
  it("starts on the clicked image and renders its caption", async () => {
    vi.mocked(getPhotoViewUrl).mockResolvedValue({
      ok: true,
      data: { url: "https://example.com/after.jpg", expiresAt: "2026-05-01T11:00:00.000Z" },
    });

    render(<PhotoViewerDialog open onOpenChange={() => {}} items={items} initialPhotoId="photo-after" />);

    expect(await screen.findByText("Deficiency: Vapor barrier discontinuity, After")).toBeInTheDocument();
    expect(screen.getByText("Confirmed · Uploaded May 1, 2026 · 2 KB · image/jpeg")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveClass("overflow-hidden");
    expect(screen.getByRole("img")).toHaveClass("h-full", "w-full", "object-contain");
    expect(screen.getByText("Photo 2 of 2").parentElement).toHaveClass("shrink-0");
    expect(screen.getByRole("button", { name: "Previous photo" })).toHaveClass("inline-flex");
    expect(getPhotoViewUrl).toHaveBeenCalledWith("photo-after");
  });

  it("navigates with buttons and arrow keys without wrapping at boundaries", async () => {
    vi.mocked(getPhotoViewUrl).mockImplementation(async (photoId) => ({
      ok: true,
      data: { url: `https://example.com/${photoId}.jpg`, expiresAt: "2026-05-01T11:00:00.000Z" },
    }));

    render(<PhotoViewerDialog open onOpenChange={() => {}} items={items} initialPhotoId="photo-before" />);

    expect(await screen.findByText("Deficiency: Vapor barrier discontinuity, Before")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous photo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next photo" })).not.toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Next photo" }));

    expect(await screen.findByText("Deficiency: Vapor barrier discontinuity, After")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next photo" })).toBeDisabled();

    fireEvent.keyDown(window, { key: "ArrowLeft" });

    await waitFor(() => {
      expect(screen.getByText("Deficiency: Vapor barrier discontinuity, Before")).toBeInTheDocument();
    });

    fireEvent.keyDown(window, { key: "ArrowRight" });

    await waitFor(() => {
      expect(screen.getByText("Deficiency: Vapor barrier discontinuity, After")).toBeInTheDocument();
    });
  });

  it("navigates between photos with horizontal swipe gestures", async () => {
    vi.mocked(getPhotoViewUrl).mockImplementation(async (photoId) => ({
      ok: true,
      data: { url: `https://example.com/${photoId}.jpg`, expiresAt: "2026-05-01T11:00:00.000Z" },
    }));

    render(<PhotoViewerDialog open onOpenChange={() => {}} items={items} initialPhotoId="photo-before" />);

    expect(await screen.findByText("Deficiency: Vapor barrier discontinuity, Before")).toBeInTheDocument();
    const swipeTarget = screen.getByRole("img").parentElement!;

    fireEvent.touchStart(swipeTarget, {
      touches: [{ clientX: 320, clientY: 220 }],
      changedTouches: [{ clientX: 320, clientY: 220 }],
      targetTouches: [{ clientX: 320, clientY: 220 }],
    });
    fireEvent.touchEnd(swipeTarget, {
      changedTouches: [{ clientX: 120, clientY: 230 }],
      targetTouches: [{ clientX: 120, clientY: 230 }],
    });

    await waitFor(() => {
      expect(screen.getByText("Deficiency: Vapor barrier discontinuity, After")).toBeInTheDocument();
    });

    fireEvent.touchStart(swipeTarget, {
      touches: [{ clientX: 120, clientY: 220 }],
      changedTouches: [{ clientX: 120, clientY: 220 }],
      targetTouches: [{ clientX: 120, clientY: 220 }],
    });
    fireEvent.touchEnd(swipeTarget, {
      changedTouches: [{ clientX: 320, clientY: 230 }],
      targetTouches: [{ clientX: 320, clientY: 230 }],
    });

    await waitFor(() => {
      expect(screen.getByText("Deficiency: Vapor barrier discontinuity, Before")).toBeInTheDocument();
    });
  });
});
