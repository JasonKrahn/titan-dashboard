import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Grid2X2, List, Mail, Phone, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeading } from "@/components/ui/section-heading";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProjectResults, type ProjectDisplayMode } from "@/components/dashboard/ProjectResults";
import type { ClientRecord, Deficiency, Gate, Phase, Project, ProjectStatus, User } from "@/lib/types";
import { useTypeToSearch } from "@/hooks/useTypeToSearch";

type ClientProjectFilter = "all" | ProjectStatus;

interface ClientProjectsViewProps {
  client: ClientRecord;
  projects: Project[];
  users: User[];
  phases: Phase[];
  gates: Gate[];
  deficiencies: Deficiency[];
  filter: ClientProjectFilter;
  onFilterChange: (filter: ClientProjectFilter) => void;
  onBack: () => void;
  onCreateProject?: () => void;
  onOpenProject?: (id: string) => void;
  onArchiveProject?: (id: string, name: string) => void;
  onEditProject?: (id: string) => void;
}

const filters: { value: ClientProjectFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Upcoming" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

export function ClientProjectsView({
  client,
  projects,
  users,
  phases,
  gates,
  deficiencies,
  filter,
  onFilterChange,
  onBack,
  onCreateProject,
  onOpenProject,
  onArchiveProject,
  onEditProject,
}: ClientProjectsViewProps) {
  const [displayMode, setDisplayMode] = useState<ProjectDisplayMode>(() => {
    const saved = localStorage.getItem("clientProjectViewMode");
    return saved === "list" || saved === "cards" ? saved : "list";
  });
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useTypeToSearch({
    searchInputRef,
    search,
    onSearchChange: setSearch,
  });

  useEffect(() => {
    localStorage.setItem("clientProjectViewMode", displayMode);
  }, [displayMode]);

  const visibleProjects = projects
    .filter((project) => filter === "all" || project.status === filter)
    .filter((project) => {
      if (!search) return true;
      const searchLower = search.toLowerCase();
      return (
        project.name.toLowerCase().includes(searchLower) ||
        project.projectNumber.toLowerCase().includes(searchLower) ||
        project.siteAddress?.toLowerCase().includes(searchLower)
      );
    });

  return (
    <section className="space-y-5 pb-20 md:pb-0">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-muted-foreground" onClick={onBack}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Clients
          </Button>
          <h2 className="truncate text-2xl font-bold sm:text-3xl">{client.name}</h2>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {client.primaryContactName && <span>{client.primaryContactName}</span>}
            {client.phone && (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                {client.phone}
              </span>
            )}
            {client.email && (
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                {client.email}
              </span>
            )}
          </div>
        </div>
      </div>

      {client.notes && (
        <Card surface="inset" className="p-4 text-sm text-muted-foreground">
          {client.notes}
        </Card>
      )}

      <div className="flex items-baseline gap-3">
        <SectionHeading>Projects</SectionHeading>
        <span className="text-xs text-muted-foreground tabular-nums">
          {visibleProjects.length} shown
        </span>
      </div>

      <div className="space-y-3">
        {onCreateProject && (
          <div className="hidden md:block">
            <Button
              className="h-10 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={onCreateProject}
            >
              <Plus className="mr-1 h-4 w-4" />
              New project
            </Button>
          </div>
        )}
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            id="client-project-search"
            name="clientProjectSearch"
            aria-label="Search client projects"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="bg-background/60 pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filter} onValueChange={onFilterChange}>
            <SelectTrigger id="client-project-filter" name="clientProjectFilter" aria-label="Filter client projects" className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              {filters.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <SegmentedControl>
            <Button
              type="button"
              variant={displayMode === "list" ? "default" : "ghost"}
              size="sm"
              className="h-8 px-2"
              aria-pressed={displayMode === "list"}
              onClick={() => setDisplayMode("list")}
            >
              <List className="h-4 w-4" />
              List
            </Button>
            <Button
              type="button"
              variant={displayMode === "cards" ? "default" : "ghost"}
              size="sm"
              className="h-8 px-2"
              aria-pressed={displayMode === "cards"}
              onClick={() => setDisplayMode("cards")}
            >
              <Grid2X2 className="h-4 w-4" />
              Cards
            </Button>
          </SegmentedControl>
        </div>
      </div>

      <ProjectResults
        title="Projects"
        projects={visibleProjects}
        clients={[client]}
        users={users}
        phases={phases}
        gates={gates}
        deficiencies={deficiencies}
        includeClientColumn={false}
        emptyState={
          <Card surface="panel" className="p-8 text-center">
            <h3 className="font-semibold">No projects in this view</h3>
            <p className="mt-1 text-sm text-muted-foreground">Try another project status.</p>
          </Card>
        }
        onOpenProject={onOpenProject}
        onArchiveProject={onArchiveProject}
        onEditProject={onEditProject}
        displayMode={displayMode}
        onDisplayModeChange={setDisplayMode}
        showTitle={false}
      />
      {onCreateProject && (
        <Button
          type="button"
          size="icon"
          aria-label="New project"
          className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-30 h-14 w-14 rounded-full shadow-glow md:hidden"
          onClick={onCreateProject}
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}
    </section>
  );
}

export type { ClientProjectFilter };
