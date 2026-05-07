import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { uploadPhotoEvidence, type UploadPhotoEvidenceInput } from "@/lib/api";
import type { Deficiency, PhotoEvidencePurpose } from "@/lib/types";

interface PhotoUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phaseId: string;
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
  phaseId,
  projectId,
  deficiencies,
}: PhotoUploadDialogProps) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [purpose, setPurpose] = useState<PhotoEvidencePurpose>("general");
  const [deficiencyId, setDeficiencyId] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

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
        qc.invalidateQueries({ queryKey: ["phase", phaseId] });
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
    if (DEFICIENCY_PURPOSES.includes(purpose) && !deficiencyId) {
      toast.error("Please select a deficiency for this photo");
      return;
    }
    mutation.mutate({
      projectId,
      phaseId,
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
          <DialogDescription>Add a photo to this phase.</DialogDescription>
        </DialogHeader>

        <form className="grid gap-4 py-2" onSubmit={handleSubmit}>
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
                  {deficiencies.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No deficiencies on this phase
                    </SelectItem>
                  ) : (
                    deficiencies.map((d) => (
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
