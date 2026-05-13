import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, parse, differenceInDays, isValid } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { createProject, deleteProject, updateProject, getClients, getProjects, getUsers, type CreateProjectInput, type UpdateProjectInput } from "@/lib/api";
import type { User, Project } from "@/lib/types";

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser?: User;
  presetClientId?: string;
  project?: Project;
  onCreated?: (projectId: string) => void;
  onUpdated?: (projectId: string) => void;
  onDeleted?: (projectId: string) => void;
}

type FormState = {
  clientId: string;
  projectNumber: string;
  name: string;
  siteAddress: string;
  assignedProjectManagerId: string;
  scheduledStart: Date | undefined;
  scheduledEnd: Date | undefined;
  finishLevel: 1 | 2 | 3 | 4 | 5 | undefined;
};

function parseStoredDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const parsed = parse(value.slice(0, 10), "yyyy-MM-dd", new Date());
  return isValid(parsed) ? parsed : undefined;
}

export function NewProjectDialog({ open, onOpenChange, currentUser, presetClientId, project, onCreated, onUpdated, onDeleted }: NewProjectDialogProps) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const isEdit = !!project;

  const clientsQ = useQuery({ queryKey: ["clients"], queryFn: getClients });
  const usersQ = useQuery({ queryKey: ["users"], queryFn: getUsers });
  const allProjectsQ = useQuery({
    queryKey: ["projects", "all-visible", currentUser?.id ?? null],
    queryFn: () => getProjects(),
  });

  const clients = clientsQ.data?.ok ? clientsQ.data.data : [];
  const users = usersQ.data?.ok ? usersQ.data.data : [];
  const pms = users.filter((u) => u.role === "project_manager" && u.active);
  const projectCount = allProjectsQ.data?.ok ? allProjectsQ.data.data.length : 0;

  const isAdmin = currentUser?.role === "admin";

  const initialNumber = useMemo(() => {
    const year = new Date().getFullYear();
    const next = String(projectCount + 1).padStart(3, "0");
    return `TP-${year}-${next}`;
  }, [projectCount]);

  const [form, setForm] = useState<FormState>({
    clientId: presetClientId ?? "",
    projectNumber: initialNumber,
    name: "",
    siteAddress: "",
    assignedProjectManagerId: isAdmin ? "" : currentUser?.id ?? "",
    scheduledStart: undefined,
    scheduledEnd: undefined,
    finishLevel: undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Re-sync defaults when modal opens / data changes.
  useEffect(() => {
    if (!open) return;
    if (project) {
      const parsedStart = parseStoredDate(project.scheduledStart);
      const parsedEnd = parseStoredDate(project.scheduledEnd);
      setForm({
        clientId: project.clientId,
        projectNumber: project.projectNumber,
        name: project.name,
        siteAddress: project.siteAddress,
        assignedProjectManagerId: project.assignedProjectManagerId || "",
        scheduledStart: parsedStart,
        scheduledEnd: parsedEnd,
        finishLevel: project.finishLevel,
      });
    } else {
      setForm((f) => ({
        ...f,
        clientId: presetClientId ?? f.clientId,
        projectNumber: f.projectNumber || initialNumber,
        assignedProjectManagerId: isAdmin ? f.assignedProjectManagerId : currentUser?.id ?? "",
      }));
    }
  }, [open, presetClientId, initialNumber, isAdmin, currentUser?.id, project]);

  const reset = () => {
    setErrors({});
    setForm({
      clientId: presetClientId ?? "",
      projectNumber: initialNumber,
      name: "",
      siteAddress: "",
      assignedProjectManagerId: isAdmin ? "" : currentUser?.id ?? "",
      scheduledStart: undefined,
      scheduledEnd: undefined,
      finishLevel: undefined,
    });
  };

  const invalidateProjectData = (projectId?: string) => {
    qc.invalidateQueries({ queryKey: ["projects"] });
    qc.invalidateQueries({ queryKey: ["projects", "all-visible"] });
    qc.invalidateQueries({ queryKey: ["phases"] });
    qc.invalidateQueries({ queryKey: ["gates"] });
    qc.invalidateQueries({ queryKey: ["deficiencies"] });
    qc.invalidateQueries({ queryKey: ["photos"] });
    qc.invalidateQueries({ queryKey: ["audit-events"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
    if (projectId) {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      qc.invalidateQueries({ queryKey: ["project-equipment", projectId] });
      qc.invalidateQueries({ queryKey: ["project-inventory-pickups", projectId] });
    }
  };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key as string]) setErrors((e) => ({ ...e, [key as string]: "" }));
  };

  const validationError = useMemo(() => {
    if (!form.scheduledStart || !form.scheduledEnd) return null;
    const daysDiff = differenceInDays(form.scheduledEnd, form.scheduledStart);
    if (daysDiff < 3) {
      return "End date must be at least 3 days after start date";
    }
    return null;
  }, [form.scheduledStart, form.scheduledEnd]);

  const mutation = useMutation({
    mutationFn: isEdit
      ? (input: UpdateProjectInput) => updateProject(project!.id, input)
      : (input: CreateProjectInput) => createProject(input),
    onSuccess: (res) => {
      if (res.ok === true) {
        toast.success(isEdit ? `Project "${res.data.name}" updated` : `Project "${res.data.name}" created`);
        invalidateProjectData(project?.id);
        if (!isEdit) {
          qc.invalidateQueries({ queryKey: ["phases"] });
          qc.invalidateQueries({ queryKey: ["gates"] });
        }
        const id = res.data.id;
        reset();
        onOpenChange(false);
        if (isEdit) {
          onUpdated?.(id);
        } else {
          onCreated?.(id);
          navigate(`/project/${id}`);
        }
        return;
      }
      setErrors(res.error.fieldErrors ?? {});
      toast.error(res.error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteProject(project!.id),
    onSuccess: (res) => {
      if (res.ok === true) {
        toast.success(`Project "${res.data.name}" deleted`);
        invalidateProjectData(res.data.id);
        reset();
        onOpenChange(false);
        onDeleted?.(res.data.id);
        return;
      }
      toast.error(res.error.message);
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="md:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit project" : "New project"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update project details and dates." : "Default phases (Insulation, Drywall, Finishing) and gates are created automatically."}
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4 py-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (validationError) {
              toast.error(validationError);
              return;
            }
            if (isEdit) {
              mutation.mutate({
                name: form.name,
                siteAddress: form.siteAddress,
                assignedProjectManagerId: form.assignedProjectManagerId || undefined,
                scheduledStart: form.scheduledStart ? format(form.scheduledStart, "yyyy-MM-dd") : undefined,
                scheduledEnd: form.scheduledEnd ? format(form.scheduledEnd, "yyyy-MM-dd") : undefined,
                finishLevel: form.finishLevel,
              } as UpdateProjectInput);
            } else {
              mutation.mutate({
                clientId: form.clientId,
                projectNumber: form.projectNumber,
                name: form.name,
                siteAddress: form.siteAddress,
                assignedProjectManagerId: form.assignedProjectManagerId || undefined,
                scheduledStart: form.scheduledStart ? format(form.scheduledStart, "yyyy-MM-dd") : undefined,
                scheduledEnd: form.scheduledEnd ? format(form.scheduledEnd, "yyyy-MM-dd") : undefined,
                finishLevel: form.finishLevel,
              } as CreateProjectInput);
            }
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="client">Client *</Label>
            <Select
              value={form.clientId}
              onValueChange={(v) => setField("clientId", v)}
              disabled={!!presetClientId || isEdit}
            >
              <SelectTrigger id="client">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.clientId && <p className="text-xs text-destructive">{errors.clientId}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="projectNumber">Project number *</Label>
              <Input
                id="projectNumber"
                value={form.projectNumber}
                onChange={(e) => setField("projectNumber", e.target.value)}
                disabled={isEdit}
              />
              {errors.projectNumber && <p className="text-xs text-destructive">{errors.projectNumber}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="name">Project name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="e.g. Cedar Hollow Lot 22"
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="siteAddress">Site address *</Label>
            <AddressAutocomplete
              id="siteAddress"
              value={form.siteAddress}
              onChange={(value) => setField("siteAddress", value)}
              placeholder="123 Main St"
            />
            {errors.siteAddress && <p className="text-xs text-destructive">{errors.siteAddress}</p>}
          </div>

          {isAdmin && (
            <div className="grid gap-1.5">
              <Label htmlFor="pm">Assigned project manager</Label>
              <Select
                value={form.assignedProjectManagerId || "unassigned"}
                onValueChange={(v) => setField("assignedProjectManagerId", v === "unassigned" ? "" : v)}
              >
                <SelectTrigger id="pm">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {pms.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="start">Scheduled start</Label>
              <DatePicker
                id="start"
                value={form.scheduledStart}
                onChange={(date) => setField("scheduledStart", date)}
                placeholder="Select start date"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="end">Scheduled end</Label>
              <DatePicker
                id="end"
                value={form.scheduledEnd}
                onChange={(date) => setField("scheduledEnd", date)}
                placeholder="Select end date"
              />
            </div>
          </div>
          {validationError && <p className="text-xs text-destructive">{validationError}</p>}

          <div className="grid gap-1.5">
            <Label>Finish level</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <Button
                  key={level}
                  type="button"
                  variant={form.finishLevel === level ? "default" : "outline"}
                  size="sm"
                  onClick={() => setField("finishLevel", level as 1 | 2 | 3 | 4 | 5)}
                  className="flex-1"
                >
                  {level}
                </Button>
              ))}
            </div>
          </div>

          {isEdit && project && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm">
              <div className="font-semibold text-destructive">Danger zone</div>
              <p className="mt-1 text-muted-foreground">Deleting removes this project from active app views and cannot be restored from the UI.</p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" size="sm" className="mt-3" disabled={deleteMutation.isPending}>
                    Delete project
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {project.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This is a destructive action. <strong>{project.name}</strong> will be removed from active app views and cannot be restored from the UI.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={(e) => {
                        e.preventDefault();
                        deleteMutation.mutate();
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? "Deleting…" : "Yes, delete project"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending || deleteMutation.isPending || !!validationError}>
              {mutation.isPending ? (isEdit ? "Saving…" : "Creating…") : (isEdit ? "Save changes" : "Create project")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
