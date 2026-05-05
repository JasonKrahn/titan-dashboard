import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createProject, getClients, getProjects, getUsers, type CreateProjectInput } from "@/lib/api";
import type { User } from "@/lib/types";

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser?: User;
  presetClientId?: string;
  onCreated?: (projectId: string) => void;
}

type FormState = {
  clientId: string;
  projectNumber: string;
  name: string;
  siteAddress: string;
  assignedProjectManagerId: string;
  scheduledStart: string;
  scheduledEnd: string;
};

export function NewProjectDialog({ open, onOpenChange, currentUser, presetClientId, onCreated }: NewProjectDialogProps) {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const clientsQ = useQuery({ queryKey: ["clients"], queryFn: getClients });
  const usersQ = useQuery({ queryKey: ["users"], queryFn: getUsers });
  const allProjectsQ = useQuery({
    queryKey: ["projects", "all-visible", currentUser?.id ?? null],
    queryFn: () => getProjects(),
  });

  const clients = clientsQ.data?.ok ? clientsQ.data.data : [];
  const users = usersQ.data?.ok ? usersQ.data.data : [];
  const pms = users.filter((u) => u.role === "project_manager");
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
    scheduledStart: "",
    scheduledEnd: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Re-sync defaults when modal opens / data changes.
  useEffect(() => {
    if (!open) return;
    setForm((f) => ({
      ...f,
      clientId: presetClientId ?? f.clientId,
      projectNumber: f.projectNumber || initialNumber,
      assignedProjectManagerId: isAdmin ? f.assignedProjectManagerId : currentUser?.id ?? "",
    }));
  }, [open, presetClientId, initialNumber, isAdmin, currentUser?.id]);

  const reset = () => {
    setErrors({});
    setForm({
      clientId: presetClientId ?? "",
      projectNumber: initialNumber,
      name: "",
      siteAddress: "",
      assignedProjectManagerId: isAdmin ? "" : currentUser?.id ?? "",
      scheduledStart: "",
      scheduledEnd: "",
    });
  };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key as string]) setErrors((e) => ({ ...e, [key as string]: "" }));
  };

  const mutation = useMutation({
    mutationFn: (input: CreateProjectInput) => createProject(input),
    onSuccess: (res) => {
      if (res.ok === true) {
        toast.success(`Project "${res.data.name}" created`);
        qc.invalidateQueries({ queryKey: ["projects"] });
        qc.invalidateQueries({ queryKey: ["phases"] });
        qc.invalidateQueries({ queryKey: ["gates"] });
        const id = res.data.id;
        reset();
        onOpenChange(false);
        onCreated?.(id);
        navigate(`/project/${id}`);
        return;
      }
      setErrors(res.error.fieldErrors ?? {});
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
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Default phases (Insulation, Drywall, Finishing) and gates are created automatically.
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4 py-2"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate({
              clientId: form.clientId,
              projectNumber: form.projectNumber,
              name: form.name,
              siteAddress: form.siteAddress,
              assignedProjectManagerId: form.assignedProjectManagerId || undefined,
              scheduledStart: form.scheduledStart || undefined,
              scheduledEnd: form.scheduledEnd || undefined,
            });
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="client">Client *</Label>
            <Select
              value={form.clientId}
              onValueChange={(v) => setField("clientId", v)}
              disabled={!!presetClientId}
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

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="projectNumber">Project number *</Label>
              <Input
                id="projectNumber"
                value={form.projectNumber}
                onChange={(e) => setField("projectNumber", e.target.value)}
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
            <Input
              id="siteAddress"
              value={form.siteAddress}
              onChange={(e) => setField("siteAddress", e.target.value)}
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
              <Input
                id="start"
                type="date"
                value={form.scheduledStart}
                onChange={(e) => setField("scheduledStart", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="end">Scheduled end</Label>
              <Input
                id="end"
                type="date"
                value={form.scheduledEnd}
                onChange={(e) => setField("scheduledEnd", e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating…" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
