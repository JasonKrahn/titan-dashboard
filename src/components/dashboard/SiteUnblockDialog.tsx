import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { unblockSiteCheck, type UnblockSiteCheckInput } from "@/lib/api";
import type { PhotoEvidence } from "@/lib/types";

interface SiteUnblockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gateId: string;
  phaseId: string;
  projectId: string;
  phaseLabel: string;
  photoEvidence: PhotoEvidence[];
}

export function SiteUnblockDialog({ open, onOpenChange, gateId, phaseId, projectId, phaseLabel, photoEvidence }: SiteUnblockDialogProps) {
  const qc = useQueryClient();

  const gatePhotos = photoEvidence.filter((p) => p.gateId === gateId);
  const hasBeforePhoto = gatePhotos.length > 0;

  const mutation = useMutation({
    mutationFn: (input: UnblockSiteCheckInput) => unblockSiteCheck(input),
    onSuccess: (res) => {
      if (res.ok === true) {
        toast.success(`Site check cleared for ${phaseLabel}`);
        qc.invalidateQueries({ queryKey: ["project", projectId] });
        qc.invalidateQueries({ queryKey: ["phase", phaseId] });
        onOpenChange(false);
        return;
      }
      toast.error(res.error.message);
    },
  });

  const handleConfirm = () => {
    mutation.mutate({
      gateId,
      phaseId,
      projectId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Clear Site Check Block — {phaseLabel}</DialogTitle>
          <DialogDescription>
            This will mark the site check as passed and set the phase to in progress. Are you sure the blocking issue has been resolved?
          </DialogDescription>
        </DialogHeader>

        {hasBeforePhoto && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
            <p className="text-sm text-destructive font-medium">After photo required</p>
            <p className="text-xs text-destructive/80 mt-1">
              This gate already has photo evidence. Please upload an after photo before clearing the site check.
            </p>
          </div>
        )}

        <DialogFooter className="pt-4">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={mutation.isPending || hasBeforePhoto} onClick={handleConfirm}>
            {mutation.isPending ? "Clearing…" : "Site Cleared"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
