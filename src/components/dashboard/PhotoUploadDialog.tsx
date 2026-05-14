import { useState, useRef, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { uploadPhotoEvidence, type UploadPhotoEvidenceInput } from "@/lib/api";
import type { Deficiency, PhotoEvidencePurpose, Phase } from "@/lib/types";
import { PHASE_LABEL } from "@/lib/derived";

interface PhotoUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phases: Phase[];
  defaultPhaseId?: string;
  projectId: string;
  deficiencies: Deficiency[];
}

const PURPOSE_OPTIONS: { value: PhotoEvidencePurpose; label: string }[] = [
  { value: "general", label: "General" },
  { value: "site_check", label: "Site Check" },
  { value: "inspection", label: "Inspection" },
  { value: "deficiency_before", label: "Deficiency — Before" },
  { value: "deficiency_after", label: "Deficiency — After" },
];

const DEFICIENCY_PURPOSES: PhotoEvidencePurpose[] = ["deficiency_before", "deficiency_after"];

export function PhotoUploadDialog({
  open,
  onOpenChange,
  phases,
  defaultPhaseId,
  projectId,
  deficiencies,
}: PhotoUploadDialogProps) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [purpose, setPurpose] = useState<PhotoEvidencePurpose>("general");
  const [deficiencyId, setDeficiencyId] = useState<string>("");
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Determine initial phase: defaultPhaseId, then first in_progress, then first phase
  const initialPhaseId = useMemo(() => {
    if (defaultPhaseId && phases.find(p => p.id === defaultPhaseId)) {
      return defaultPhaseId;
    }
    const activePhase = phases.find(p => p.status === "in_progress");
    if (activePhase) return activePhase.id;
    return phases[0]?.id ?? "";
  }, [defaultPhaseId, phases]);

  // Sync selectedPhaseId with initialPhaseId when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedPhaseId(initialPhaseId);
    }
  }, [open, initialPhaseId]);

  // Filter deficiencies by selected phase
  const selectedPhaseDeficiencies = useMemo(
    () => deficiencies.filter(d => d.phaseId === selectedPhaseId),
    [deficiencies, selectedPhaseId],
  );

  const reset = () => {
    setFile(null);
    setPurpose("general");
    setDeficiencyId("");
    if (fileRef.current) fileRef.current.value = "";
  };

  useEffect(() => {
    if (!open) reset();
  }, [open]);

  const mutation = useMutation({
    mutationFn: (input: UploadPhotoEvidenceInput) => uploadPhotoEvidence(input),
    onSuccess: (res) => {
      if (res.ok === true) {
        toast.success("Photo uploaded");
        qc.invalidateQueries({ queryKey: ["project", projectId] });
        qc.invalidateQueries({ queryKey: ["phase", selectedPhaseId] });
        onOpenChange(false);
        return;
      }
      toast.error(res.error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select a photo");
      return;
    }
    if (!selectedPhaseId) {
      toast.error("Please select a phase");
      return;
    }
    if (DEFICIENCY_PURPOSES.includes(purpose) && !deficiencyId) {
      toast.error("Please select a deficiency for this photo");
      return;
    }
    mutation.mutate({
      projectId,
      phaseId: selectedPhaseId,
      purpose,
      file,
      deficiencyId: DEFICIENCY_PURPOSES.includes(purpose) ? deficiencyId : undefined,
    });
  };

  const showDeficiencySelect = DEFICIENCY_PURPOSES.includes(purpose);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="md:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Upload Photo</DialogTitle>
          <DialogDescription>Add a photo to this project.</DialogDescription>
        </DialogHeader>

        <form className="grid gap-4 py-2" onSubmit={handleSubmit}>
          {phases.length > 1 && (
            <div className="grid gap-1.5">
              <Label htmlFor="photo-phase">Phase *</Label>
              <Select
                value={selectedPhaseId}
                onValueChange={setSelectedPhaseId}
              >
                <SelectTrigger id="photo-phase">
                  <SelectValue placeholder="Select phase" />
                </SelectTrigger>
                <SelectContent>
                  {phases.map((phase) => (
                    <SelectItem key={phase.id} value={phase.id}>
                      {PHASE_LABEL[phase.type] ?? phase.type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="photo-purpose">Purpose *</Label>
            <Select
              value={purpose}
              onValueChange={(v) => {
                setPurpose(v as PhotoEvidencePurpose);
                setDeficiencyId("");
              }}
            >
              <SelectTrigger id="photo-purpose">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PURPOSE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showDeficiencySelect && (
            <div className="grid gap-1.5">
              <Label htmlFor="photo-deficiency">Deficiency *</Label>
              <Select value={deficiencyId} onValueChange={setDeficiencyId}>
                <SelectTrigger id="photo-deficiency">
                  <SelectValue placeholder="Select deficiency" />
                </SelectTrigger>
                <SelectContent>
                  {selectedPhaseDeficiencies.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No deficiencies on this phase
                    </SelectItem>
                  ) : (
                    selectedPhaseDeficiencies.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="photo-file">Photo *</Label>
            <input
              ref={fileRef}
              id="photo-file"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="outline"
              className="justify-start gap-2"
              onClick={() => fileRef.current?.click()}
            >
              {file ? (
                <>
                  <Camera className="h-4 w-4" />
                  {file.name}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Choose photo
                </>
              )}
            </Button>
            {file && (
              <button
                type="button"
                className="text-xs text-muted-foreground underline text-left"
                onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
              >
                Remove
              </button>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Uploading…" : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
