import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, HardHat, AlertCircle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatsRow } from "@/components/dashboard/StatsRow";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { ClientDirectory } from "@/components/dashboard/ClientDirectory";
import { ClientProjectsView, type ClientProjectFilter } from "@/components/dashboard/ClientProjectsView";
import { AtticAlertsPanel, DueInspectionsPanel } from "@/components/dashboard/AlertPanels";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { RoleSwitcher } from "@/components/dashboard/RoleSwitcher";
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
  setCurrentUser,
} from "@/lib/api";
import type { ProjectFilters } from "@/lib/types";
import { projectHasBlocked } from "@/lib/derived";
import { toast } from "sonner";

type ActiveView = "clients" | "client-projects" | "dashboard";

const DashboardPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeView, setActiveView] = useState<ActiveView>("clients");
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>();
  const [clientProjectFilter, setClientProjectFilter] = useState<ClientProjectFilter>("all");
  const [filters, setFilters] = useState<ProjectFilters>({});
  const [search, setSearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectClientId, setNewProjectClientId] = useState<string | undefined>();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(t);
  }, [search]);

  const meQ = useQuery({ queryKey: ["me"], queryFn: getCurrentUser });
  const usersQ = useQuery({ queryKey: ["users"], queryFn: getUsers });
  const clientsQ = useQuery({ queryKey: ["clients"], queryFn: getClients });
  const phasesQ = useQuery({ queryKey: ["phases"], queryFn: getAllPhases });
  const gatesQ = useQuery({ queryKey: ["gates"], queryFn: getAllGates });
  const defsQ = useQuery({ queryKey: ["deficiencies"], queryFn: getAllDeficiencies });
  const photosQ = useQuery({ queryKey: ["photos"], queryFn: getAllPhotos });

  const projectsQ = useQuery({
    queryKey: ["projects", { ...filters, search: debouncedSearch }, meQ.data?.ok ? meQ.data.data.id : null],
    queryFn: () => getProjects({ ...filters, search: debouncedSearch || undefined }),
  });
  const allProjectsQ = useQuery({
    queryKey: ["projects", "all-visible", meQ.data?.ok ? meQ.data.data.id : null],
    queryFn: () => getProjects(),
  });

  const me = meQ.data?.ok ? meQ.data.data : undefined;
  const users = usersQ.data?.ok ? usersQ.data.data : [];
  const pms = users.filter((u) => u.role === "project_manager");
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

  const handleSwitchUser = (userId: string) => {
    setCurrentUser(userId);
    setActiveView("clients");
    setSelectedClientId(undefined);
    setClientProjectFilter("all");
    qc.invalidateQueries();
    toast.success("Switched user");
  };

  const handleOpenProject = (id: string) => {
    navigate(`/project/${id}`);
  };

  const handleOpenClient = (id: string) => {
    setSelectedClientId(id);
    setClientProjectFilter("all");
    setActiveView("client-projects");
  };

  useEffect(() => {
    if (selectedClientId && clients.length && !clients.some((client) => client.id === selectedClientId)) {
      setSelectedClientId(undefined);
      setActiveView("clients");
    }
  }, [clients, selectedClientId]);

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-20 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
              <HardHat className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-bold tracking-tight leading-tight">Titan PM</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Operations</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground hidden sm:inline-flex"
                onClick={() => {
                  if (activeView === "clients") {
                    setNewClientOpen(true);
                  } else {
                    setNewProjectClientId(undefined);
                    setNewProjectOpen(true);
                  }
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                {activeView === "clients" ? "New client" : "New project"}
              </Button>
            )}
            {me && <RoleSwitcher current={me} users={users} onSwitch={handleSwitchUser} />}
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* Title */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              {activeView === "dashboard" ? "Dashboard" : activeView === "client-projects" && selectedClient ? selectedClient.name : "Clients"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {activeView === "dashboard"
                ? isAdmin
                  ? "All active jobs, blocked work, and inspections across the org."
                  : "Your assigned projects and the work that needs attention."
                : activeView === "client-projects"
                  ? "Projects, addresses, and current status for the selected client."
                  : "Customer records and the project load attached to each account."}
            </p>
          </div>
          <div className="inline-flex w-full rounded-lg border border-border bg-card p-1 shadow-card sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setSelectedClientId(undefined);
                setActiveView("dashboard");
              }}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors sm:flex-none ${
                activeView === "dashboard"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedClientId(undefined);
                setActiveView("clients");
              }}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors sm:flex-none ${
                activeView === "clients" || activeView === "client-projects"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              Clients
            </button>
          </div>
        </div>

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
          />
        ) : activeView === "clients" || activeView === "client-projects" ? (
          <ClientDirectory
            clients={clients}
            projects={allProjects}
            loading={clientsQ.isLoading || allProjectsQ.isLoading}
            search={clientSearch}
            onSearchChange={setClientSearch}
            onOpenClient={handleOpenClient}
          />
        ) : (
          <>
            {/* Stats */}
            <StatsRow
              loading={isLoading}
              activeProjects={stats.active}
              blockedItems={stats.blockedItems}
              inspectionsDueThisWeek={stats.inspections}
            />

            {/* Filters */}
            <FilterBar
              filters={filters}
              search={search}
              onSearchChange={setSearch}
              onChange={setFilters}
              pms={pms}
              isAdmin={!!isAdmin}
            />

            {/* Alert panels */}
            {!isLoading && (atticMissing.size > 0 || visiblePhases.some((p) => p.status === "ready_for_inspection")) && (
              <div className="grid gap-4 md:grid-cols-2">
                <DueInspectionsPanel projects={projects} phases={visiblePhases} onOpen={handleOpenProject} />
                <AtticAlertsPanel projects={projects} missingProjectIds={atticMissing} onOpen={handleOpenProject} />
              </div>
            )}

            {/* Projects grid */}
            <div>
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-sm uppercase tracking-wider text-muted-foreground font-semibold">
                  Projects
                </h2>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {isLoading ? "—" : `${projects.length} shown`}
                </span>
              </div>

              {isLoading ? (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-[260px] rounded-lg" />
                  ))}
                </div>
              ) : projects.length === 0 ? (
                <EmptyState
                  variant={
                    Object.keys(filters).length === 0 && !debouncedSearch ? "no-projects" : "no-matches"
                  }
                  onClear={() => {
                    setFilters({});
                    setSearch("");
                  }}
                />
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                  {projects.map((p) => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      client={clients.find((c) => c.id === p.clientId)}
                      pm={users.find((u) => u.id === p.assignedProjectManagerId)}
                      phases={phases}
                      gates={gates}
                      deficiencies={defs}
                      onOpen={handleOpenProject}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <p className="text-[11px] text-muted-foreground/70 text-center pt-4">
          Prototype data · Backend swap-in via lib/api adapters
        </p>
      </main>

      <NewClientDialog
        open={newClientOpen}
        onOpenChange={setNewClientOpen}
        onCreated={(id) => handleOpenClient(id)}
      />
      <NewProjectDialog
        open={newProjectOpen}
        onOpenChange={setNewProjectOpen}
        currentUser={me}
        presetClientId={newProjectClientId}
      />
    </div>
  );
};

export default DashboardPage;
