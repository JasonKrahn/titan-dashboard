import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityCard } from "@/components/dashboard/ActivityCard";
import { getAuditEvents, getAllPhases, getAllGates, getAllDeficiencies, getUsers, getProjects } from "@/lib/api";
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
  const usersQ = useQuery({ queryKey: ["users"], queryFn: getUsers });
  const projectsQ = useQuery({ queryKey: ["projects", "all"], queryFn: () => getProjects() });

  const events = useMemo(() => {
    if (!auditQ.data?.ok) return [];
    const allEvents = auditQ.data.data;
    
    // Filter events by project IDs (client's projects only)
    const filteredEvents = allEvents.filter((event) => {
      const pid = resolveProjectId(event, phasesQ.data?.ok ? phasesQ.data.data : [], gatesQ.data?.ok ? gatesQ.data.data : [], defsQ.data?.ok ? defsQ.data.data : []);
      return pid && projectIds.includes(pid);
    });
    
    // Sort by date descending and limit to 15
    return filteredEvents
      .slice()
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, TRAY_EVENT_LIMIT);
  }, [auditQ.data, projectIds, phasesQ.data, gatesQ.data, defsQ.data]);

  const displayRows = useMemo(() => {
    const phases = phasesQ.data?.ok ? phasesQ.data.data : [];
    const gates = gatesQ.data?.ok ? gatesQ.data.data : [];
    const defs = defsQ.data?.ok ? defsQ.data.data : [];
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
        photoEvidence: [],
      }),
    }));
  }, [events, phasesQ.data, gatesQ.data, defsQ.data, usersQ.data, projectsQ.data]);

  const grouped = useMemo(() => {
    const groups: Partial<Record<DateGroup, typeof displayRows>> = {};
    for (const row of displayRows) {
      const g = dateGroup(row.event.createdAt);
      if (!groups[g]) groups[g] = [];
      groups[g]!.push(row);
    }
    return groups;
  }, [displayRows]);

  if (auditQ.isLoading || phasesQ.isLoading || gatesQ.isLoading || defsQ.isLoading || usersQ.isLoading || projectsQ.isLoading) {
    return (
      <div className="space-y-3">
        <SectionHeading>Recent Activity</SectionHeading>
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="space-y-3">
        <SectionHeading>Recent Activity</SectionHeading>
        <Card surface="panel" className="p-4 text-center text-sm text-muted-foreground">
          No recent activity for this client
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SectionHeading>Recent Activity</SectionHeading>
      <div className="space-y-4">
        {GROUP_ORDER.filter((g) => grouped[g]?.length).map((group) => (
          <div key={group}>
            <div className="mb-2 text-xs font-medium text-muted-foreground">{group}</div>
            <div className="space-y-2">
              {grouped[group]!.map(({ event, display }) => (
                <ActivityCard key={event.id} event={event} display={display} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
