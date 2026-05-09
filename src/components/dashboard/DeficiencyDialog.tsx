import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createDeficiency, updateDeficiency, type CreateDeficiencyInput, type UpdateDeficiencyInput } from "@/lib/api";
import type { Deficiency, Phase } from "@/lib/types";
import { PHASE_LABEL } from "@/lib/derived";

interface DeficiencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phaseId?: string;
  projectId: string;
  phaseLabel?: string;
  mode: "create" | "edit" | "resolve";
  deficiency?: Deficiency;
  phases?: Phase[];
}

export function DeficiencyDialog({
  open,
  onOpenChange,
  phaseId: propPhaseId,
  projectId,
  phaseLabel: propPhaseLabel,
  mode,
  deficiency,
  phases,
}: DeficiencyDialogProps) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [photo, setPhoto] = useState<File | null>(null);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | undefined>(propPhaseId);
  const fileRef = useRef<HTMLInputElement>(null);

  const phaseId = selectedPhaseId;
  const phaseLabel = phaseId && phases ? PHASE_LABEL[phases.find(p => p.id === phaseId)?.type || "insulation"] : propPhaseLabel;

  useEffect(() => {
    if (mode === "edit" && deficiency) {
      setTitle(deficiency.title);
      setDescription(deficiency.description || "");
      setSeverity(deficiency.severity);
    } else if (mode === "resolve" && deficiency) {
      setTitle(deficiency.title);
      setDescription(deficiency.description || "");
      setSeverity(deficiency.severity);
    } else {
      setTitle("");
      setDescription("");
      setSeverity("medium");
    }
    setPhoto(null);
    if (fileRef.current) fileRef.current.value = "";
    setSelectedPhaseId(propPhaseId);
  }, [mode, deficiency, open, propPhaseId]);

  const reset = () => {
    setTitle("");
    setDescription("");
    setSeverity("medium");
    setPhoto(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const createMutation = useMutation({
    mutationFn: (input: CreateDeficiencyInput) => createDeficiency(input),
    onSuccess: (res) => {
      if (res.ok === true) {
        toast.success("Deficiency created");
        qc.invalidateQueries({ queryKey: ["project", projectId] });
        qc.invalidateQueries({ queryKey: ["phase", phaseId] });
        reset();
        onOpenChange(false);
        return;
      }
      toast.error(res.error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateDeficiencyInput }) => updateDeficiency(id, input),
    onSuccess: (res) => {
      if (res.ok === true) {
        toast.success(mode === "resolve" ? "Deficiency resolved" : "Deficiency updated");
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

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!phaseId) {
      toast.error("Phase is required");
      return;
    }
    if (mode === "resolve" && !photo) {
      toast.error("Photo evidence is required to resolve deficiency");
      return;
    }

    if (mode === "create") {
      createMutation.mutate({
        projectId,
        phaseId,
        title: title.trim(),
        description: description.trim() || undefined,
        severity,
        photo: photo ?? undefined,
      });
    } else if (mode === "resolve" && deficiency) {
      updateMutation.mutate({
        id: deficiency.id,
        input: {
          status: "resolved",
          photo: photo ?? undefined,
        },
      });
    } else if (mode === "edit" && deficiency) {
      updateMutation.mutate({
        id: deficiency.id,
        input: {
          title: title.trim(),
          description: description.trim() || undefined,
          severity,
        },
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

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
          <DialogTitle>
            {mode === "create" ? "Add Deficiency" : mode === "resolve" ? "Resolve Deficiency" : "Edit Deficiency"} {phaseLabel ? `— ${phaseLabel}` : ""}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Log a new deficiency."
              : mode === "resolve"
              ? "Mark this deficiency as resolved with photo evidence."
              : "Update the deficiency details."}
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4 py-2" onSubmit={handleSubmit}>
          {mode === "create" && !propPhaseId && phases && (
            <div className="grid gap-1.5">
              <Label htmlFor="def-phase">Phase *</Label>
              <Select value={selectedPhaseId} onValueChange={setSelectedPhaseId}>
                <SelectTrigger id="def-phase">
                  <SelectValue placeholder="Select phase" />
                </SelectTrigger>
                <SelectContent>
                  {phases.map((phase) => (
                    <SelectItem key={phase.id} value={phase.id}>
                      {PHASE_LABEL[phase.type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {mode !== "resolve" && (
            <div className="grid gap-1.5">
              <Label htmlFor="def-title">Title *</Label>
              <Input
                id="def-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief title of the issue"
              />
            </div>
          )}

          {mode !== "resolve" && (
            <div className="grid gap-1.5">
              <Label htmlFor="def-description">Description</Label>
              <Textarea
                id="def-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Detailed description of the deficiency..."
              />
            </div>
          )}

          {mode !== "resolve" && (
            <div className="grid gap-1.5">
              <Label htmlFor="def-severity">Severity *</Label>
              <div className="flex items-center gap-2">
                <Select value={severity} onValueChange={(v: any) => setSeverity(v)}>
                  <SelectTrigger id="def-severity" className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <SeverityBadge severity={severity} size="sm" />
              </div>
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="def-photo">Photo evidence {mode === "resolve" ? "*" : "(optional)"}</Label>
            <input
              ref={fileRef}
              id="def-photo"
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

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : mode === "create" ? "Create" : mode === "resolve" ? "Resolve" : "Update"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
