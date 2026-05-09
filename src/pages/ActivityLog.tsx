import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, FileText, Search } from "lucide-react";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { getAuditEvents, getProjects, getAllPhases, getUsers, getAllGates, getAllDeficiencies, getClients } from "@/lib/api";
import { formatAuditEvent, getAuditActionLabel, resolveProjectId } from "@/lib/audit";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AuditEvent } from "@/lib/types";

const GROUP_ORDER = ["Today", "Yesterday", "This Week", "Earlier"] as const;
type DateGroup = (typeof GROUP_ORDER)[number];

function dateGroup(iso: string): DateGroup {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 6);
  const eventDay = new Date(iso);
  eventDay.setHours(0, 0, 0, 0);
  if (eventDay.getTime() === today.getTime()) return "Today";
  if (eventDay.getTime() === yesterday.getTime()) return "Yesterday";
  if (eventDay.getTime() >= weekAgo.getTime()) return "This Week";
  return "Earlier";
}

export default function ActivityLogPage() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [pmFilter, setPmFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");

  const auditQ = useQuery({ queryKey: ["audit-events"], queryFn: getAuditEvents });
  const projectsQ = useQuery({ queryKey: ["projects", "all"], queryFn: () => getProjects() });
  const phasesQ = useQuery({ queryKey: ["phases"], queryFn: () => getAllPhases() });
  const usersQ = useQuery({ queryKey: ["users"], queryFn: getUsers });
  const gatesQ = useQuery({ queryKey: ["gates"], queryFn: getAllGates });
  const deficienciesQ = useQuery({ queryKey: ["deficiencies"], queryFn: getAllDeficiencies });
  const clientsQ = useQuery({ queryKey: ["clients"], queryFn: getClients });

  const events = useMemo(() => {
    if (!auditQ.data?.ok) return [];
    return auditQ.data.data.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [auditQ.data]);

  const projects = useMemo(() => {
    if (!projectsQ.data?.ok) return [];
    return projectsQ.data.data;
  }, [projectsQ.data]);

  const phases = useMemo(() => {
    if (!phasesQ.data?.ok) return [];
    return phasesQ.data.data;
  }, [phasesQ.data]);

  const users = useMemo(() => {
    if (!usersQ.data?.ok) return [];
    return usersQ.data.data;
  }, [usersQ.data]);

  const gates = useMemo(() => {
    if (!gatesQ.data?.ok) return [];
    return gatesQ.data.data;
  }, [gatesQ.data]);

  const deficiencies = useMemo(() => {
    if (!deficienciesQ.data?.ok) return [];
    return deficienciesQ.data.data;
  }, [deficienciesQ.data]);

  const clients = useMemo(() => {
    if (!clientsQ.data?.ok) return [];
    return clientsQ.data.data;
  }, [clientsQ.data]);

  const archivedProjectIds = useMemo(
    () => new Set(projects.filter((p) => p.status === "archived").map((p) => p.id)),
    [projects],
  );

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status !== "archived"),
    [projects],
  );

  const nonArchivedEvents = useMemo(
    () => events.filter((e) => {
      const pid = resolveProjectId(e, phases, gates, deficiencies);
      return pid === undefined || !archivedProjectIds.has(pid);
    }),
    [events, archivedProjectIds, phases, gates, deficiencies],
  );

  const allActions = useMemo(() => {
    const set = new Set<string>();
    nonArchivedEvents.forEach((e) => set.add(e.action));
    return Array.from(set).sort();
  }, [nonArchivedEvents]);

  const actionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    nonArchivedEvents.forEach((e) => { counts[e.action] = (counts[e.action] ?? 0) + 1; });
    return counts;
  }, [nonArchivedEvents]);

  const displayRows = useMemo(
    () =>
      nonArchivedEvents.map((event) => ({
        event,
        display: formatAuditEvent(event, {
          projects,
          phases,
          gates,
          deficiencies,
          users,
        }),
      })),
    [deficiencies, gates, nonArchivedEvents, phases, projects, users],
  );

  const filtered = useMemo(() => {
    let result = displayRows;
    if (actionFilter !== "all") {
      result = result.filter(({ event }) => event.action === actionFilter);
    }
    if (projectFilter !== "all") {
      result = result.filter(({ event }) => {
        const pid = resolveProjectId(event, phases, gates, deficiencies);
        return pid === undefined || pid === projectFilter;
      });
    }
    if (clientFilter !== "all") {
      const clientProjectIds = new Set(
        projects.filter((p) => p.clientId === clientFilter).map((p) => p.id),
      );
      result = result.filter(({ event }) => {
        const pid = resolveProjectId(event, phases, gates, deficiencies);
        return pid === undefined || clientProjectIds.has(pid);
      });
    }
    if (pmFilter !== "all") {
      const pmProjectIds = new Set(
        projects.filter((p) => p.assignedProjectManagerId === pmFilter).map((p) => p.id),
      );
      result = result.filter(({ event }) => {
        const pid = resolveProjectId(event, phases, gates, deficiencies);
        return pid === undefined || pmProjectIds.has(pid);
      });
    }
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(({ display }) => display.searchText.includes(q));
    }
    return result;
  }, [actionFilter, clientFilter, deficiencies, displayRows, gates, phases, pmFilter, projectFilter, projects, search]);

  const grouped = useMemo(() => {
    const groups: Partial<Record<DateGroup, typeof filtered>> = {};
    for (const e of filtered) {
      const g = dateGroup(e.event.createdAt);
      if (!groups[g]) groups[g] = [];
      groups[g]!.push(e);
    }
    return groups;
  }, [filtered]);

  const dropdownClients = useMemo(() => {
    const ids = new Set(activeProjects.map((p) => p.clientId));
    return clients.filter((c) => ids.has(c.id));
  }, [activeProjects, clients]);

  const dropdownPMs = useMemo(() => {
    const ids = new Set(
      activeProjects.filter((p) => p.assignedProjectManagerId).map((p) => p.assignedProjectManagerId!),
    );
    return users.filter((u) => ids.has(u.id));
  }, [activeProjects, users]);

  const dropdownProjects = useMemo(() => activeProjects, [activeProjects]);

  if (
    auditQ.isLoading ||
    projectsQ.isLoading ||
    phasesQ.isLoading ||
    usersQ.isLoading ||
    gatesQ.isLoading ||
    deficienciesQ.isLoading ||
    clientsQ.isLoading
  ) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader activeSection="activity" />
        <main className="container py-6 space-y-6">
          <Skeleton className="h-10 w-full max-w-sm" />
          <div className="space-y-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (auditQ.data?.ok === false) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader activeSection="activity" />
        <main className="container py-6">
          <Alert variant="destructive">
            <AlertTitle>Couldn&apos;t load activity</AlertTitle>
            <AlertDescription>{auditQ.data.error.message}</AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader activeSection="activity" />

      <main className="container py-6 space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h1 className="text-2xl font-bold">Activity Log</h1>
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Filter dropdowns */}
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="All action types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All action types</SelectItem>
              {allActions.map((a) => (
                <SelectItem key={a} value={a}>
                  {getAuditActionLabel(a)} ({actionCounts[a] ?? 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="All clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All clients</SelectItem>
              {dropdownClients.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={pmFilter} onValueChange={setPmFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="All project managers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All project managers</SelectItem>
              {dropdownPMs.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {dropdownProjects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No activity matches your filters.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {GROUP_ORDER.filter((g) => grouped[g]?.length).map((group) => (
              <div key={group}>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {group}
                </h2>
                <div className="space-y-2">
                  {grouped[group]!.map(({ event, display }) => {
                    return (
                      <Card
                        key={event.id}
                        className={`border-border bg-card p-4 shadow-card ${display.priorityBorderClass ?? ""}`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={display.colorClass}>
                              {display.actionLabel}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 ml-auto text-xs text-muted-foreground">
                            {display.actorInitials && display.actorName && (
                              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-primary/30 bg-primary/15 text-[10px] font-semibold text-primary" title={display.actorName}>
                                {display.actorInitials}
                              </div>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {display.relativeTime}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 text-sm">
                          <span className="font-medium">{display.context}</span>
                        </div>
                        {display.statusText && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            <span className="font-medium">{display.statusText}</span>
                          </div>
                        )}
                        {display.metadataText && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {display.metadataText}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground/70 text-center">
          Prototype data · Backend swap-in via lib/api adapters
        </p>
      </main>
    </div>
  );
}
