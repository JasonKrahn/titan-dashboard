import { ArrowLeft, Mail, Phone, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import type { ClientRecord, Deficiency, Gate, Phase, Project, ProjectStatus, User } from "@/lib/types";

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
}: ClientProjectsViewProps) {
  const visibleProjects = [...projects]
    .filter((project) => filter === "all" || project.status === filter)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  return (
    <section className="space-y-5">
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

        <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={onCreateProject}>
          <Plus className="mr-1 h-4 w-4" />
          New project
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Client projects</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Sorted by last updated with project addresses and phase status.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onFilterChange(item.value)}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === item.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {visibleProjects.length === 0 ? (
        <Card className="border-border bg-gradient-surface p-8 text-center">
          <h3 className="font-semibold">No projects in this view</h3>
          <p className="mt-1 text-sm text-muted-foreground">Try another project status.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              client={client}
              pm={users.find((user) => user.id === project.assignedProjectManagerId)}
              phases={phases}
              gates={gates}
              deficiencies={deficiencies}
              onOpen={onOpenProject}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export type { ClientProjectFilter };
