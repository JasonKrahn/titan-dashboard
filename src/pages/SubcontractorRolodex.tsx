import { useMemo, useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  Grid2X2,
  List,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Pencil,
  Trash2,
  Wrench,
} from "lucide-react";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconWell } from "@/components/ui/icon-well";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { getSubcontractorContacts, getAllPhases, getProjects, createSubcontractorContact, updateSubcontractorContact, deleteSubcontractorContact } from "@/lib/api";
import { formatDateWithOptions } from "@/lib/schedule";
import type { Phase, Project, TradeType, SubcontractorContact } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { TradeBadge } from "@/components/ui/trade-badge";
import { useToast } from "@/hooks/use-toast";
import { useTypeToSearch } from "@/hooks/useTypeToSearch";
import { useShortcutActions } from "@/components/dashboard/ShortcutActionsContext";
import { Fab } from "@/components/ui/fab";
import {
  buildSubcontractorRows,
  type SubcontractorAssignmentFilter,
  type SubcontractorAssignmentSummary,
  type SubcontractorRowFilters,
  type SubcontractorSortState,
  type SubcontractorStatusFilter,
  type SubcontractorTradeFilter,
} from "./SubcontractorRows";

const TRADE_LABEL: Record<string, string> = {
  insulation: "Insulation",
  drywall: "Drywall",
  finishing: "Finishing",
};


type ViewMode = "cards" | "list";
type SortOption = "name" | "company" | "trade" | "active" | "assigned" | "next";
type StatFilter = Pick<SubcontractorRowFilters, "status" | "assignment">;

interface SubcontractorFormState {
  displayName: string;
  trade: TradeType | "";
  companyName: string;
  phone: string;
  email: string;
  notes: string;
}

interface SubcontractorAssignment {
  phase: Phase;
  project: Project;
}

const EMPTY_FORM: SubcontractorFormState = {
  displayName: "",
  trade: "",
  companyName: "",
  phone: "",
  email: "",
  notes: "",
};

const DEFAULT_FILTERS: SubcontractorRowFilters = {
  trade: "all",
  status: "all",
  assignment: "all",
};

const SORT_STATE: Record<SortOption, SubcontractorSortState> = {
  name: { key: "name", direction: "asc" },
  company: { key: "company", direction: "asc" },
  trade: { key: "trade", direction: "asc" },
  active: { key: "status", direction: "asc" },
  assigned: { key: "assignmentCount", direction: "desc" },
  next: { key: "nextScheduledFinish", direction: "asc" },
};


function firstScheduledAssignment(assignments: SubcontractorAssignment[] = []) {
  return assignments.find((assignment) => assignment.phase.scheduledEnd) ?? assignments[0];
}

function phaseLabel(phase: Phase) {
  return TRADE_LABEL[phase.type] ?? phase.type;
}

function resetForm() {
  return { ...EMPTY_FORM };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "An error occurred";
}

function formFromSubcontractor(sub: SubcontractorContact): SubcontractorFormState {
  return {
    displayName: sub.displayName,
    trade: sub.trade,
    companyName: sub.companyName || "",
    phone: sub.phone || "",
    email: sub.email || "",
    notes: sub.notes || "",
  };
}

function SubcontractorFormFields({
  formData,
  fieldPrefix,
  onChange,
}: {
  formData: SubcontractorFormState;
  fieldPrefix: string;
  onChange: (form: SubcontractorFormState) => void;
}) {
  const fieldId = (name: string) => `${fieldPrefix}-${name}`;

  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor={fieldId("displayName")}>Display Name *</Label>
        <Input
          id={fieldId("displayName")}
          value={formData.displayName}
          onChange={(e) => onChange({ ...formData, displayName: e.target.value })}
          placeholder="e.g. John Smith"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={fieldId("trade")}>Trade *</Label>
        <Select
          value={formData.trade}
          onValueChange={(value) => onChange({ ...formData, trade: value as TradeType })}
        >
          <SelectTrigger id={fieldId("trade")}>
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
        <Label htmlFor={fieldId("companyName")}>Company Name *</Label>
        <Input
          id={fieldId("companyName")}
          value={formData.companyName}
          onChange={(e) => onChange({ ...formData, companyName: e.target.value })}
          placeholder="e.g. ABC Insulation Co."
        />
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={fieldId("phone")}>Phone *</Label>
          <Input
            id={fieldId("phone")}
            value={formData.phone}
            onChange={(e) => onChange({ ...formData, phone: e.target.value })}
            placeholder="e.g. 555-0123"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={fieldId("email")}>Email *</Label>
          <Input
            id={fieldId("email")}
            type="email"
            value={formData.email}
            onChange={(e) => onChange({ ...formData, email: e.target.value })}
            placeholder="e.g. john@example.com"
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={fieldId("notes")}>Notes (optional)</Label>
        <Textarea
          id={fieldId("notes")}
          value={formData.notes}
          onChange={(e) => onChange({ ...formData, notes: e.target.value })}
          placeholder="Additional notes..."
          rows={3}
        />
      </div>
    </div>
  );
}

export default function SubcontractorRolodexPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<SubcontractorRowFilters>(DEFAULT_FILTERS);
  const [sortOption, setSortOption] = useState<SortOption>("name");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [mobileActionSubcontractorId, setMobileActionSubcontractorId] = useState<string | null>(null);
  const { registerNewItemAction } = useShortcutActions();

  useEffect(() => {
    localStorage.setItem("subcontractorViewMode", viewMode);
  }, [viewMode]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingSubcontractor, setEditingSubcontractor] = useState<SubcontractorContact | null>(null);
  const [deletingSubcontractor, setDeletingSubcontractor] = useState<SubcontractorContact | null>(null);
  const [formData, setFormData] = useState<SubcontractorFormState>(resetForm);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useTypeToSearch({
    searchInputRef,
    search,
    onSearchChange: setSearch,
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

  const clearForm = () => setFormData(resetForm());

  useEffect(() => {
    registerNewItemAction(() => setIsAddDialogOpen(true));
    return () => {
      registerNewItemAction(null);
    };
  }, [registerNewItemAction]);

  const createMutation = useMutation({
    mutationFn: createSubcontractorContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcontractors"] });
      setIsAddDialogOpen(false);
      clearForm();
      toast({
        title: "Subcontractor added",
        description: "The subcontractor has been successfully added.",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Failed to add subcontractor",
        description: errorMessage(error),
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
      clearForm();
      toast({
        title: "Subcontractor updated",
        description: "The subcontractor has been successfully updated.",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Failed to update subcontractor",
        description: errorMessage(error),
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
    onError: (error: unknown) => {
      toast({
        title: "Failed to delete subcontractor",
        description: errorMessage(error),
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

  const subAssignments = useMemo(() => {
    const map = new Map<string, SubcontractorAssignment[]>();
    phases.forEach((phase) => {
      if (!phase.assignedSubcontractorId) return;
      const project = projects.find((p) => p.id === phase.projectId);
      if (!project) return;

      const existing = map.get(phase.assignedSubcontractorId) || [];
      existing.push({ phase, project });
      map.set(phase.assignedSubcontractorId, existing);
    });

    map.forEach((assignments) => {
      assignments.sort((a, b) => {
        if (!a.phase.scheduledEnd && !b.phase.scheduledEnd) return a.project.name.localeCompare(b.project.name);
        if (!a.phase.scheduledEnd) return 1;
        if (!b.phase.scheduledEnd) return -1;
        return new Date(a.phase.scheduledEnd).getTime() - new Date(b.phase.scheduledEnd).getTime();
      });
    });

    return map;
  }, [phases, projects]);

  const assignmentSummary = useMemo(() => {
    const map = new Map<string, SubcontractorAssignmentSummary>();
    subAssignments.forEach((assignments, id) => {
      map.set(id, {
        assignmentCount: assignments.length,
        nextScheduledFinish: firstScheduledAssignment(assignments)?.phase.scheduledEnd,
      });
    });
    return map;
  }, [subAssignments]);

  const isActive = (id: string) => (assignmentSummary.get(id)?.assignmentCount ?? 0) > 0;

  const rows = useMemo(
    () => buildSubcontractorRows(subs, search, SORT_STATE[sortOption], filters, assignmentSummary),
    [assignmentSummary, filters, search, sortOption, subs],
  );

  const mobileActionSubcontractor = rows.find((row) => row.id === mobileActionSubcontractorId);

  const stats = useMemo(() => {
    const active = subs.filter((sub) => isActive(sub.id)).length;
    const assigned = subs.filter((sub) => (assignmentSummary.get(sub.id)?.assignmentCount ?? 0) > 0).length;
    return {
      total: subs.length,
      active,
      assigned,
      unassigned: subs.length - assigned,
    };
  }, [assignmentSummary, subs]);

  const handleFilterChange = <K extends keyof SubcontractorRowFilters>(key: K, value: SubcontractorRowFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const applyStatFilter = (nextFilters: StatFilter) => {
    setFilters((current) => ({ ...current, ...nextFilters }));
  };

  const isStatFilterActive = (targetFilters: StatFilter) =>
    filters.status === targetFilters.status && filters.assignment === targetFilters.assignment;

  const validateForm = () => {
    if (!formData.displayName || !formData.trade || !formData.companyName || !formData.phone || !formData.email) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

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
    setFormData(formFromSubcontractor(sub));
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !editingSubcontractor) return;

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

  const renderContactActions = (sub: SubcontractorContact, compact = false) => {
    const actionSize = compact ? "h-9 w-9" : "h-9 w-9";

    return (
      <div className="flex items-center gap-1">
        {sub.phone && (
          <Button asChild variant="ghost" size="icon" className={actionSize}>
            <a href={`tel:${sub.phone}`} aria-label={`Call ${sub.displayName}`}>
              <Phone className="h-4 w-4" />
            </a>
          </Button>
        )}
        {sub.email && (
          <Button asChild variant="ghost" size="icon" className={actionSize}>
            <a href={`mailto:${sub.email}`} aria-label={`Email ${sub.displayName}`}>
              <Mail className="h-4 w-4" />
            </a>
          </Button>
        )}
      </div>
    );
  };

  const renderAssignmentPreview = (sub: SubcontractorContact) => {
    const assignments = subAssignments.get(sub.id) || [];
    const primaryAssignment = firstScheduledAssignment(assignments);

    if (!primaryAssignment) {
      return (
        <div className="rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          No active phase assignments
        </div>
      );
    }

    return (
      <div className="rounded-md border border-border/70 bg-muted/30 px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-xs font-medium text-foreground">{primaryAssignment.project.name}</p>
          <Badge tone="neutral" appearance="outline" size="xs" className="shrink-0">
            {assignments.length} phase{assignments.length === 1 ? "" : "s"}
          </Badge>
        </div>
        <Link
          to={`/project/${primaryAssignment.project.id}/phase/${primaryAssignment.phase.id}`}
          className="mt-1 block truncate text-xs text-primary hover:underline"
          aria-label={`Open ${primaryAssignment.project.name} ${phaseLabel(primaryAssignment.phase)} phase`}
        >
          {phaseLabel(primaryAssignment.phase)} · finish {formatDateWithOptions(primaryAssignment.phase.scheduledEnd, { showYear: true })}
        </Link>
      </div>
    );
  };

  if (subsQ.isLoading || phasesQ.isLoading || projectsQ.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader activeSection="subs" />
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
        <AppHeader activeSection="subs" />
        <main className="container py-6">
          <Alert variant="destructive">
            <AlertTitle>Couldn&apos;t load data</AlertTitle>
            <AlertDescription>{error?.message || "Unknown error"}</AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  const statCards: Array<{ label: string; value: number; icon: typeof Building2; filters: StatFilter }> = [
    { label: "Total subs", value: stats.total, icon: Building2, filters: { status: "all", assignment: "all" } },
    { label: "Active", value: stats.active, icon: Wrench, filters: { status: "active", assignment: "all" } },
    { label: "Assigned", value: stats.assigned, icon: BriefcaseBusiness, filters: { status: "all", assignment: "assigned" } },
    { label: "Unassigned", value: stats.unassigned, icon: CalendarClock, filters: { status: "all", assignment: "unassigned" } },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader activeSection="subs" />

      <main className="container py-6 space-y-5">
        <section className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-2xl font-bold">Subcontractor Rolodex</h1>
            </div>
            <div className="hidden md:block">
              <Button className="h-10" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Subcontractor
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((item) => {
              const isSelected = isStatFilterActive(item.filters);
              return (
                <Card
                  key={item.label}
                  surface="panel"
                  className={`transition-colors ${isSelected ? "border-primary/70 ring-1 ring-primary/30" : ""}`}
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 p-4 text-left"
                    aria-pressed={isSelected}
                    onClick={() => applyStatFilter(item.filters)}
                  >
                    <span>
                      <span className="block text-xs font-medium text-muted-foreground">{item.label}</span>
                      <span className="mt-1 block text-2xl font-semibold tabular-nums">{item.value}</span>
                    </span>
                    <IconWell tone="primary" size="lg" shape="square" className="border-transparent">
                      <item.icon className="h-4 w-4" />
                    </IconWell>
                  </button>
                </Card>
              );
            })}
          </div>
        </section>

        <Card surface="panel" className="p-3">
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,1.4fr)_repeat(4,minmax(145px,0.75fr))_auto] lg:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                id="subcontractor-search"
                name="subcontractorSearch"
                aria-label="Search subcontractors"
                placeholder="Search name, company, trade, phone, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-background/60 pl-9"
              />
            </div>
            <Select value={filters.trade} onValueChange={(value) => handleFilterChange("trade", value as SubcontractorTradeFilter)}>
              <SelectTrigger id="subcontractor-trade-filter" name="subcontractorTradeFilter" aria-label="Filter by trade">
                <SelectValue placeholder="Trade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All trades</SelectItem>
                <SelectItem value="insulation">Insulation</SelectItem>
                <SelectItem value="drywall">Drywall</SelectItem>
                <SelectItem value="finishing">Finishing</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={(value) => handleFilterChange("status", value as SubcontractorStatusFilter)}>
              <SelectTrigger id="subcontractor-status-filter" name="subcontractorStatusFilter" aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Assigned</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.assignment} onValueChange={(value) => handleFilterChange("assignment", value as SubcontractorAssignmentFilter)}>
              <SelectTrigger id="subcontractor-assignment-filter" name="subcontractorAssignmentFilter" aria-label="Filter by assignment">
                <SelectValue placeholder="Assignment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All assignments</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
              <SelectTrigger id="subcontractor-sort" name="subcontractorSort" aria-label="Sort subcontractors">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name A-Z</SelectItem>
                <SelectItem value="company">Company A-Z</SelectItem>
                <SelectItem value="trade">Trade</SelectItem>
                <SelectItem value="active">Active first</SelectItem>
                <SelectItem value="assigned">Most assigned</SelectItem>
                <SelectItem value="next">Next scheduled finish</SelectItem>
              </SelectContent>
            </Select>
            <div className="hidden justify-end md:flex">
              <SegmentedControl size="sm">
                <Button
                  type="button"
                  variant={viewMode === "cards" ? "default" : "ghost"}
                  size="sm"
                  className="h-8 px-2"
                  aria-pressed={viewMode === "cards"}
                  onClick={() => setViewMode("cards")}
                >
                  <Grid2X2 className="h-4 w-4" />
                  Cards
                </Button>
                <Button
                  type="button"
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  className="h-8 px-2"
                  aria-pressed={viewMode === "list"}
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                  List
                </Button>
              </SegmentedControl>
            </div>
          </div>
        </Card>

        {rows.length === 0 ? (
          <Card surface="panel" className="p-8 text-center">
            <IconWell tone="muted" size="xl" shape="panel" className="mx-auto border-transparent">
              <Wrench className="h-8 w-8 text-muted-foreground" />
            </IconWell>
            <h3 className="mt-3 font-semibold">No subcontractors found</h3>
            <p className="mt-1 text-sm text-muted-foreground">Try a different search, trade, status, or assignment filter.</p>
          </Card>
        ) : (
          <>
            <ul className="mobile-list md:hidden">
              {rows.map((s) => {
                const assignmentCount = assignmentSummary.get(s.id)?.assignmentCount ?? 0;
                return (
                  <li key={s.id}>
                    <div className="flex items-center gap-2 px-3 py-2.5 active:bg-muted/40">
                      <button
                        type="button"
                        onClick={() => setMobileActionSubcontractorId(s.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <IconWell tone="primary" size="md" shape="square">
                          <Wrench className="h-4 w-4" />
                        </IconWell>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`inline-block h-1.5 w-1.5 rounded-full ${isActive(s.id) ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                            <span className="truncate text-sm font-semibold">{s.displayName}</span>
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {s.companyName ?? s.phone ?? s.email ?? "No contact"}
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums">
                          {assignmentCount} assigned
                        </span>
                      </button>
                      <button
                        type="button"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground active:bg-muted/60"
                        aria-label={`Actions for ${s.displayName}`}
                        onClick={() => setMobileActionSubcontractorId(s.id)}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            {viewMode === "cards" ? (
              <div className="hidden md:grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {rows.map((s) => {
                  const assignments = subAssignments.get(s.id) || [];
                  return (
                    <Card key={s.id} surface="interactive" className="group p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <IconWell tone="primary" size="lg" shape="panel" className="mb-3">
                            <Wrench className="h-4 w-4" />
                          </IconWell>
                          <h3 className="truncate text-base font-semibold">{s.displayName}</h3>
                          <p className="mt-1 truncate text-sm text-muted-foreground">{s.companyName ?? "No company"}</p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <TradeBadge trade={s.trade} size="sm" />
                          <Badge tone={isActive(s.id) ? "success" : "neutral"} appearance="soft" size="xs" dot>
                            {isActive(s.id) ? "Assigned" : "Unassigned"}
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3 border-y border-border/60 py-3">
                        <div className="min-w-0 flex-1 text-xs text-muted-foreground">
                          <p className="truncate">{s.phone ?? "No phone"}</p>
                          <p className="mt-1 truncate">{s.email ?? "No email"}</p>
                        </div>
                        <div className="flex-shrink-0">{renderContactActions(s)}</div>
                      </div>

                      <div className="mt-4 space-y-3">
                        {renderAssignmentPreview(s)}
                        {s.notes && (
                          <p className="line-clamp-2 text-xs text-muted-foreground">{s.notes}</p>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          {assignments.length} active phase{assignments.length === 1 ? "" : "s"}
                        </span>
                        <div className="flex items-center gap-1 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                          {assignments[0] && (
                            <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                              <Link
                                to={`/project/${assignments[0].project.id}/phase/${assignments[0].phase.id}`}
                                aria-label={`Open ${s.displayName} assignment`}
                              >
                                <ArrowUpRight className="h-4 w-4" />
                              </Link>
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Edit ${s.displayName}`} onClick={() => handleEdit(s)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            aria-label={`Delete ${s.displayName}`}
                            onClick={() => handleDelete(s)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card surface="panel" className="hidden md:block overflow-x-auto">
                <div style={{ width: '1300px' }}>
                  <Table className="table-fixed">
                    <TableHeader>
                      <TableRow>
                        <TableHead style={{ width: '240px' }}>Subcontractor</TableHead>
                        <TableHead style={{ width: '110px' }}>Trade</TableHead>
                        <TableHead style={{ width: '160px' }}>Contact</TableHead>
                        <TableHead style={{ width: '90px' }} className="text-right">Status</TableHead>
                        <TableHead style={{ width: '80px' }} className="text-right">Assigned</TableHead>
                        <TableHead style={{ width: '220px' }}>Next finish</TableHead>
                        <TableHead style={{ width: '400px' }} className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((s) => {
                      const assignments = subAssignments.get(s.id) || [];
                      const primaryAssignment = firstScheduledAssignment(assignments);
                      return (
                        <TableRow key={s.id}>
                          <TableCell>
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-foreground">{s.displayName}</div>
                              <div className="truncate text-xs text-muted-foreground">{s.companyName ?? "No company"}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <TradeBadge trade={s.trade} size="sm" />
                          </TableCell>
                          <TableCell>
                            <div className="min-w-0 text-xs text-muted-foreground">
                              <div className="truncate">{s.phone ?? "-"}</div>
                              <div className="truncate">{s.email ?? "-"}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`text-xs font-medium ${isActive(s.id) ? "text-emerald-500" : "text-muted-foreground"}`}>
                              {isActive(s.id) ? "Assigned" : "Unassigned"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">{assignments.length}</TableCell>
                          <TableCell className="min-w-0 truncate overflow-hidden text-xs text-muted-foreground">
                            {primaryAssignment ? (
                              <Link
                                to={`/project/${primaryAssignment.project.id}/phase/${primaryAssignment.phase.id}`}
                                className="hover:underline text-primary block truncate"
                                aria-label={`Open ${primaryAssignment.project.name} ${phaseLabel(primaryAssignment.phase)} phase`}
                              >
                                {formatDateWithOptions(primaryAssignment.phase.scheduledEnd, { showYear: true })} · {primaryAssignment.project.name}
                              </Link>
                            ) : (
                              "No scheduled finish"
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap overflow-hidden">
                            <div className="flex justify-end gap-1 flex-shrink-0">
                              {renderContactActions(s, true)}
                              <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={`Edit ${s.displayName}`} onClick={() => handleEdit(s)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-destructive hover:text-destructive"
                                aria-label={`Delete ${s.displayName}`}
                                onClick={() => handleDelete(s)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
              </Card>
            )}
          </>
        )}

        <p className="text-[11px] text-muted-foreground/70 text-center">
          Prototype data · Backend swap-in via lib/api adapters
        </p>
      </main>

      <Fab label="Add subcontractor" icon={<Plus className="h-6 w-6" />} onClick={() => setIsAddDialogOpen(true)} />

      <BottomSheet open={!!mobileActionSubcontractor} onOpenChange={(open) => { if (!open) setMobileActionSubcontractorId(null); }} title={mobileActionSubcontractor?.displayName}>
        {mobileActionSubcontractor && (
          <div className="grid gap-2">
            {mobileActionSubcontractor.phone && (
              <Button asChild variant="outline" className="justify-start">
                <a href={`tel:${mobileActionSubcontractor.phone}`}>
                  <Phone className="h-4 w-4" />
                  Call {mobileActionSubcontractor.phone}
                </a>
              </Button>
            )}
            {mobileActionSubcontractor.email && (
              <Button asChild variant="outline" className="justify-start">
                <a href={`mailto:${mobileActionSubcontractor.email}`}>
                  <Mail className="h-4 w-4" />
                  Email {mobileActionSubcontractor.email}
                </a>
              </Button>
            )}
            {(subAssignments.get(mobileActionSubcontractor.id) || []).slice(0, 3).map(({ phase, project }) => (
              <Button key={phase.id} asChild variant="outline" className="justify-start">
                <Link
                  to={`/project/${project.id}/phase/${phase.id}`}
                  onClick={() => setMobileActionSubcontractorId(null)}
                >
                  <ArrowUpRight className="h-4 w-4" />
                  {project.name} · {phaseLabel(phase)}
                </Link>
              </Button>
            ))}
            <Button
              type="button"
              variant="outline"
              className="justify-start"
              onClick={() => {
                setMobileActionSubcontractorId(null);
                handleEdit(mobileActionSubcontractor);
              }}
            >
              <Pencil className="h-4 w-4" />
              Edit subcontractor
            </Button>
            <Button
              type="button"
              variant="outline"
              className="justify-start text-destructive hover:text-destructive"
              onClick={() => {
                setMobileActionSubcontractorId(null);
                handleDelete(mobileActionSubcontractor);
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete subcontractor
            </Button>
          </div>
        )}
      </BottomSheet>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="md:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Subcontractor</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <SubcontractorFormFields formData={formData} fieldPrefix="add" onChange={setFormData} />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault();
                    (e.currentTarget as HTMLButtonElement).click();
                  }
                }}
              >
                {createMutation.isPending ? "Adding..." : "Add Subcontractor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="md:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Subcontractor</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <SubcontractorFormFields formData={formData} fieldPrefix="edit" onChange={setFormData} />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault();
                    (e.currentTarget as HTMLButtonElement).click();
                  }
                }}
              >
                {updateMutation.isPending ? "Updating..." : "Update Subcontractor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="md:max-w-[425px]">
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
