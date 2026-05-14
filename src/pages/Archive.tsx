import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProjectResults } from "@/components/dashboard/ProjectResults";
import { EmptyState } from "@/components/dashboard/EmptyState";
import {
  getAllDeficiencies,
  getAllGates,
  getAllPhases,
  getClients,
  getCurrentUser,
  getProjects,
  getUsers,
} from "@/lib/api";
import type { ProjectFilters } from "@/lib/types";
import { useTypeToSearch } from "@/hooks/useTypeToSearch";

const ArchivePage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useTypeToSearch({
    searchInputRef,
    search,
    onSearchChange: setSearch,
  });

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

  const archiveFilters: ProjectFilters = useMemo(
    () => ({ status: ["archived"], search: debouncedSearch || undefined }),
    [debouncedSearch],
  );

  const projectsQ = useQuery({
    queryKey: ["projects", archiveFilters, meQ.data?.ok ? meQ.data.data.id : null],
    queryFn: () => getProjects(archiveFilters),
  });

  const me = meQ.data?.ok ? meQ.data.data : undefined;
  const users = usersQ.data?.ok ? usersQ.data.data : [];
  const pms = users.filter((u) => u.role === "project_manager" && u.active);
  const defs = defsQ.data?.ok ? defsQ.data.data : [];
  const clients = useMemo(() => (clientsQ.data?.ok ? clientsQ.data.data : []), [clientsQ.data]);
  const phases = useMemo(() => (phasesQ.data?.ok ? phasesQ.data.data : []), [phasesQ.data]);
  const gates = useMemo(() => (gatesQ.data?.ok ? gatesQ.data.data : []), [gatesQ.data]);
  const projects = useMemo(() => (projectsQ.data?.ok ? projectsQ.data.data : []), [projectsQ.data]);

  const isAdmin = me?.role === "admin";

  const isLoading = meQ.isLoading || projectsQ.isLoading || phasesQ.isLoading || gatesQ.isLoading || clientsQ.isLoading;
  const hasError =
    (meQ.data && !meQ.data.ok) ||
    (projectsQ.data && !projectsQ.data.ok) ||
    (clientsQ.data && !clientsQ.data.ok) ||
    projectsQ.isError ||
    clientsQ.isError;


  return (
    <div className="min-h-screen bg-background">
      <AppHeader activeSection="archive" currentUser={me} />

      <main className="container py-6 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Archive</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Completed projects that have been archived and are no longer active.
          </p>
        </div>

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
                  clientsQ.refetch();
                }}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Card surface="inset" className="space-y-3 p-4 md:sticky md:top-2 md:z-10 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              id="archive-search"
              name="archiveSearch"
              aria-label="Search archived projects"
              placeholder="Search archived projects…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background/60"
            />
          </div>
        </Card>

        <ProjectResults
          title="Archived Projects"
          projects={projects}
          clients={clients}
          users={users}
          phases={phases}
          gates={gates}
          deficiencies={defs}
          loading={isLoading}
          emptyState={
            <EmptyState
              variant={!debouncedSearch ? "no-projects" : "no-matches"}
              onClear={() => setSearch("")}
            />
          }
          onOpenProject={(id) => navigate(`/project/${id}`)}
        />

        <p className="text-[11px] text-muted-foreground/70 text-center pt-4">
          Prototype data · Backend swap-in via lib/api adapters
        </p>
      </main>

    </div>
  );
};

export default ArchivePage;
