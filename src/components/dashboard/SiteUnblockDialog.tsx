import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { unblockSiteCheck, type UnblockSiteCheckInput } from "@/lib/api";

interface SiteUnblockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gateId: string;
  phaseId: string;
  projectId: string;
  phaseLabel: string;
}

export function SiteUnblockDialog({ open, onOpenChange, gateId, phaseId, projectId, phaseLabel }: SiteUnblockDialogProps) {
  const qc = useQueryClient();

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
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Clear Site Check Block — {phaseLabel}</DialogTitle>
          <DialogDescription>
            This will mark the site check as passed and set the phase to in progress. Are you sure the blocking issue has been resolved?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="pt-4">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={mutation.isPending} onClick={handleConfirm}>
            {mutation.isPending ? "Clearing…" : "Site Cleared"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
