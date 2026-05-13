import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
          {photo ? (
            <div className="flex items-center justify-center bg-muted overflow-hidden">
              {blobUrl ? (
                <img
                  src={blobUrl}
                  alt={photo.purpose.replace(/_/g, " ")}
                  className="max-h-[85vh] max-w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                  <div className="flex h-32 w-32 items-center justify-center rounded-full bg-muted">
                    <span className="text-4xl">📷</span>
                  </div>
                  <p className="text-sm capitalize">{photo.purpose.replace(/_/g, " ")}</p>
                </div>
              )}
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
