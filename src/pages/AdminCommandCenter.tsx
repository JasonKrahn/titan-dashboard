import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { KpiStrip, type KpiData, type KpiKey } from "@/components/command/KpiStrip";
import { AttentionQueue } from "@/components/command/AttentionQueue";
import { PhaseFlowHeatmap } from "@/components/command/PhaseFlowHeatmap";
import { BottleneckInsights } from "@/components/command/BottleneckInsights";
import { ExecutiveBrief } from "@/components/command/ExecutiveBrief";
import {
  getAllDeficiencies,
  getAllGates,
  getAllPhases,
  getAllPhotos,
  getClients,
  getCurrentUser,
  getProjects,
  getUsers,
} from "@/lib/api";
import { buildAttentionQueue, type QueueFilter, type QueueFilters, type QueueItem } from "@/lib/command/attentionQueue";
import { buildBottleneckInsights, buildHeatmap, type BottleneckInsight } from "@/lib/command/heatmap";
import { KPI_TO_FILTER, buildCommandKpis } from "@/lib/command/kpis";
import { buildExecutiveSummary } from "@/lib/command/executiveSummary";

export default function AdminCommandCenter() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<QueueFilter>("all");
  const [activeKpi, setActiveKpi] = useState<KpiKey | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [advancedFilters, setAdvancedFilters] = useState<QueueFilters>({});

  const meQ = useQuery({ queryKey: ["me"], queryFn: getCurrentUser });
  const usersQ = useQuery({ queryKey: ["users"], queryFn: getUsers });
  const clientsQ = useQuery({ queryKey: ["clients"], queryFn: getClients });
  const projectsQ = useQuery({ queryKey: ["projects", "all-cmd"], queryFn: () => getProjects() });
  const phasesQ = useQuery({ queryKey: ["phases"], queryFn: getAllPhases });
  const gatesQ = useQuery({ queryKey: ["gates"], queryFn: getAllGates });
  const defsQ = useQuery({ queryKey: ["deficiencies"], queryFn: getAllDeficiencies });
  const photosQ = useQuery({ queryKey: ["photos"], queryFn: getAllPhotos });

  const me = meQ.data?.ok ? meQ.data.data : undefined;
  const users = useMemo(() => (usersQ.data?.ok ? usersQ.data.data : []), [usersQ.data]);
  const clients = useMemo(() => (clientsQ.data?.ok ? clientsQ.data.data : []), [clientsQ.data]);
  const projects = useMemo(() => (projectsQ.data?.ok ? projectsQ.data.data : []), [projectsQ.data]);
  const phases = useMemo(() => (phasesQ.data?.ok ? phasesQ.data.data : []), [phasesQ.data]);
  const gates = useMemo(() => (gatesQ.data?.ok ? gatesQ.data.data : []), [gatesQ.data]);
  const deficiencies = useMemo(() => (defsQ.data?.ok ? defsQ.data.data : []), [defsQ.data]);
  const photos = useMemo(() => (photosQ.data?.ok ? photosQ.data.data : []), [photosQ.data]);

  const queue = useMemo(
    () => buildAttentionQueue({ projects, phases, gates, deficiencies, photos, users, clients }),
    [projects, phases, gates, deficiencies, photos, users, clients],
  );

  // Update queue items when data changes
  useEffect(() => {
    setQueueItems(queue);
  }, [queue]);

  const matrix = useMemo(() => buildHeatmap(projects, phases), [projects, phases]);
  const insights = useMemo(() => buildBottleneckInsights(matrix, projects), [matrix, projects]);
  const executiveSummary = useMemo(() => buildExecutiveSummary(projects, queueItems), [projects, queueItems]);

  const kpis: KpiData[] = useMemo(() => {
    return buildCommandKpis({ projects, phases, gates, photos }).filter((kpi) => kpi.key !== "active");
  }, [projects, phases, gates, photos]);

  const activeKpiData = useMemo(() => {
    return buildCommandKpis({ projects, phases, gates, photos }).find((kpi) => kpi.key === "active");
  }, [projects, phases, gates, photos]);

  const handleKpi = (key: KpiKey) => {
    if (activeKpi === key) {
      setActiveKpi(null);
      setFilter("all");
      return;
    }
    setActiveKpi(key);
    setFilter(KPI_TO_FILTER[key]);
  };

  const handleFilter = (f: QueueFilter) => {
    setFilter(f);
    setActiveKpi(null);
  };

  const handleExecutiveMetric = (f?: QueueFilter) => {
    if (!f) return;
    setFilter(f);
    setActiveKpi(null);
  };

  const handleFiltersChange = (filters: QueueFilters) => {
    setAdvancedFilters(filters);
  };

  const handleBottleneckClick = (insight: BottleneckInsight) => {
    // Map bottleneck to queue filter
    if (insight.id.includes("blocked")) {
      setFilter("critical_blocker");
    } else if (insight.id.includes("ready")) {
      setFilter("aging_ready_inspection");
    } else if (insight.id === "archive") {
      setFilter("completed");
    }
    setActiveKpi(null);
  };

  const clientNames = useMemo(() => clients.map(c => c.name), [clients]);
  const userNames = useMemo(() => users.map(u => u.fullName), [users]);

  const isAdmin = me?.role === "admin";

  // Simple polling for real-time updates
  useEffect(() => {
    const startPolling = () => {
      intervalRef.current = setInterval(() => {
        queryClient.refetchQueries();
        setLastUpdated(new Date());
      }, 30000); // 30 seconds
    };

    startPolling();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [queryClient]);

  const formatLastUpdated = () => {
    const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold sm:text-3xl">Command Center</h1>
              {activeKpiData && (
                <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                  {activeKpiData.count} active
                </span>
              )}
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                Updated {formatLastUpdated()}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Org-wide operational risk. Triage what needs admin attention right now.
            </p>
          </div>
        </div>

        {!isAdmin ? (
          <div className="rounded-md border border-border bg-surface-panel p-10 text-center">
            <ShieldAlert className="mx-auto h-8 w-8 text-status-attention" aria-hidden />
            <h2 className="mt-3 text-lg font-semibold">Admin only</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Switch to an admin user from the role switcher to view the Command Center.
            </p>
          </div>
        ) : (
          <>
            <ExecutiveBrief
              summary={executiveSummary}
              onMetricSelect={handleExecutiveMetric}
              onOpenProject={(id) => navigate(`/project/${id}`)}
            />

            <section className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-widest">Exception Filters</h2>
                  <p className="text-xs text-muted-foreground">
                    Drill into the operating signals behind the executive brief.
                  </p>
                </div>
              </div>
              <KpiStrip items={kpis} active={activeKpi} onSelect={handleKpi} />
            </section>

            <div className="grid gap-4 lg:grid-cols-12">
              <div className="lg:col-span-7 xl:col-span-8">
                <AttentionQueue
                  items={queueItems}
                  filter={filter}
                  filters={advancedFilters}
                  onFilterChange={handleFilter}
                  onFiltersChange={handleFiltersChange}
                  clients={clientNames}
                  users={userNames}
                  onOpenProject={(id) => navigate(`/project/${id}`)}
                />
              </div>
              <div className="space-y-4 lg:col-span-5 xl:col-span-4">
                <BottleneckInsights insights={insights} onInsightClick={handleBottleneckClick} />
                <PhaseFlowHeatmap matrix={matrix} />
              </div>
            </div>
          </>
        )}

        <p className="pt-2 text-center text-[11px] text-muted-foreground/70">
          Prototype data · Backend swap-in via lib/api adapters
        </p>
      </main>
    </div>
  );
}
