import { useEffect, useMemo, useRef } from "react";
import { ArrowUpRight, Building2, Mail, Phone, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ClientRecord, Project } from "@/lib/types";
import { relativeTime } from "@/lib/derived";

interface ClientDirectoryProps {
  clients: ClientRecord[];
  projects: Project[];
  loading?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onOpenClient?: (id: string) => void;
}

export function ClientDirectory({
  clients,
  projects,
  loading,
  search,
  onSearchChange,
  onOpenClient,
}: ClientDirectoryProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const normalizedSearch = search.trim().toLowerCase();
  const sortedClients = useMemo(
    () => [...clients].sort((a, b) => a.name.localeCompare(b.name)),
    [clients],
  );
  const filteredClients = sortedClients.filter((client) => {
    if (!normalizedSearch) return true;
    return [client.name, client.primaryContactName, client.phone, client.email]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(normalizedSearch));
  });

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName.toLowerCase();
      const isEditing =
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        tagName === "button" ||
        target?.isContentEditable;

      if (event.key === "Escape" && search) {
        event.preventDefault();
        onSearchChange("");
        searchInputRef.current?.focus();
        return;
      }

      if (isEditing || event.metaKey || event.ctrlKey || event.altKey || event.key.length !== 1) return;

      onSearchChange(search + event.key);
      requestAnimationFrame(() => searchInputRef.current?.focus());
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSearchChange, search]);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Client records</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Customer contacts with their active Titan PM project load.
          </p>
        </div>
        <div className="relative w-full md:w-[360px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search clients, contacts, email..."
            className="bg-background/60 pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <Card key={item} className="h-[210px] animate-pulse border-border bg-card/60" />
          ))}
        </div>
      ) : filteredClients.length === 0 ? (
        <Card className="border-border bg-gradient-surface p-8 text-center">
          <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />
          <h3 className="mt-3 font-semibold">No clients found</h3>
          <p className="mt-1 text-sm text-muted-foreground">Try a different name, contact, phone, or email.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {filteredClients.map((client) => {
            const clientProjects = projects.filter((project) => project.clientId === client.id);
            const activeProjects = clientProjects.filter((project) => project.status === "active");
            const latestProject = [...clientProjects].sort((a, b) =>
              a.updatedAt < b.updatedAt ? 1 : -1,
            )[0];

            return (
              <Card
                key={client.id}
                onClick={() => onOpenClient?.(client.id)}
                className="group cursor-pointer border-border bg-gradient-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-glow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <h3 className="truncate text-base font-semibold">{client.name}</h3>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {client.primaryContactName ?? "No primary contact"}
                    </p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>

                <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                </div>

                <div className="mt-5 border-t border-border/60 pt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Active projects</span>
                    <span className="font-semibold tabular-nums text-foreground">{activeProjects.length}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Total jobs</span>
                    <span className="font-semibold tabular-nums text-foreground">{clientProjects.length}</span>
                  </div>
                  <p className="mt-3 truncate text-[11px] text-muted-foreground">
                    {latestProject ? `Latest: ${latestProject.name} - ${relativeTime(latestProject.updatedAt)}` : "No projects yet"}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
