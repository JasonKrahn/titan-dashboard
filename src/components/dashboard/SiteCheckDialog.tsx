import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { completeSiteCheck, type CompleteSiteCheckInput } from "@/lib/api";

interface SiteCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gateId: string;
  phaseId: string;
  projectId: string;
  phaseLabel: string;
}

export function SiteCheckDialog({ open, onOpenChange, gateId, phaseId, projectId, phaseLabel }: SiteCheckDialogProps) {
  const qc = useQueryClient();
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setNotes("");
    setPhotos([]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const mutation = useMutation({
    mutationFn: (input: CompleteSiteCheckInput) => completeSiteCheck(input),
    onSuccess: (res) => {
      if (res.ok === true) {
        toast.success(`Site check completed for ${phaseLabel}`);
        qc.invalidateQueries({ queryKey: ["project", projectId] });
        qc.invalidateQueries({ queryKey: ["phase", phaseId] });
        reset();
        onOpenChange(false);
        return;
      }
      toast.error(res.error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      gateId,
      phaseId,
      projectId,
      notes: notes.trim() || undefined,
      photos,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="md:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Site Check — {phaseLabel}</DialogTitle>
          <DialogDescription>Confirm the site has been visited and is ready for this phase to begin.</DialogDescription>
        </DialogHeader>

        <form className="grid gap-4 py-2" onSubmit={handleSubmit}>
          <div className="grid gap-1.5">
            <Label htmlFor="sc-photo">Photo (optional)</Label>
            <input
              ref={fileRef}
              id="sc-photo"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}
            />
            <Button
              type="button"
              variant="outline"
              className="justify-start gap-2"
              onClick={() => fileRef.current?.click()}
            >
              {photos.length > 0 ? (
                <>
                  <Camera className="h-4 w-4" />
                  {photos.length === 1 ? photos[0].name : `${photos.length} photos selected`}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload a photo
                </>
              )}
            </Button>
            {photos.length > 0 && (
              <button
                type="button"
                className="text-xs text-muted-foreground underline text-left"
                onClick={() => { setPhotos([]); if (fileRef.current) fileRef.current.value = ""; }}
              >
                Remove {photos.length === 1 ? "photo" : "photos"}
              </button>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="sc-notes">Notes (optional)</Label>
            <Textarea
              id="sc-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any observations from the site visit…"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Confirm Site Check"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
