import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { ClientRecord, ProjectFilters, ProjectStatus } from "@/lib/types";
import type { User } from "@/lib/types";

interface FilterBarProps {
  filters: ProjectFilters;
  search: string;
  onSearchChange: (s: string) => void;
  onChange: (next: ProjectFilters) => void;
  clients: ClientRecord[];
  pms: User[];
  isAdmin: boolean;
  hideStatus?: boolean;
}

export function FilterBar({ filters, search, onSearchChange, onChange, clients, pms, isAdmin, hideStatus }: FilterBarProps) {
  const clientValue = filters.clientId ?? "all";
  const statusValue = filters.status?.[0] ?? "all";
  const pmValue = filters.assignedProjectManagerId ?? "all";
  const sortedClients = [...clients].sort((a, b) => a.name.localeCompare(b.name));
  const projectStatuses: ProjectStatus[] = ["active", "completed", "draft"];

  const hasActive =
    !!search ||
    !!filters.clientId ||
    !!filters.status?.length ||
    !!filters.assignedProjectManagerId ||
    !!filters.hasBlockedWork ||
    !!filters.missingAtticEvidence;

  return (
    <Card surface="inset" className="space-y-3 p-4 md:sticky md:top-2 md:z-10 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="project-filter-search"
            name="projectFilterSearch"
            aria-label="Search projects"
            placeholder="Search projects, numbers, addresses…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-background/60"
          />
        </div>

        <Select
          value={clientValue}
          onValueChange={(v) =>
            onChange({
              ...filters,
              clientId: v === "all" ? undefined : v,
            })
          }
        >
          <SelectTrigger id="project-filter-client" name="projectFilterClient" aria-label="Filter projects by client" className="w-full bg-background/60 md:w-[180px]">
            <SelectValue placeholder="Client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {sortedClients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!hideStatus && (
          <Select
            value={statusValue}
            onValueChange={(v) =>
              onChange({
                ...filters,
                status: v === "all" ? undefined : [v as ProjectStatus],
              })
            }
          >
            <SelectTrigger id="project-filter-status" name="projectFilterStatus" aria-label="Filter projects by status" className="w-full bg-background/60 md:w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {projectStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status[0].toUpperCase() + status.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {isAdmin && (
          <Select
            value={pmValue}
            onValueChange={(v) => onChange({ ...filters, assignedProjectManagerId: v === "all" ? undefined : v })}
          >
            <SelectTrigger id="project-filter-pm" name="projectFilterProjectManager" aria-label="Filter projects by project manager" className="w-full bg-background/60 md:w-[180px]">
              <SelectValue placeholder="Project manager" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All PMs</SelectItem>
              {pms.map((pm) => (
                <SelectItem key={pm.id} value={pm.id}>
                  {pm.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2">
          <Switch
            id="blocked"
            checked={!!filters.hasBlockedWork}
            onCheckedChange={(v) => onChange({ ...filters, hasBlockedWork: v || undefined })}
          />
          <Label htmlFor="blocked" className="text-sm cursor-pointer">Has blocked work</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="attic"
            checked={!!filters.missingAtticEvidence}
            onCheckedChange={(v) => onChange({ ...filters, missingAtticEvidence: v || undefined })}
          />
          <Label htmlFor="attic" className="text-sm cursor-pointer">Missing attic evidence</Label>
        </div>
        {hasActive && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-muted-foreground hover:text-foreground"
            onClick={() => {
              onSearchChange("");
              onChange({});
            }}
          >
            Clear filters
          </Button>
        )}
      </div>
    </Card>
  );
}
