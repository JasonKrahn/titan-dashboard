import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Clock, FileText, Image as ImageIcon, Search } from "lucide-react";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { PhotoViewerDialog, type PhotoViewerItem } from "@/components/dashboard/PhotoViewerDialog";
import { Card } from "@/components/ui/card";
import { IconWell } from "@/components/ui/icon-well";
import { Input } from "@/components/ui/input";
import { SectionHeading } from "@/components/ui/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ActionBadge } from "@/components/ui/action-badge";
import { getAuditEvents, getProjects, getAllPhases, getUsers, getAllGates, getAllDeficiencies, getClients, getAllPhotos, getPhotoViewUrl } from "@/lib/api";
import { formatAuditEvent, getAuditActionLabel, resolveProjectId } from "@/lib/audit";
import { GATE_LABEL, PHASE_LABEL } from "@/lib/derived";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AuditEvent, Deficiency, Gate, Phase, PhotoEvidence } from "@/lib/types";

const GROUP_ORDER = ["Today", "Yesterday", "This Week", "Earlier"] as const;
type DateGroup = (typeof GROUP_ORDER)[number];
const ACTIVITY_THUMBNAIL_LIMIT = 4;

const PURPOSE_LABEL: Record<PhotoEvidence["purpose"], string> = {
  attic_check: "Attic Check",
  deficiency_after: "After",
  deficiency_before: "Before",
  general: "General",
  inspection: "Inspection",
  site_check: "Site Check",
};

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

function sortPhotosNewestFirst(items: PhotoEvidence[]) {
  return items.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

function uniquePhotos(items: PhotoEvidence[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function relatedPhotosForEvent(
  event: AuditEvent,
  photos: PhotoEvidence[],
) {
  switch (event.entityType) {
    case "photo_evidence":
      return photos.filter((photo) => photo.id === event.entityId);
    case "deficiency":
      return photos.filter((photo) => photo.deficiencyId === event.entityId);
    case "gate":
      return photos.filter((photo) => photo.gateId === event.entityId);
    default:
      return [];
  }
}

function photoCaption(
  photo: PhotoEvidence,
  phases: Phase[],
  gates: Gate[],
  deficiencies: Deficiency[],
) {
  const phase = photo.phaseId ? phases.find((item) => item.id === photo.phaseId) : undefined;
  const gate = photo.gateId ? gates.find((item) => item.id === photo.gateId) : undefined;
  const deficiency = photo.deficiencyId ? deficiencies.find((item) => item.id === photo.deficiencyId) : undefined;
  const purposeLabel = PURPOSE_LABEL[photo.purpose] ?? photo.purpose;

  if (deficiency && phase) {
    return `Deficiency: ${deficiency.title}, ${purposeLabel}`;
  }
  if (gate && phase) {
    return `${GATE_LABEL[gate.type] ?? gate.type} · ${PHASE_LABEL[phase.type] ?? phase.type}, ${purposeLabel}`;
  }
  if (gate) {
    return `${GATE_LABEL[gate.type] ?? gate.type}, ${purposeLabel}`;
  }
  if (phase) {
    return `${PHASE_LABEL[phase.type] ?? phase.type}, ${purposeLabel}`;
  }
  return purposeLabel;
}

function buildRelatedPhotoItems(
  event: AuditEvent,
  photos: PhotoEvidence[],
  phases: Phase[],
  gates: Gate[],
  deficiencies: Deficiency[],
): PhotoViewerItem[] {
  return sortPhotosNewestFirst(uniquePhotos(relatedPhotosForEvent(event, photos))).map((photo) => ({
    photo,
    caption: photoCaption(photo, phases, gates, deficiencies),
  }));
}

function ActivityPhotoThumbnail({
  item,
  onOpen,
}: {
  item: PhotoViewerItem;
  onOpen: () => void;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setImageUrl(null);
    getPhotoViewUrl(item.photo.id).then((res) => {
      if (!cancelled && res.ok && res.data.url) {
        setImageUrl(res.data.url);
      }
    });
    return () => { cancelled = true; };
  }, [item.photo.id]);

  return (
    <button
      type="button"
      aria-label={`Open related photo: ${item.caption}`}
      onClick={onOpen}
      className="group relative h-14 w-14 overflow-hidden rounded-md border border-border bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={item.caption}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-muted-foreground">
          <ImageIcon className="h-5 w-5" />
        </span>
      )}
    </button>
  );
}

function ActivityPhotoStrip({
  items,
  context,
  onOpen,
}: {
  items: PhotoViewerItem[];
  context: string;
  onOpen: (photoId: string) => void;
}) {
  if (items.length === 0) return null;

  const visibleItems = items.slice(0, ACTIVITY_THUMBNAIL_LIMIT);
  const remainingCount = items.length - visibleItems.length;

  return (
    <div className="mt-3 border-t border-border/60 pt-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        {items.length} related {items.length === 1 ? "photo" : "photos"}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {visibleItems.map((item) => (
          <ActivityPhotoThumbnail
            key={item.photo.id}
            item={item}
            onOpen={() => onOpen(item.photo.id)}
          />
        ))}
        {remainingCount > 0 && (
          <button
            type="button"
            aria-label={`Open ${remainingCount} more related photos for ${context}`}
            onClick={() => onOpen(items[ACTIVITY_THUMBNAIL_LIMIT]?.photo.id ?? items[0].photo.id)}
            className="flex h-14 w-14 items-center justify-center rounded-md border border-dashed border-border bg-muted/30 text-xs font-semibold text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:bg-muted/60"
          >
            +{remainingCount}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ActivityLogPage() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [pmFilter, setPmFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [photoViewerItems, setPhotoViewerItems] = useState<PhotoViewerItem[]>([]);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);

  const auditQ = useQuery({ queryKey: ["audit-events"], queryFn: getAuditEvents });
  const projectsQ = useQuery({ queryKey: ["projects", "all"], queryFn: () => getProjects() });
  const phasesQ = useQuery({ queryKey: ["phases"], queryFn: () => getAllPhases() });
  const usersQ = useQuery({ queryKey: ["users"], queryFn: getUsers });
  const gatesQ = useQuery({ queryKey: ["gates"], queryFn: getAllGates });
  const deficienciesQ = useQuery({ queryKey: ["deficiencies"], queryFn: getAllDeficiencies });
  const photosQ = useQuery({ queryKey: ["photos"], queryFn: getAllPhotos });
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

  const photos = useMemo(() => {
    if (!photosQ.data?.ok) return [];
    return photosQ.data.data;
  }, [photosQ.data]);

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
          photoEvidence: photos,
        }),
        photoItems: buildRelatedPhotoItems(event, photos, phases, gates, deficiencies),
      })),
    [deficiencies, gates, nonArchivedEvents, phases, photos, projects, users],
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
      result = result.filter(({ display, photoItems }) => {
        const photoSearchText = photoItems.map((item) => item.caption).join(" ").toLowerCase();
        return display.searchText.includes(q) || photoSearchText.includes(q);
      });
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

  function openPhotoViewer(items: PhotoViewerItem[], photoId: string) {
    setPhotoViewerItems(items);
    setSelectedPhotoId(photoId);
  }

  if (
    auditQ.isLoading ||
    projectsQ.isLoading ||
    phasesQ.isLoading ||
    usersQ.isLoading ||
    gatesQ.isLoading ||
    deficienciesQ.isLoading ||
    photosQ.isLoading ||
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
        <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
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
            <IconWell tone="muted" size="xl" shape="panel" className="mx-auto mb-3 border-transparent">
              <FileText className="h-8 w-8 opacity-50" />
            </IconWell>
            <p className="text-sm">No activity matches your filters.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {GROUP_ORDER.filter((g) => grouped[g]?.length).map((group) => (
              <div key={group}>
                <SectionHeading as="h2" className="mb-3">
                  {group}
                </SectionHeading>
                <div className="space-y-2">
                  {grouped[group]!.map(({ event, display, photoItems }) => {
                    const mainContent = (
                      <div>
                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                          <div className="flex items-center gap-2">
                            <ActionBadge action={event.action} size="sm" />
                          </div>
                          <div className="flex items-center gap-3 ml-auto text-xs text-muted-foreground">
                            {display.actorInitials && display.actorName && (
                              <IconWell tone="primary" size="sm" shape="pill" className="text-eyebrow font-semibold" title={display.actorName}>
                                {display.actorInitials}
                              </IconWell>
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
                      </div>
                    );

                    return (
                      <Card
                        key={event.id}
                        surface="default"
                        className={`p-4 shadow-card ${display.priorityBorderClass ?? ""} ${display.linkUrl ? "hover:shadow-lg hover:border-primary/50 transition-shadow" : ""}`}
                      >
                        {display.linkUrl ? (
                          <Link
                            to={display.linkUrl}
                            className="block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {mainContent}
                          </Link>
                        ) : (
                          mainContent
                        )}
                        <ActivityPhotoStrip
                          items={photoItems}
                          context={display.context}
                          onOpen={(photoId) => openPhotoViewer(photoItems, photoId)}
                        />
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
      <PhotoViewerDialog
        open={photoViewerItems.length > 0 && selectedPhotoId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPhotoId(null);
            setPhotoViewerItems([]);
          }
        }}
        items={photoViewerItems}
        initialPhotoId={selectedPhotoId}
      />
    </div>
  );
}
