import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { Camera, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { completeInspection, type CompleteInspectionInput } from "@/lib/api";

interface InspectionResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gateId: string;
  phaseId: string;
  projectId: string;
  phaseLabel: string;
  mode: "passed" | "failed";
}

export function InspectionResultDialog({
  open,
  onOpenChange,
  gateId,
  phaseId,
  projectId,
  phaseLabel,
  mode,
}: InspectionResultDialogProps) {
  const qc = useQueryClient();
  const [inspectorName, setInspectorName] = useState("");
  const [inspectionDate, setInspectionDate] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [deficiencyTitle, setDeficiencyTitle] = useState("");
  const [deficiencyDescription, setDeficiencyDescription] = useState("");
  const [deficiencySeverity, setDeficiencySeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setInspectorName("");
    setInspectionDate(undefined);
    setNotes("");
    setPhoto(null);
    setDeficiencyTitle("");
    setDeficiencyDescription("");
    setDeficiencySeverity("medium");
  };

  const mutation = useMutation({
    mutationFn: (input: CompleteInspectionInput) => completeInspection(input),
    onSuccess: (res) => {
      if (res.ok === true) {
        toast.success(`Inspection ${mode} for ${phaseLabel}`);
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
    
    if (!inspectorName.trim()) {
      toast.error("Inspector name is required");
      return;
    }
    if (!inspectionDate) {
      toast.error("Inspection date is required");
      return;
    }
    if (mode === "failed" && !notes.trim()) {
      toast.error("Notes are required for failed inspection");
      return;
    }
    if (mode === "failed" && !photo) {
      toast.error("Photo evidence is required for failed inspection");
      return;
    }
    if (mode === "failed" && !deficiencyTitle.trim()) {
      toast.error("Deficiency title is required");
      return;
    }
    if (mode === "failed" && !deficiencyDescription.trim()) {
      toast.error("Deficiency description is required");
      return;
    }

    mutation.mutate({
      gateId,
      phaseId,
      projectId,
      passed: mode === "passed",
      inspectorName: inspectorName.trim(),
      inspectionDate: inspectionDate ? format(inspectionDate, "yyyy-MM-dd") : "",
      notes: notes.trim() || undefined,
      photo: photo ?? undefined,
      deficiencyTitle: mode === "failed" ? deficiencyTitle.trim() : undefined,
      deficiencyDescription: mode === "failed" ? deficiencyDescription.trim() : undefined,
      deficiencySeverity: mode === "failed" ? deficiencySeverity : undefined,
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
      <DialogContent className="md:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Inspection Result — {phaseLabel}</DialogTitle>
          <DialogDescription>
            {mode === "passed" 
              ? "Record a successful inspection to close this phase."
              : "Record a failed inspection. This will create a deficiency and block the phase."}
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4 py-2" onSubmit={handleSubmit}>
          <div className="grid gap-1.5">
            <Label htmlFor="inspector-name">Inspector name *</Label>
            <Input
              id="inspector-name"
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              placeholder="Enter inspector name"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="inspection-date">Inspection date *</Label>
            <DatePicker
              id="inspection-date"
              value={inspectionDate}
              onChange={setInspectionDate}
              placeholder="Select inspection date"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="ir-notes">Notes {mode === "failed" ? "*" : "(optional)"}</Label>
            <Textarea
              id="ir-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={mode === "failed" ? "Describe the failure details..." : "Any additional observations..."}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="ir-photo">Photo evidence {mode === "failed" ? "*" : "(optional)"}</Label>
            <input
              ref={fileRef}
              id="ir-photo"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="outline"
              className="justify-start gap-2"
              onClick={() => fileRef.current?.click()}
            >
              {photo ? (
                <>
                  <Camera className="h-4 w-4" />
                  {photo.name}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload a photo
                </>
              )}
            </Button>
            {photo && (
              <button
                type="button"
                className="text-xs text-muted-foreground underline text-left"
                onClick={() => { setPhoto(null); if (fileRef.current) fileRef.current.value = ""; }}
              >
                Remove photo
              </button>
            )}
          </div>

          {mode === "failed" && (
            <>
              <div className="grid gap-1.5">
                <Label htmlFor="deficiency-title">Deficiency title *</Label>
                <Input
                  id="deficiency-title"
                  value={deficiencyTitle}
                  onChange={(e) => setDeficiencyTitle(e.target.value)}
                  placeholder="Brief title of the issue"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="deficiency-description">Deficiency description *</Label>
                <Textarea
                  id="deficiency-description"
                  value={deficiencyDescription}
                  onChange={(e) => setDeficiencyDescription(e.target.value)}
                  rows={3}
                  placeholder="Detailed description of the deficiency..."
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="deficiency-severity">Severity *</Label>
                <Select value={deficiencySeverity} onValueChange={(v: any) => setDeficiencySeverity(v)}>
                  <SelectTrigger id="deficiency-severity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : mode === "passed" ? "Mark Passed" : "Mark Failed"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
