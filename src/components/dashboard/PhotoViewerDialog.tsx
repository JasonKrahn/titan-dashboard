import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPhotoViewUrl } from "@/lib/api";
import type { PhotoEvidence } from "@/lib/types";

interface PhotoViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photo: PhotoEvidence | null;
}

export function PhotoViewerDialog({ open, onOpenChange, photo }: PhotoViewerDialogProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !photo) {
      setBlobUrl(null);
      return;
    }
    let cancelled = false;
    getPhotoViewUrl(photo.id).then((res) => {
      if (!cancelled && res.ok && res.data.url) {
        setBlobUrl(res.data.url);
      }
    });
    return () => { cancelled = true; };
  }, [open, photo?.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0">
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 z-10 bg-background/80 hover:bg-background"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
          {photo ? (
            <div className="flex aspect-video items-center justify-center bg-muted overflow-hidden">
              {blobUrl ? (
                <img
                  src={blobUrl}
                  alt={photo.purpose.replace(/_/g, " ")}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <div className="flex h-32 w-32 items-center justify-center rounded-full bg-muted">
                    <span className="text-4xl">📷</span>
                  </div>
                  <p className="text-sm capitalize">{photo.purpose.replace(/_/g, " ")}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center bg-muted">
              <p className="text-muted-foreground">No photo selected</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
