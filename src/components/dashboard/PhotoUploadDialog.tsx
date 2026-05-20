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
  allowAllPhases?: boolean;
  onUploadSuccess?: () => void;
  defaultPurpose?: PhotoEvidencePurpose;
  hidePurpose?: boolean;
}

const PURPOSE_OPTIONS: { value: PhotoEvidencePurpose; label: string }[] = [
  { value: "general", label: "General" },
  { value: "site_check", label: "Site Check" },
  { value: "inspection", label: "Inspection" },
  { value: "deficiency_before", label: "Deficiency — Before" },
  { value: "deficiency_after", label: "Deficiency — After" },
];

const DEFICIENCY_PURPOSES: PhotoEvidencePurpose[] = ["deficiency_before", "deficiency_after"];
const ALL_PHASES_VALUE = "__all_phases__";

function resultErrorMessage(res: Awaited<ReturnType<typeof uploadPhotoEvidence>>) {
  return res.ok ? undefined : res.error.message;
}

export function PhotoUploadDialog({
  open,
  onOpenChange,
  phases,
  defaultPhaseId,
  projectId,
  deficiencies,
  allowAllPhases = false,
  onUploadSuccess,
  defaultPurpose,
  hidePurpose = false,
}: PhotoUploadDialogProps) {
  const qc = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);
  const [purpose, setPurpose] = useState<PhotoEvidencePurpose>(defaultPurpose || "general");
  const [deficiencyId, setDeficiencyId] = useState<string>("");
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);
  const showDeficiencySelect = DEFICIENCY_PURPOSES.includes(purpose);
  const isAllPhases = selectedPhaseId === ALL_PHASES_VALUE;

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
      if (defaultPurpose) {
        setPurpose(defaultPurpose);
      }
    }
  }, [open, initialPhaseId, defaultPurpose]);

  // Filter deficiencies by selected phase
  const selectedPhaseDeficiencies = useMemo(
    () => deficiencies.filter(d => d.phaseId === selectedPhaseId),
    [deficiencies, selectedPhaseId],
  );

  const reset = () => {
    setFiles([]);
    setPurpose("general");
    setDeficiencyId("");
    if (fileRef.current) fileRef.current.value = "";
  };

  useEffect(() => {
    if (!open) reset();
  }, [open]);

  const mutation = useMutation({
    mutationFn: (inputs: UploadPhotoEvidenceInput[]) => Promise.all(inputs.map((input) => uploadPhotoEvidence(input))),
    onSuccess: (results) => {
      const failed = results.find((res) => !res.ok);
      if (!failed) {
        toast.success(results.length === 1 ? "Photo uploaded" : `${results.length} photos uploaded`);
        qc.invalidateQueries({ queryKey: ["project", projectId] });
        if (!isAllPhases) {
          qc.invalidateQueries({ queryKey: ["phase", selectedPhaseId] });
        }
        onUploadSuccess?.();
        onOpenChange(false);
        return;
      }
      toast.error(resultErrorMessage(failed) ?? "Photo upload failed");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      toast.error("Please select at least one photo");
      return;
    }
    if (!selectedPhaseId) {
      toast.error("Please select a phase");
      return;
    }
    if (showDeficiencySelect && isAllPhases) {
      toast.error("Please select a phase for deficiency photos");
      return;
    }
    if (showDeficiencySelect && !deficiencyId) {
      toast.error("Please select a deficiency for this photo");
      return;
    }
    mutation.mutate(files.map((file) => ({
      projectId,
      phaseId: isAllPhases ? undefined : selectedPhaseId,
      purpose,
      file,
      deficiencyId: showDeficiencySelect ? deficiencyId : undefined,
    })));
  };

  const selectedFileLabel =
    files.length === 0 ? "Choose photo" : files.length === 1 ? files[0].name : `${files.length} photos selected`;

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
                onValueChange={(value) => {
                  setSelectedPhaseId(value);
                  setDeficiencyId("");
                }}
              >
                <SelectTrigger id="photo-phase">
                  <SelectValue placeholder="Select phase" />
                </SelectTrigger>
                <SelectContent>
                  {allowAllPhases && !showDeficiencySelect && (
                    <SelectItem value={ALL_PHASES_VALUE}>All Phases</SelectItem>
                  )}
                  {phases.map((phase) => (
                    <SelectItem key={phase.id} value={phase.id}>
                      {PHASE_LABEL[phase.type] ?? phase.type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!hidePurpose && (
            <div className="grid gap-1.5">
              <Label htmlFor="photo-purpose">Purpose *</Label>
              <Select
                value={purpose}
                onValueChange={(v) => {
                  const nextPurpose = v as PhotoEvidencePurpose;
                  setPurpose(nextPurpose);
                  setDeficiencyId("");
                  if (DEFICIENCY_PURPOSES.includes(nextPurpose)) {
                    setFiles((current) => current.slice(0, 1));
                    if (selectedPhaseId === ALL_PHASES_VALUE) {
                      setSelectedPhaseId(initialPhaseId);
                    }
                    if (fileRef.current) fileRef.current.value = "";
                  }
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
          )}

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
              multiple={!showDeficiencySelect}
              className="hidden"
              onChange={(e) => {
                const selected = Array.from(e.target.files ?? []);
                setFiles(showDeficiencySelect ? selected.slice(0, 1) : selected);
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="justify-start gap-2"
              onClick={() => fileRef.current?.click()}
            >
              {files.length > 0 ? (
                <>
                  <Camera className="h-4 w-4" />
                  {selectedFileLabel}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Choose photo
                </>
              )}
            </Button>
            {files.length > 0 && (
              <button
                type="button"
                className="text-xs text-muted-foreground underline text-left"
                onClick={() => { setFiles([]); if (fileRef.current) fileRef.current.value = ""; }}
              >
                Remove {files.length === 1 ? "photo" : "photos"}
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
