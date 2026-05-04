import { useEffect, useMemo, useState } from "react";
import { Plus, HardHat, AlertCircle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatsRow } from "@/components/dashboard/StatsRow";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { AtticAlertsPanel, DueInspectionsPanel } from "@/components/dashboard/AlertPanels";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { RoleSwitcher } from "@/components/dashboard/RoleSwitcher";
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

const DashboardPage = () => {
  const qc = useQueryClient();
  const [filters, setFilters] = useState<ProjectFilters>({});
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

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

  const me = meQ.data?.ok ? meQ.data.data : undefined;
  const users = usersQ.data?.ok ? usersQ.data.data : [];
  const pms = users.filter((u) => u.role === "project_manager");
  const clients = clientsQ.data?.ok ? clientsQ.data.data : [];
  const phases = phasesQ.data?.ok ? phasesQ.data.data : [];
  const gates = gatesQ.data?.ok ? gatesQ.data.data : [];
  const defs = defsQ.data?.ok ? defsQ.data.data : [];
  const photos = photosQ.data?.ok ? photosQ.data.data : [];
  const projects = projectsQ.data?.ok ? projectsQ.data.data : [];

  const isAdmin = me?.role === "admin";

  const handleSwitchUser = (userId: string) => {
    setCurrentUser(userId);
    qc.invalidateQueries();
    toast.success("Switched user");
  };

  const handleOpenProject = (id: string) => {
    toast("Project detail not in this iteration", { description: id });
  };

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
    meQ.isLoading || projectsQ.isLoading || phasesQ.isLoading || gatesQ.isLoading || clientsQ.isLoading;
  const hasError =
    (meQ.data && !meQ.data.ok) ||
    (projectsQ.data && !projectsQ.data.ok) ||
    projectsQ.isError;

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
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground hidden sm:inline-flex">
                <Plus className="h-4 w-4 mr-1" />
                New project
              </Button>
            )}
            {me && <RoleSwitcher current={me} users={users} onSwitch={handleSwitchUser} />}
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* Title */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isAdmin
                ? "All active jobs, blocked work, and inspections across the org."
                : "Your assigned projects and the work that needs attention."}
            </p>
          </div>
        </div>

        {/* Error */}
        {hasError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Couldn't load dashboard</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>Something went wrong fetching projects.</span>
              <Button size="sm" variant="outline" onClick={() => projectsQ.refetch()}>Retry</Button>
            </AlertDescription>
          </Alert>
        )}

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

        <p className="text-[11px] text-muted-foreground/70 text-center pt-4">
          Prototype data · Backend swap-in via lib/api adapters
        </p>
      </main>
    </div>
  );
};

export default DashboardPage;
