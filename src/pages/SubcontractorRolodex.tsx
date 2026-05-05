import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Building2, Mail, Phone, Search, Wrench, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getSubcontractorContacts, getAllPhases, getProjects, createSubcontractorContact, updateSubcontractorContact, deleteSubcontractorContact } from "@/lib/api";
import type { Phase, Project, TradeType, SubcontractorContact } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const TRADE_LABEL: Record<string, string> = {
  insulation: "Insulation",
  drywall: "Drywall",
  finishing: "Finishing",
};

const TRADE_COLOR: Record<string, string> = {
  insulation: "bg-blue-100 text-blue-700 border-blue-200",
  drywall: "bg-amber-100 text-amber-700 border-amber-200",
  finishing: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export default function SubcontractorRolodexPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingSubcontractor, setEditingSubcontractor] = useState<SubcontractorContact | null>(null);
  const [deletingSubcontractor, setDeletingSubcontractor] = useState<SubcontractorContact | null>(null);
  const [formData, setFormData] = useState({
    displayName: "",
    trade: "" as TradeType | "",
    companyName: "",
    phone: "",
    email: "",
    notes: "",
  });

  const subsQ = useQuery({
    queryKey: ["subcontractors"],
    queryFn: getSubcontractorContacts,
  });

  const phasesQ = useQuery({
    queryKey: ["phases"],
    queryFn: () => getAllPhases(),
  });

  const projectsQ = useQuery({
    queryKey: ["projects"],
    queryFn: () => getProjects(),
  });

  const createMutation = useMutation({
    mutationFn: createSubcontractorContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcontractors"] });
      setIsAddDialogOpen(false);
      setFormData({
        displayName: "",
        trade: "",
        companyName: "",
        phone: "",
        email: "",
        notes: "",
      });
      toast({
        title: "Subcontractor added",
        description: "The subcontractor has been successfully added.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add subcontractor",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateSubcontractorContact>[1] }) =>
      updateSubcontractorContact(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcontractors"] });
      setIsEditDialogOpen(false);
      setEditingSubcontractor(null);
      setFormData({
        displayName: "",
        trade: "",
        companyName: "",
        phone: "",
        email: "",
        notes: "",
      });
      toast({
        title: "Subcontractor updated",
        description: "The subcontractor has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update subcontractor",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSubcontractorContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcontractors"] });
      queryClient.invalidateQueries({ queryKey: ["phases"] });
      setIsDeleteDialogOpen(false);
      setDeletingSubcontractor(null);
      toast({
        title: "Subcontractor deleted",
        description: "The subcontractor has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete subcontractor",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const subs = useMemo(() => {
    if (!subsQ.data?.ok) return [];
    return subsQ.data.data;
  }, [subsQ.data]);

  const phases = useMemo(() => {
    if (!phasesQ.data?.ok) return [];
    return phasesQ.data.data;
  }, [phasesQ.data]);

  const projects = useMemo(() => {
    if (!projectsQ.data?.ok) return [];
    return projectsQ.data.data;
  }, [projectsQ.data]);

  // Build map of subcontractor -> assigned phases with project info
  const subAssignments = useMemo(() => {
    const map = new Map<string, Array<{ phase: Phase; project: Project }>>();
    phases.forEach((phase) => {
      if (phase.assignedSubcontractorId) {
        const project = projects.find((p) => p.id === phase.projectId);
        if (project) {
          const existing = map.get(phase.assignedSubcontractorId) || [];
          existing.push({ phase, project });
          map.set(phase.assignedSubcontractorId, existing);
        }
      }
    });
    return map;
  }, [phases, projects]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return subs;
    return subs.filter(
      (s) =>
        s.displayName.toLowerCase().includes(q) ||
        (s.companyName && s.companyName.toLowerCase().includes(q)) ||
        s.trade.toLowerCase().includes(q)
    );
  }, [subs, search]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.displayName || !formData.trade || !formData.companyName || !formData.phone || !formData.email) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate({
      displayName: formData.displayName,
      trade: formData.trade as TradeType,
      companyName: formData.companyName,
      phone: formData.phone,
      email: formData.email,
      notes: formData.notes,
    });
  };

  const handleEdit = (sub: SubcontractorContact) => {
    setEditingSubcontractor(sub);
    setFormData({
      displayName: sub.displayName,
      trade: sub.trade,
      companyName: sub.companyName || "",
      phone: sub.phone || "",
      email: sub.email || "",
      notes: sub.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.displayName || !formData.trade || !formData.companyName || !formData.phone || !formData.email) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    if (!editingSubcontractor) return;
    updateMutation.mutate({
      id: editingSubcontractor.id,
      input: {
        displayName: formData.displayName,
        trade: formData.trade as TradeType,
        companyName: formData.companyName,
        phone: formData.phone,
        email: formData.email,
        notes: formData.notes,
      },
    });
  };

  const handleDelete = (sub: SubcontractorContact) => {
    setDeletingSubcontractor(sub);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!deletingSubcontractor) return;
    deleteMutation.mutate(deletingSubcontractor.id);
  };

  if (subsQ.isLoading || phasesQ.isLoading || projectsQ.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border sticky top-0 z-20 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="container flex items-center h-16">
            <Skeleton className="h-9 w-20" />
          </div>
        </header>
        <main className="container py-6 space-y-6">
          <Skeleton className="h-10 w-full max-w-sm" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  const phasesData = phasesQ.data as { ok: boolean; data?: Phase[]; error?: { message: string } } | undefined;
  const projectsData = projectsQ.data as { ok: boolean; data?: Project[]; error?: { message: string } } | undefined;

  if (subsQ.data?.ok === false || phasesData?.ok === false || projectsData?.ok === false) {
    const error = subsQ.data?.ok === false ? subsQ.data.error :
                  phasesData?.ok === false ? phasesData.error :
                  projectsData?.error;
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border sticky top-0 z-20 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="container flex items-center h-16">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>
        </header>
        <main className="container py-6">
          <Alert variant="destructive">
            <AlertTitle>Couldn&apos;t load data</AlertTitle>
            <AlertDescription>{error?.message || "Unknown error"}</AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 z-20 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="container flex items-center justify-between h-16">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div className="text-sm font-medium">Subcontractor Rolodex</div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <h1 className="text-2xl font-bold">Subcontractor Rolodex</h1>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, company, or trade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Subcontractor
            </Button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Wrench className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No subcontractors match your search.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => (
              <Card key={s.id} className="border-border bg-card p-5 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{s.displayName}</h3>
                    {s.companyName && (
                      <p className="text-sm text-muted-foreground truncate">{s.companyName}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`shrink-0 ${TRADE_COLOR[s.trade] ?? ""}`}>
                      {TRADE_LABEL[s.trade] ?? s.trade}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(s)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(s)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  {s.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>{s.phone}</span>
                    </div>
                  )}
                  {s.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{s.email}</span>
                    </div>
                  )}
                  {s.notes && (
                    <p className="text-xs text-muted-foreground mt-1 border-t border-border/60 pt-2">
                      {s.notes}
                    </p>
                  )}
                </div>

                {(() => {
                  const assignments = subAssignments.get(s.id);
                  if (!assignments || assignments.length === 0) return null;
                  return (
                    <div className="mt-4 pt-3 border-t border-border/60">
                      <p className="text-xs text-muted-foreground mb-2">Assigned to:</p>
                      <div className="space-y-1">
                        {assignments.map(({ phase, project }) => (
                          <div key={phase.id}>
                            <Link
                              to={`/project/${project.id}/phase/${phase.id}`}
                              className="block text-xs hover:underline text-primary"
                            >
                              {project.name} — {TRADE_LABEL[phase.type]}
                            </Link>
                            {phase.scheduledEnd && (
                              <p className="text-xs text-muted-foreground">
                                Scheduled finish: {new Date(phase.scheduledEnd).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div className="mt-4 flex items-center gap-2">
                  <span
                    className={`inline-flex h-2 w-2 rounded-full ${s.active ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
                  />
                  <span className="text-xs text-muted-foreground">{s.active ? "Active" : "Inactive"}</span>
                </div>
              </Card>
            ))}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground/70 text-center">
          Prototype data · Backend swap-in via lib/api adapters
        </p>
      </main>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Subcontractor</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="displayName">Display Name *</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="e.g. John Smith"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="trade">Trade *</Label>
                <Select
                  value={formData.trade}
                  onValueChange={(value) => setFormData({ ...formData, trade: value as TradeType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select trade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="insulation">Insulation</SelectItem>
                    <SelectItem value="drywall">Drywall</SelectItem>
                    <SelectItem value="finishing">Finishing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="e.g. ABC Insulation Co."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. 555-0123"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. john@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Adding..." : "Add Subcontractor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Subcontractor</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-displayName">Display Name *</Label>
                <Input
                  id="edit-displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="e.g. John Smith"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-trade">Trade *</Label>
                <Select
                  value={formData.trade}
                  onValueChange={(value) => setFormData({ ...formData, trade: value as TradeType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select trade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="insulation">Insulation</SelectItem>
                    <SelectItem value="drywall">Drywall</SelectItem>
                    <SelectItem value="finishing">Finishing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-companyName">Company Name *</Label>
                <Input
                  id="edit-companyName"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="e.g. ABC Insulation Co."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-phone">Phone *</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. 555-0123"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-email">Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. john@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-notes">Notes (optional)</Label>
                <Textarea
                  id="edit-notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Updating..." : "Update Subcontractor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Subcontractor</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {deletingSubcontractor && (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Are you sure you want to delete <strong>{deletingSubcontractor.displayName}</strong>?
                </p>
                {(() => {
                  const assignments = subAssignments.get(deletingSubcontractor.id);
                  if (assignments && assignments.length > 0) {
                    return (
                      <Alert variant="destructive" className="mb-4">
                        <AlertTitle>Warning</AlertTitle>
                        <AlertDescription>
                          This subcontractor is assigned to {assignments.length} phase{assignments.length > 1 ? "s" : ""}. The assignments will be cleared.
                        </AlertDescription>
                      </Alert>
                    );
                  }
                  return null;
                })()}
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
