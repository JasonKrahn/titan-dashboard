import { useState, useEffect, useRef, useCallback, type TouchEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getPhotoViewUrl } from "@/lib/api";
import type { PhotoEvidence } from "@/lib/types";

export interface PhotoViewerItem {
  photo: PhotoEvidence;
  caption: string;
}

interface PhotoViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: PhotoViewerItem[];
  initialPhotoId: string | null;
}

function formatPhotoDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatPhotoStatus(value: PhotoEvidence["status"]) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatPhotoSize(value?: number) {
  if (!value) return undefined;
  return `${Math.max(1, Math.round(value / 1024))} KB`;
}

function photoMetadata(photo: PhotoEvidence) {
  return [
    formatPhotoStatus(photo.status),
    `Uploaded ${formatPhotoDate(photo.createdAt)}`,
    formatPhotoSize(photo.fileSizeBytes),
    photo.mimeType,
  ].filter(Boolean).join(" · ");
}

export function PhotoViewerDialog({ open, onOpenChange, items, initialPhotoId }: PhotoViewerDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const activeItem = items[currentIndex] ?? null;
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < items.length - 1;
  const goPrevious = useCallback(() => setCurrentIndex((index) => Math.max(0, index - 1)), []);
  const goNext = useCallback(() => setCurrentIndex((index) => Math.min(items.length - 1, index + 1)), [items.length]);

  useEffect(() => {
    if (!open) return;
    const initialIndex = items.findIndex((item) => item.photo.id === initialPhotoId);
    setCurrentIndex(initialIndex >= 0 ? initialIndex : 0);
  }, [open, initialPhotoId, items]);

  useEffect(() => {
    if (!open || !activeItem) {
      setBlobUrl(null);
      return;
    }
    let cancelled = false;
    setBlobUrl(null);
    getPhotoViewUrl(activeItem.photo.id).then((res) => {
      if (!cancelled && res.ok && res.data.url) {
        setBlobUrl(res.data.url);
      }
    });
    return () => { cancelled = true; };
  }, [open, activeItem]);

  useEffect(() => {
    if (!open || items.length <= 1) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        goPrevious();
      }
      if (event.key === "ArrowRight") {
        goNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrevious, open, items.length]);

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (items.length <= 1 || touchStartXRef.current === null || touchStartYRef.current === null) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartXRef.current;
    const deltaY = touch.clientY - touchStartYRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;

    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;

    if (deltaX < 0) {
      goNext();
    } else {
      goPrevious();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="gap-0 overflow-hidden p-0 md:h-[90vh] md:max-h-[90vh] md:max-w-[90vw] md:p-0 md:pb-0"
        overlayClassName="md:backdrop-blur-sm"
      >
        <DialogTitle className="sr-only">Photo viewer</DialogTitle>
        <div className="relative flex max-h-[90vh] min-h-0 flex-col md:h-full md:max-h-full">
          {activeItem ? (
            <div className="flex max-h-[90vh] min-h-0 flex-col overflow-hidden bg-muted md:h-full md:max-h-full">
              <div
                className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {blobUrl ? (
                  <img
                    src={blobUrl}
                    alt={activeItem.caption}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                    <div className="flex h-32 w-32 items-center justify-center rounded-full bg-muted">
                      <span className="text-4xl">📷</span>
                    </div>
                    <p className="text-sm">{activeItem.caption}</p>
                  </div>
                )}
                {items.length > 1 && (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      aria-label="Previous photo"
                      disabled={!canGoPrevious}
                      onClick={goPrevious}
                      className="absolute left-3 top-1/2 inline-flex -translate-y-1/2 rounded-full bg-background/80 shadow"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      aria-label="Next photo"
                      disabled={!canGoNext}
                      onClick={goNext}
                      className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 rounded-full bg-background/80 shadow"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </>
                )}
              </div>
              <div className="shrink-0 border-t border-border bg-background px-4 py-3 text-sm" aria-live="polite">
                <p className="font-medium">{activeItem.caption}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{photoMetadata(activeItem.photo)}</p>
                {items.length > 1 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Photo {currentIndex + 1} of {items.length}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex min-h-[200px] items-center justify-center bg-muted">
              <p className="text-muted-foreground">No photo selected</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
