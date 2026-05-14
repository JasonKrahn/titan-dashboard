import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AlertCircle, Plus, SlidersHorizontal } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { AppHeader, type DashboardViewTarget } from "@/components/dashboard/AppHeader";
import { StatsRow } from "@/components/dashboard/StatsRow";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { ProjectResults } from "@/components/dashboard/ProjectResults";
import { ClientDirectory } from "@/components/dashboard/ClientDirectory";
import { ClientProjectsView, type ClientProjectFilter } from "@/components/dashboard/ClientProjectsView";
import { ArchivePanel, DueInspectionsPanel } from "@/components/dashboard/AlertPanels";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ArchiveProjectDialog } from "@/components/dashboard/ArchiveProjectDialog";
import { InspectionResultDialog } from "@/components/dashboard/InspectionResultDialog";
import { NewClientDialog } from "@/components/dashboard/NewClientDialog";
import { NewProjectDialog } from "@/components/dashboard/NewProjectDialog";
import {
  getAllDeficiencies,
  getAllGates,
  getAllPhases,
  getAllPhotos,
  getClients,
  getCurrentUser,
  getProjects,
  getUsers,
} from "@/lib/api";
import type { ProjectFilters } from "@/lib/types";

type ActiveView = "clients" | "client-projects" | "dashboard";
type DashboardRouteState = { clientId?: string; view?: DashboardViewTarget } | null;

const DashboardPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeView, setActiveView] = useState<ActiveView>("clients");
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>();
  const [clientProjectFilter, setClientProjectFilter] = useState<ClientProjectFilter>("all");
  const [filters, setFilters] = useState<ProjectFilters>({});
  const [search, setSearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [editClientId, setEditClientId] = useState<string | undefined>();
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [editProjectId, setEditProjectId] = useState<string | undefined>();
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; name: string } | null>(null);
  const [inspectionTarget, setInspectionTarget] = useState<{ gateId: string; phaseId: string; projectId: string; phaseLabel: string; mode: "passed" | "failed" } | null>(null);
  const [newProjectClientId, setNewProjectClientId] = useState<string | undefined>();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [activeStatFilter, setActiveStatFilter] = useState<"active" | "blocked" | "inspections" | null>(null);
  const [defaultedUserId, setDefaultedUserId] = useState<string | undefined>();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(t);
  }, [search]);

  const meQ = useQuery({ queryKey: ["me"], queryFn: getCurrentUser });
  const usersQ = useQuery({ queryKey: ["users"], queryFn: getUsers });

  useEffect(() => {
    if (!meQ.data?.ok) return;

    const user = meQ.data.data;
    if (user.role === "inventory_viewer") {
      navigate("/inventory");
      return;
    }
    if (defaultedUserId === user.id) return;

    setDefaultedUserId(user.id);
    if (user.role === "project_manager") {
      setActiveView("dashboard");
    }
  }, [defaultedUserId, meQ.data, navigate]);
  const clientsQ = useQuery({ queryKey: ["clients"], queryFn: getClients });
  const phasesQ = useQuery({ queryKey: ["phases"], queryFn: getAllPhases });
  const gatesQ = useQuery({ queryKey: ["gates"], queryFn: getAllGates });
  const defsQ = useQuery({ queryKey: ["deficiencies"], queryFn: getAllDeficiencies });
  const photosQ = useQuery({ queryKey: ["photos"], queryFn: getAllPhotos });

  const nonArchivedFilters = useMemo(
    () => ({
      ...filters,
      search: debouncedSearch || undefined,
      status: filters.status?.length ? filters.status : (["draft", "active", "completed"] as ProjectFilters["status"]),
    }),
    [filters, debouncedSearch],
  );
  const projectsQ = useQuery({
    queryKey: ["projects", nonArchivedFilters, meQ.data?.ok ? meQ.data.data.id : null],
    queryFn: () => getProjects(nonArchivedFilters),
  });
  const allProjectsQ = useQuery({
    queryKey: ["projects", "all-visible", meQ.data?.ok ? meQ.data.data.id : null],
    queryFn: () => getProjects(),
  });

  const me = meQ.data?.ok ? meQ.data.data : undefined;
  const users = usersQ.data?.ok ? usersQ.data.data : [];
  const pms = users.filter((u) => u.role === "project_manager" && u.active);
  const defs = defsQ.data?.ok ? defsQ.data.data : [];
  const clients = useMemo(() => (clientsQ.data?.ok ? clientsQ.data.data : []), [clientsQ.data]);
  const phases = useMemo(() => (phasesQ.data?.ok ? phasesQ.data.data : []), [phasesQ.data]);
  const gates = useMemo(() => (gatesQ.data?.ok ? gatesQ.data.data : []), [gatesQ.data]);
  const photos = useMemo(() => (photosQ.data?.ok ? photosQ.data.data : []), [photosQ.data]);
  const projects = useMemo(() => (projectsQ.data?.ok ? projectsQ.data.data : []), [projectsQ.data]);
  const allProjects = useMemo(() => (allProjectsQ.data?.ok ? allProjectsQ.data.data : []), [allProjectsQ.data]);
  const selectedClient = clients.find((client) => client.id === selectedClientId);
  const selectedClientProjects = useMemo(
    () => (selectedClientId ? allProjects.filter((project) => project.clientId === selectedClientId) : []),
    [allProjects, selectedClientId],
  );

  const isAdmin = me?.role === "admin";

  const handleOpenProject = (id: string) => {
    navigate(`/project/${id}`);
  };

  const handleSelectDashboardView = (view: DashboardViewTarget) => {
    setSelectedClientId(undefined);
    setClientProjectFilter("all");
    setActiveView(view);
  };

  const handleOpenClient = (id: string) => {
    setSelectedClientId(id);
    setClientProjectFilter("all");
    setActiveView("client-projects");
  };

  useEffect(() => {
    const state = location.state as DashboardRouteState;
    if (state?.clientId) {
      if (me?.id) setDefaultedUserId(me.id);
      handleOpenClient(state.clientId);
      window.history.replaceState({}, "");
      return;
    }
    if (state?.view) {
      if (me?.id) setDefaultedUserId(me.id);
      handleSelectDashboardView(state.view);
      window.history.replaceState({}, "");
    }
  }, [location.state, me?.id]);

  const handleEditClient = (id: string) => {
    setEditClientId(id);
  };

  const handleStatFilterSelect = (filter: "active" | "blocked" | "inspections" | null) => {
    if (filter === activeStatFilter) {
      // Clear filter if clicking the same one
      setActiveStatFilter(null);
      setFilters({});
      setSearch("");
    } else {
      // Replace all filters with the selected stat filter
      setActiveStatFilter(filter);
      setSearch("");
      if (filter === "active") {
        setFilters({ status: ["active"] });
      } else if (filter === "blocked") {
        setFilters({ hasBlockedWork: true });
      } else if (filter === "inspections") {
        setFilters({ phaseStatus: ["ready_for_inspection"] });
      }
    }
  };

  useEffect(() => {
    if (selectedClientId && clients.length && !clients.some((client) => client.id === selectedClientId)) {
      setSelectedClientId(undefined);
      setActiveView("clients");
    }
  }, [clients, selectedClientId]);

  // Clear activeStatFilter when FilterBar filters change (mutual exclusivity)
  useEffect(() => {
    if (activeStatFilter && Object.keys(filters).length > 0) {
      const hasNonStatFilter = Object.keys(filters).some(
        (key) => key !== "status" && key !== "hasBlockedWork" && key !== "phaseStatus"
      );
      if (hasNonStatFilter) {
        setActiveStatFilter(null);
      }
    }
  }, [filters, activeStatFilter]);

  // Clear activeStatFilter when search changes (mutual exclusivity)
  useEffect(() => {
    if (activeStatFilter && debouncedSearch) {
      setActiveStatFilter(null);
    }
  }, [debouncedSearch, activeStatFilter]);

  // Derived stats — confined to projects visible to the current user.
  const visibleProjectIds = useMemo(() => new Set(projects.map((p) => p.id)), [projects]);

  const stats = useMemo(() => {
    const visiblePhases = phases.filter((p) => visibleProjectIds.has(p.projectId));
    const visibleGates = gates.filter((g) => visibleProjectIds.has(g.projectId));

    const active = projects.filter((p) => p.status === "active").length;
    const blockedItems =
      visiblePhases.filter((p) => p.status === "blocked").length +
      visibleGates.filter((g) => g.status === "blocked" || g.status === "failed").length;
    const inspections = visiblePhases.filter((p) => p.status === "ready_for_inspection").length;

    return { active, blockedItems, inspections };
  }, [projects, phases, gates, visibleProjectIds]);

  // Attic alerts — projects in current view that need confirmed attic photo.
  const atticMissing = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => {
      if (p.status === "draft" || p.status === "archived") return;
      const hasConfirmed = photos.some(
        (ph) => ph.projectId === p.id && ph.purpose === "attic_check" && ph.status === "confirmed",
      );
      if (!hasConfirmed && p.atticCheckStatus !== "passed") set.add(p.id);
    });
    return set;
  }, [projects, photos]);

  const visiblePhases = useMemo(
    () => phases.filter((p) => visibleProjectIds.has(p.projectId)),
    [phases, visibleProjectIds],
  );

  const isLoading =
    meQ.isLoading || projectsQ.isLoading || phasesQ.isLoading || gatesQ.isLoading || clientsQ.isLoading || allProjectsQ.isLoading;
  const hasError =
    (meQ.data && !meQ.data.ok) ||
    (projectsQ.data && !projectsQ.data.ok) ||
    (allProjectsQ.data && !allProjectsQ.data.ok) ||
    (clientsQ.data && !clientsQ.data.ok) ||
    projectsQ.isError ||
    allProjectsQ.isError ||
    clientsQ.isError;
  const activeFilterCount =
    Number(!!search) +
    Number(!!filters.clientId) +
    Number(!!filters.status?.length) +
    Number(!!filters.assignedProjectManagerId) +
    Number(!!filters.hasBlockedWork) +
    Number(!!filters.missingAtticEvidence);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        activeSection={activeView === "dashboard" ? "dashboard" : "clients"}
        onSelectDashboardView={handleSelectDashboardView}
        onUserSwitch={() => handleSelectDashboardView("clients")}
        currentUser={me}
      />

      <main className="container py-6 space-y-6">
        {/* Title */}
        {activeView !== "client-projects" && (
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              {activeView === "dashboard" ? "All Projects" : "Clients"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {activeView === "dashboard"
                ? isAdmin
                  ? "Org-wide project view for active jobs, blocked work, and inspections."
                  : "All assigned projects and the work that needs attention."
                : "Customer records and the project load attached to each account."}
            </p>
          </div>
        )}

        {/* Error */}
        {hasError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Couldn't load data</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>Something went wrong fetching records.</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  projectsQ.refetch();
                  allProjectsQ.refetch();
                  clientsQ.refetch();
                }}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {activeView === "client-projects" && selectedClient ? (
          <ClientProjectsView
            client={selectedClient}
            projects={selectedClientProjects}
            users={users}
            phases={phases}
            gates={gates}
            deficiencies={defs}
            filter={clientProjectFilter}
            onFilterChange={setClientProjectFilter}
            onBack={() => {
              setSelectedClientId(undefined);
              setActiveView("clients");
            }}
            onCreateProject={() => {
              setNewProjectClientId(selectedClient.id);
              setNewProjectOpen(true);
            }}
            onOpenProject={handleOpenProject}
            onArchiveProject={(id, name) => setArchiveTarget({ id, name })}
            onEditProject={(id) => setEditProjectId(id)}
          />
        ) : activeView === "clients" || activeView === "client-projects" ? (
          <ClientDirectory
            clients={clients}
            projects={allProjects}
            loading={clientsQ.isLoading || allProjectsQ.isLoading}
            search={clientSearch}
            onSearchChange={setClientSearch}
            onOpenClient={handleOpenClient}
            onEditClient={handleEditClient}
            onNewClient={() => setNewClientOpen(true)}
            isAdmin={!!isAdmin}
          />
        ) : (
          <>
            {/* New Project button - positioned below description, above Stats */}
            {(me?.role === "admin" || me?.role === "project_manager") && (
              <div className="flex justify-start">
                <Button
                  type="button"
                  onClick={() => {
                    setNewProjectClientId(undefined);
                    setNewProjectOpen(true);
                  }}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  New Project
                </Button>
              </div>
            )}

            {/* Stats */}
            <StatsRow
              loading={isLoading}
              activeProjects={stats.active}
              blockedItems={stats.blockedItems}
              inspectionsDueThisWeek={stats.inspections}
              activeFilter={activeStatFilter}
              onSelect={handleStatFilterSelect}
            />

            {/* Filters */}
            <div className="md:hidden">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between bg-card"
                onClick={() => setMobileFiltersOpen(true)}
              >
                <span className="inline-flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                </span>
                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </div>
            <div className="hidden md:block">
              <FilterBar
                filters={filters}
                search={search}
                onSearchChange={setSearch}
                onChange={setFilters}
                clients={clients}
                pms={pms}
                isAdmin={!!isAdmin}
              />
            </div>

            {/* Alert panels */}
            {!isLoading && (projects.some(p => p.status === "completed") || visiblePhases.some((p) => p.status === "ready_for_inspection")) && (
              <div className="grid gap-4 md:grid-cols-2">
                <DueInspectionsPanel
                  projects={projects}
                  phases={visiblePhases}
                  gates={gates}
                  onOpen={handleOpenProject}
                  onPass={(gateId, phaseId, projectId, phaseLabel) => setInspectionTarget({ gateId, phaseId, projectId, phaseLabel, mode: "passed" })}
                  onFail={(gateId, phaseId, projectId, phaseLabel) => setInspectionTarget({ gateId, phaseId, projectId, phaseLabel, mode: "failed" })}
                />
                <ArchivePanel projects={projects} onOpen={handleOpenProject} onArchive={(id, name) => setArchiveTarget({ id, name })} />
              </div>
            )}

            <ProjectResults
              title="Projects"
              projects={projects}
              clients={clients}
              users={users}
              phases={phases}
              gates={gates}
              deficiencies={defs}
              loading={isLoading}
              emptyState={
                <EmptyState
                  variant={
                    Object.keys(filters).length === 0 && !debouncedSearch ? "no-projects" : "no-matches"
                  }
                  onClear={() => {
                    setFilters({});
                    setSearch("");
                  }}
                />
              }
              onOpenProject={handleOpenProject}
              onArchiveProject={(id, name) => setArchiveTarget({ id, name })}
              onEditProject={(id) => setEditProjectId(id)}
            />
          </>
        )}

        <p className="text-[11px] text-muted-foreground/70 text-center pt-4">
          Prototype data · Backend swap-in via lib/api adapters
        </p>
      </main>

      <NewClientDialog
        open={newClientOpen || !!editClientId}
        onOpenChange={(open) => {
          if (!open) {
            setNewClientOpen(false);
            setEditClientId(undefined);
          } else if (editClientId) {
            setEditClientId(editClientId);
          } else {
            setNewClientOpen(true);
          }
        }}
        client={clients.find((c) => c.id === editClientId)}
        onCreated={(id) => handleOpenClient(id)}
        onUpdated={() => {
          setEditClientId(undefined);
        }}
        onDeleted={(id) => {
          setEditClientId(undefined);
          if (selectedClientId === id) {
            setSelectedClientId(undefined);
            setActiveView("clients");
          }
        }}
      />
      <NewProjectDialog
        open={newProjectOpen}
        onOpenChange={setNewProjectOpen}
        currentUser={me}
        presetClientId={newProjectClientId}
      />
      <NewProjectDialog
        open={!!editProjectId}
        onOpenChange={(open) => { if (!open) setEditProjectId(undefined); }}
        currentUser={me}
        project={projects.find(p => p.id === editProjectId)}
        onUpdated={() => setEditProjectId(undefined)}
        onDeleted={() => setEditProjectId(undefined)}
      />
      {archiveTarget && (
        <ArchiveProjectDialog
          open={!!archiveTarget}
          onOpenChange={(o) => { if (!o) setArchiveTarget(null); }}
          projectId={archiveTarget.id}
          projectName={archiveTarget.name}
        />
      )}
      {inspectionTarget && (
        <InspectionResultDialog
          open={!!inspectionTarget}
          onOpenChange={(o) => { if (!o) setInspectionTarget(null); }}
          gateId={inspectionTarget.gateId}
          phaseId={inspectionTarget.phaseId}
          projectId={inspectionTarget.projectId}
          phaseLabel={inspectionTarget.phaseLabel}
          mode={inspectionTarget.mode}
        />
      )}
      <BottomSheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen} title="Filters">
        <FilterBar
          filters={filters}
          search={search}
          onSearchChange={setSearch}
          onChange={setFilters}
          clients={clients}
          pms={pms}
          isAdmin={!!isAdmin}
        />
      </BottomSheet>
    </div>
  );
};

export default DashboardPage;
