import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertOctagon, AlertTriangle, Archive, ArrowDown, ArrowUp, ArrowUpRight, Clock, Grid2X2, Image as ImageIcon, List, MoreVertical, Pencil, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconWell } from "@/components/ui/icon-well";
import { MobileActionSheet, type MobileActionItem } from "@/components/ui/mobile-action-sheet";
import { SectionHeading } from "@/components/ui/section-heading";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import {
  PHASE_LABEL,
  PHASE_ORDER,
  STATUS_LABEL,
  computePhaseHealth,
  firstPhaseWithOpenDeficiencies,
  initials,
  openDeficiencyCount,
  phaseHealthDotClass,
  projectPhases,
  relativeTime,
  type PhaseSummaryItem,
} from "@/lib/derived";
import { formatDateWithOptions } from "@/lib/schedule";
import type { ClientRecord, Deficiency, Gate, Phase, Project, User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { sortProjectRows, type ProjectRow, type ProjectSortKey, type ProjectSortState } from "./ProjectResultsSort";

export type ProjectDisplayMode = "list" | "cards";
type ProjectMobileTab = "deficiencies" | "photos" | "activity";
type ProjectOpenState = { initialMobileTab?: ProjectMobileTab; phaseId?: string; tab?: string };

interface ProjectResultsProps {
  title: string;
  projects: Project[];
  clients: ClientRecord[];
  users: User[];
  phases: Phase[];
  gates: Gate[];
  deficiencies: Deficiency[];
  loading?: boolean;
  includeClientColumn?: boolean;
  emptyState: ReactNode;
  onOpenProject?: (id: string, state?: ProjectOpenState) => void;
  onArchiveProject?: (id: string, name: string) => void;
  onEditProject?: (id: string) => void;
  displayMode?: ProjectDisplayMode;
  onDisplayModeChange?: (mode: ProjectDisplayMode) => void;
  showTitle?: boolean;
}

const sortLabels: Record<ProjectSortKey, string> = {
  project: "Project",
  client: "Client",
  status: "Status",
  openIssues: "Issues",
  updated: "Updated",
  pm: "PM",
};

const PHASE_ABBREV: Record<string, string> = {
  insulation: "INSU",
  drywall: "DRYW",
  finishing: "FINI",
};

function phaseSummary(project: Project, phases: Phase[], gates: Gate[], deficiencies: Deficiency[]): PhaseSummaryItem[] {
  const byType = projectPhases(project.id, phases);
  return PHASE_ORDER.map((type) => {
    const phase = byType[type];
    const label = PHASE_LABEL[type];
    const abbrev = PHASE_ABBREV[type];
    if (!phase) {
      return { type, abbrev, tone: "not-started", label: "Not started", reason: "Phase not yet created" };
    }
    const phaseGates = gates.filter((g) => g.phaseId === phase.id);
    const phaseDefs = deficiencies.filter((d) => d.phaseId === phase.id);
    const health = computePhaseHealth(phase, phaseGates, phaseDefs);
    return { type, abbrev, tone: health.tone, label: health.label, reason: health.reason };
  });
}

function SortButton({
  sortKey,
  sort,
  onSort,
  children,
}: {
  sortKey: ProjectSortKey;
  sort: ProjectSortState;
  onSort: (key: ProjectSortKey) => void;
  children: ReactNode;
}) {
  const active = sort.key === sortKey;
  const Icon = active && sort.direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1 rounded-sm text-left font-medium transition-colors hover:text-foreground",
        active ? "text-foreground" : "text-muted-foreground",
      )}
      aria-label={`Sort by ${sortLabels[sortKey]}`}
      onClick={() => onSort(sortKey)}
    >
      {children}
      <Icon className={cn("h-3.5 w-3.5", !active && "opacity-40")} />
    </button>
  );
}

export function ProjectResults({
  title,
  projects,
  clients,
  users,
  phases,
  gates,
  deficiencies,
  loading,
  includeClientColumn = true,
  emptyState,
  onOpenProject,
  onArchiveProject,
  onEditProject,
  displayMode: externalDisplayMode,
  onDisplayModeChange: externalOnDisplayModeChange,
  showTitle = true,
}: ProjectResultsProps) {
  const [internalDisplayMode, setInternalDisplayMode] = useState<ProjectDisplayMode>(() => {
    const saved = localStorage.getItem("projectViewMode");
    return saved === "list" || saved === "cards" ? saved : "list";
  });
  const displayMode = externalDisplayMode ?? internalDisplayMode;
  const setDisplayMode = externalOnDisplayModeChange ?? setInternalDisplayMode;
  const [sort, setSort] = useState<ProjectSortState>({ key: "updated", direction: "desc" });
  const [mobileActionProjectId, setMobileActionProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (!externalDisplayMode) {
      localStorage.setItem("projectViewMode", displayMode);
    }
  }, [displayMode, externalDisplayMode]);

  const rows = useMemo<ProjectRow[]>(
    () =>
      projects.map((project) => {
        const client = clients.find((item) => item.id === project.clientId);
        const pm = users.find((item) => item.id === project.assignedProjectManagerId);
        return {
          project,
          client,
          clientName: client?.name ?? "Unknown client",
          pm,
          pmName: pm?.fullName ?? "Unassigned",
          phaseSummary: phaseSummary(project, phases, gates, deficiencies),
          openIssues: openDeficiencyCount(project.id, deficiencies),
          targetPhaseId: firstPhaseWithOpenDeficiencies(project.id, deficiencies),
        };
      }),
    [clients, deficiencies, phases, projects, users],
  );

  const sortedRows = useMemo(() => sortProjectRows(rows, sort), [rows, sort]);
  const mobileActionRow = sortedRows.find((row) => row.project.id === mobileActionProjectId) ?? null;
  const mobileProjectActions: MobileActionItem[] = mobileActionRow
    ? [
        ...(onOpenProject
          ? [
              {
                label: "Open project",
                icon: <ArrowUpRight className="h-4 w-4" />,
                helperText: "Go to the full project detail page",
                onClick: () => onOpenProject(mobileActionRow.project.id),
              },
            ]
          : []),
        ...(mobileActionRow.project.status !== "completed" && mobileActionRow.project.status !== "archived" && onEditProject
          ? [
              {
                label: "Edit project",
                icon: <Pencil className="h-4 w-4" />,
                helperText: "Update project details",
                onClick: () => onEditProject(mobileActionRow.project.id),
              },
            ]
          : []),
        ...(onOpenProject
          ? [
              {
                label: "Deficiencies",
                icon: <AlertTriangle className="h-4 w-4" />,
                helperText: "Jump to active project issues",
                onClick: () => onOpenProject(mobileActionRow.project.id, { initialMobileTab: "deficiencies" }),
              },
              {
                label: "Photos",
                icon: <ImageIcon className="h-4 w-4" />,
                helperText: "Review project photo evidence",
                onClick: () => onOpenProject(mobileActionRow.project.id, { initialMobileTab: "photos" }),
              },
              {
                label: "Activity",
                icon: <Clock className="h-4 w-4" />,
                helperText: "Review recent project changes",
                onClick: () => onOpenProject(mobileActionRow.project.id, { initialMobileTab: "activity" }),
              },
            ]
          : []),
        ...(mobileActionRow.project.status === "completed" && onArchiveProject
          ? [
              {
                label: "Archive project",
                icon: <Archive className="h-4 w-4" />,
                helperText: "Move completed work out of active views",
                onClick: () => onArchiveProject(mobileActionRow.project.id, mobileActionRow.project.name),
              },
            ]
          : []),
      ]
    : [];

  const handleSort = (key: ProjectSortKey) => {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === "updated" || key === "openIssues" ? "desc" : "asc" },
    );
  };

  const viewToggle = !externalDisplayMode ? (
    <SegmentedControl>
      <Button
        type="button"
        variant={displayMode === "list" ? "default" : "ghost"}
        size="sm"
        className="h-9 px-3"
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
        className="h-9 px-3"
        aria-pressed={displayMode === "cards"}
        onClick={() => setDisplayMode("cards")}
      >
        <Grid2X2 className="h-4 w-4" />
        Cards
      </Button>
    </SegmentedControl>
  ) : null;

  return (
    <section className="space-y-4">
      {(showTitle || viewToggle) && (
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {showTitle && (
            <div className="flex items-baseline gap-3">
              <SectionHeading>{title}</SectionHeading>
              <span className="text-xs text-muted-foreground tabular-nums">
                {loading ? "-" : `${projects.length} shown`}
              </span>
            </div>
          )}
          {viewToggle && (
            <div className={cn("flex", showTitle ? "justify-start md:justify-end" : "justify-end")}>
              {viewToggle}
            </div>
          )}
        </div>
      )}

      {loading ? (
        displayMode === "list" ? (
          <>
            <div className="mobile-list md:hidden">
              {[0, 1, 2, 3, 4].map((item) => (
                <Skeleton key={item} className="mx-3 my-2 h-12" />
              ))}
            </div>
            <Card surface="panel" className="hidden p-3 md:block">
              {[0, 1, 2, 3, 4].map((item) => (
                <Skeleton key={item} className="mb-2 h-12 last:mb-0" />
              ))}
            </Card>
          </>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <Skeleton key={item} className="h-[260px] rounded-lg" />
            ))}
          </div>
        )
      ) : projects.length === 0 ? (
        emptyState
      ) : displayMode === "cards" ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
          {sortedRows.map((row) => (
            <ProjectCard
              key={row.project.id}
              project={row.project}
              client={row.client}
              pm={row.pm}
              phases={phases}
              gates={gates}
              deficiencies={deficiencies}
              onOpen={onOpenProject}
              onArchive={onArchiveProject}
              onEdit={onEditProject}
              onOpenActions={(id) => setMobileActionProjectId(id)}
            />
          ))}
        </div>
      ) : (
        <>
          <ul className="mobile-list md:hidden">
            {sortedRows.map((row) => (
              <li key={row.project.id}>
                <div className="flex items-start gap-2 px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => onOpenProject?.(row.project.id)}
                    className="min-w-0 flex-1 text-left active:bg-muted/40"
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">{row.project.name}</span>
                      <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {STATUS_LABEL[row.project.status]}
                      </span>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {row.clientName}
                      {row.openIssues > 0 ? ` · ${row.openIssues} open` : ""}
                      {row.pm ? ` · ${initials(row.pm.fullName)}` : ""}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span>
                        <span className="font-medium text-foreground/80">Start</span>{" "}
                        {formatDateWithOptions(row.project.scheduledStart ?? "")}
                      </span>
                      <span>
                        <span className="font-medium text-foreground/80">End</span>{" "}
                        {formatDateWithOptions(row.project.scheduledEnd ?? "")}
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    aria-label={`Open actions for ${row.project.name}`}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    onClick={() => setMobileActionProjectId(row.project.id)}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <Card surface="panel" className="hidden md:block">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[25%]">
                    <SortButton sortKey="project" sort={sort} onSort={handleSort}>
                      Project
                    </SortButton>
                  </TableHead>
                  {includeClientColumn && (
                    <TableHead className="hidden md:table-cell w-[15%]">
                      <SortButton sortKey="client" sort={sort} onSort={handleSort}>
                        Client
                      </SortButton>
                    </TableHead>
                  )}
                  <TableHead className="hidden lg:table-cell w-[15%]">
                    Address
                  </TableHead>
                  <TableHead className="w-[10%]">
                    <SortButton sortKey="status" sort={sort} onSort={handleSort}>
                      Status
                    </SortButton>
                  </TableHead>
                  <TableHead className="hidden xl:table-cell w-[15%]">
                    Phase summary
                  </TableHead>
                  <TableHead className="hidden md:table-cell w-[8%]">
                    <SortButton sortKey="openIssues" sort={sort} onSort={handleSort}>
                      Issues
                    </SortButton>
                  </TableHead>
                  <TableHead className="w-[8%]">
                    <SortButton sortKey="updated" sort={sort} onSort={handleSort}>
                      Updated
                    </SortButton>
                  </TableHead>
                  <TableHead className="hidden xl:table-cell w-[5%]">
                    <SortButton sortKey="pm" sort={sort} onSort={handleSort}>
                      PM
                    </SortButton>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRows.map((row) => (
                  <TableRow key={row.project.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="group block w-full min-w-0 text-left"
                          onClick={() => onOpenProject?.(row.project.id)}
                        >
                          <div className="truncate font-mono text-xs text-muted-foreground">{row.project.projectNumber}</div>
                          <div className="font-semibold leading-tight text-foreground group-hover:text-primary">
                            {row.project.name}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                            <span>
                              <span className="font-medium text-foreground/80">Start</span>{" "}
                              {formatDateWithOptions(row.project.scheduledStart ?? "")}
                            </span>
                            <span>
                              <span className="font-medium text-foreground/80">End</span>{" "}
                              {formatDateWithOptions(row.project.scheduledEnd ?? "")}
                            </span>
                          </div>
                        </button>
                        {row.project.status !== "completed" && row.project.status !== "archived" && onEditProject && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => onEditProject(row.project.id)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    {includeClientColumn && (
                      <TableCell className="hidden truncate text-muted-foreground md:table-cell">
                        {row.clientName}
                      </TableCell>
                    )}
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {row.project.siteAddress}
                    </TableCell>
                    <TableCell>
                      {STATUS_LABEL[row.project.status]}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <div className="flex flex-col items-start gap-1">
                        {row.phaseSummary.map((item) => (
                          <div key={item.type} className="flex items-center gap-1.5" title={`${PHASE_LABEL[item.type]}: ${item.label} (${item.reason})`}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", phaseHealthDotClass(item.tone))} />
                            <span className="text-[10px] font-medium tracking-wide text-muted-foreground">{PHASE_LABEL[item.type]}</span>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {row.openIssues > 0 && row.targetPhaseId ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-status-blocked hover:underline cursor-pointer transition-colors"
                          onClick={() => onOpenProject?.(row.project.id, { phaseId: row.targetPhaseId, tab: "deficiencies" })}
                          aria-label={`View ${row.openIssues} open deficiencies for ${row.project.name}`}
                        >
                          <AlertOctagon className="h-3.5 w-3.5" />
                          {row.openIssues} open
                        </button>
                      ) : row.openIssues > 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-status-blocked">
                          <AlertOctagon className="h-3.5 w-3.5" />
                          {row.openIssues} open
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">No issues</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {relativeTime(row.project.updatedAt)}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      {row.pm ? (
                        <IconWell tone="primary" size="sm" shape="pill" className="text-meta font-semibold" title={row.pmName}>
                          {initials(row.pm.fullName)}
                        </IconWell>
                      ) : (
                        <UserCircle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
      <MobileActionSheet
        open={!!mobileActionRow}
        onOpenChange={(open) => {
          if (!open) setMobileActionProjectId(null);
        }}
        title="Project actions"
        actions={mobileProjectActions}
        variant="project"
      />
    </section>
  );
}
