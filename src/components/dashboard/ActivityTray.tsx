import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { IconWell } from "@/components/ui/icon-well";
import { ActionBadge } from "@/components/ui/action-badge";
import { getAuditEvents, getAllPhases, getAllGates, getAllDeficiencies, getUsers, getProjects, getAllPhotos } from "@/lib/api";
import { formatAuditEvent, resolveProjectId } from "@/lib/audit";
import type { AuditEvent, Deficiency, Gate, Phase } from "@/lib/types";

const GROUP_ORDER = ["Today", "Yesterday", "This Week", "Earlier"] as const;
type DateGroup = (typeof GROUP_ORDER)[number];
const TRAY_EVENT_LIMIT = 15;

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

interface ActivityTrayProps {
  projectIds: string[];
  clientId?: string;
}

export function ActivityTray({ projectIds, clientId }: ActivityTrayProps) {
  const auditQ = useQuery({ queryKey: ["audit-events"], queryFn: getAuditEvents });
  const phasesQ = useQuery({ queryKey: ["phases"], queryFn: getAllPhases });
  const gatesQ = useQuery({ queryKey: ["gates"], queryFn: getAllGates });
  const defsQ = useQuery({ queryKey: ["deficiencies"], queryFn: getAllDeficiencies });
  const photosQ = useQuery({ queryKey: ["photos"], queryFn: getAllPhotos });
  const usersQ = useQuery({ queryKey: ["users"], queryFn: getUsers });
  const projectsQ = useQuery({ queryKey: ["projects", "all"], queryFn: () => getProjects() });

  const events = useMemo(() => {
    if (!auditQ.data?.ok) return [];
    const allEvents = auditQ.data.data;
    const phases = phasesQ.data?.ok ? phasesQ.data.data : [];
    const gates = gatesQ.data?.ok ? gatesQ.data.data : [];
    const defs = defsQ.data?.ok ? defsQ.data.data : [];
    const photos = photosQ.data?.ok ? photosQ.data.data : [];
    
    // Filter events by project IDs (client's projects only)
    const filteredEvents = allEvents.filter((event) => {
      const pid = resolveProjectId(event, phases, gates, defs, photos);
      return pid && projectIds.includes(pid);
    });
    
    // Sort by date descending and limit to 15
    return filteredEvents
      .slice()
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, TRAY_EVENT_LIMIT);
  }, [auditQ.data, projectIds, phasesQ.data, gatesQ.data, defsQ.data, photosQ.data]);

  const displayRows = useMemo(() => {
    const phases = phasesQ.data?.ok ? phasesQ.data.data : [];
    const gates = gatesQ.data?.ok ? gatesQ.data.data : [];
    const defs = defsQ.data?.ok ? defsQ.data.data : [];
    const photos = photosQ.data?.ok ? photosQ.data.data : [];
    const users = usersQ.data?.ok ? usersQ.data.data : [];
    const projects = projectsQ.data?.ok ? projectsQ.data.data : [];

    return events.map((event) => ({
      event,
      display: formatAuditEvent(event, {
        projects,
        phases,
        gates,
        deficiencies: defs,
        users,
        photoEvidence: photos,
      }),
    }));
  }, [events, phasesQ.data, gatesQ.data, defsQ.data, photosQ.data, usersQ.data, projectsQ.data]);

  const grouped = useMemo(() => {
    const groups: Partial<Record<DateGroup, typeof displayRows>> = {};
    for (const row of displayRows) {
      const g = dateGroup(row.event.createdAt);
      if (!groups[g]) groups[g] = [];
      groups[g]!.push(row);
    }
    return groups;
  }, [displayRows]);

  if (auditQ.isLoading || phasesQ.isLoading || gatesQ.isLoading || defsQ.isLoading || photosQ.isLoading || usersQ.isLoading || projectsQ.isLoading) {
    return (
      <Card surface="panel" className="overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <SectionHeading>Recent Activity</SectionHeading>
        </div>
        <div className="space-y-2 p-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card surface="panel" className="overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <SectionHeading>Recent Activity</SectionHeading>
        </div>
        <div className="p-4 text-center text-sm text-muted-foreground">
          No recent activity for this client
        </div>
      </Card>
    );
  }

  return (
    <Card surface="panel" className="overflow-hidden">
      <div className="flex items-baseline justify-between gap-3 border-b border-border px-4 py-3">
        <SectionHeading>Recent Activity</SectionHeading>
        <span className="text-xs text-muted-foreground tabular-nums">{events.length} latest</span>
      </div>
      <div className="scrollbar-hide max-h-[calc(100vh-14rem)] space-y-4 overflow-y-auto px-3 py-3">
        {GROUP_ORDER.filter((g) => grouped[g]?.length).map((group) => (
          <div key={group}>
            <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{group}</div>
            <div className="space-y-1.5">
              {grouped[group]!.map(({ event, display }) => (
                <CompactActivityRow key={event.id} event={event} display={display} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CompactActivityRow({
  event,
  display,
}: {
  event: AuditEvent;
  display: ReturnType<typeof formatAuditEvent>;
}) {
  const priorityClass =
    display.priority === "danger"
      ? "border-l-status-blocked"
      : display.priority === "warning"
        ? "border-l-status-attention"
        : "border-l-transparent";

  const content = (
    <article
      aria-label={`${display.actionLabel}: ${display.context}`}
      className={`rounded-md border border-border bg-card/55 px-3 py-2.5 shadow-sm transition-colors ${priorityClass} border-l-2 hover:border-border-emphasis hover:bg-card/80`}
    >
      <div className="flex items-center gap-2">
        <ActionBadge action={event.action} size="xs" className="min-w-0 max-w-[190px]" />
        <div className="ml-auto flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
          {display.actorInitials && display.actorName && (
            <IconWell tone="primary" size="sm" shape="pill" className="h-6 min-w-6 px-1.5 text-[10px] font-semibold" title={display.actorName}>
              {display.actorInitials}
            </IconWell>
          )}
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Clock className="h-3 w-3" />
            {display.relativeTime}
          </span>
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-medium leading-5 text-foreground">{display.context}</p>
      {display.statusText && (
        <p className="mt-1 truncate text-xs font-medium text-muted-foreground">{display.statusText}</p>
      )}
      {display.metadataText && (
        <p className="mt-1 line-clamp-2 text-xs leading-4 text-muted-foreground">{display.metadataText}</p>
      )}
    </article>
  );

  if (!display.linkUrl) return content;

  return (
    <Link to={display.linkUrl} className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {content}
    </Link>
  );
}
