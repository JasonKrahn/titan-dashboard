import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { KpiStrip, type KpiData, type KpiKey } from "@/components/command/KpiStrip";
import { AttentionQueue } from "@/components/command/AttentionQueue";
import { PhaseFlowHeatmap } from "@/components/command/PhaseFlowHeatmap";
import { BottleneckInsights } from "@/components/command/BottleneckInsights";
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
import { buildAttentionQueue, type QueueCategory } from "@/lib/command/attentionQueue";
import { buildBottleneckInsights, buildHeatmap } from "@/lib/command/heatmap";

const KPI_TO_FILTER: Record<KpiKey, QueueCategory | "all"> = {
  active: "all",
  blocked: "critical",
  failed: "critical",
  ready: "ready",
  attic: "warning",
};

export default function AdminCommandCenter() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<QueueCategory | "all">("all");
  const [activeKpi, setActiveKpi] = useState<KpiKey | null>(null);

  const meQ = useQuery({ queryKey: ["me"], queryFn: getCurrentUser });
  const usersQ = useQuery({ queryKey: ["users"], queryFn: getUsers });
  const clientsQ = useQuery({ queryKey: ["clients"], queryFn: getClients });
  const projectsQ = useQuery({ queryKey: ["projects", "all-cmd"], queryFn: () => getProjects() });
  const phasesQ = useQuery({ queryKey: ["phases"], queryFn: getAllPhases });
  const gatesQ = useQuery({ queryKey: ["gates"], queryFn: getAllGates });
  const defsQ = useQuery({ queryKey: ["deficiencies"], queryFn: getAllDeficiencies });
  const photosQ = useQuery({ queryKey: ["photos"], queryFn: getAllPhotos });

  const me = meQ.data?.ok ? meQ.data.data : undefined;
  const users = usersQ.data?.ok ? usersQ.data.data : [];
  const clients = clientsQ.data?.ok ? clientsQ.data.data : [];
  const projects = projectsQ.data?.ok ? projectsQ.data.data : [];
  const phases = phasesQ.data?.ok ? phasesQ.data.data : [];
  const gates = gatesQ.data?.ok ? gatesQ.data.data : [];
  const deficiencies = defsQ.data?.ok ? defsQ.data.data : [];
  const photos = photosQ.data?.ok ? photosQ.data.data : [];

  const queue = useMemo(
    () => buildAttentionQueue({ projects, phases, gates, deficiencies, photos, users, clients }),
    [projects, phases, gates, deficiencies, photos, users, clients],
  );

  const matrix = useMemo(() => buildHeatmap(projects, phases), [projects, phases]);
  const insights = useMemo(() => buildBottleneckInsights(matrix, projects), [matrix, projects]);

  const kpis: KpiData[] = useMemo(() => {
    const active = projects.filter((p) => p.status === "active").length;
    const blocked =
      phases.filter((p) => p.status === "blocked").length +
      gates.filter((g) => g.status === "blocked").length;
    const failed = gates.filter((g) => g.type === "inspection" && g.status === "failed").length;
    const ready = phases.filter((p) => p.status === "ready_for_inspection").length;
    const atticMissing = projects.filter((p) => {
      if (p.status === "draft" || p.status === "archived") return false;
      if (p.atticCheckStatus === "passed") return false;
      return !photos.some(
        (ph) => ph.projectId === p.id && ph.purpose === "attic_check" && ph.status === "confirmed",
      );
    }).length;

    return [
      { key: "active", label: "Active projects", count: active, tone: "info" },
      { key: "blocked", label: "Blocked work", count: blocked, tone: blocked ? "danger" : "neutral" },
      { key: "failed", label: "Failed inspections", count: failed, tone: failed ? "danger" : "neutral" },
      { key: "ready", label: "Ready inspections", count: ready, tone: ready ? "ready" : "neutral" },
      { key: "attic", label: "Missing attic", count: atticMissing, tone: atticMissing ? "warning" : "neutral" },
    ];
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

  const handleFilter = (f: QueueCategory | "all") => {
    setFilter(f);
    setActiveKpi(null);
  };

  const isAdmin = me?.role === "admin";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Command Center</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Org-wide operational risk. Triage what needs admin attention right now.
            </p>
          </div>
        </div>

        {!isAdmin ? (
          <div className="rounded-md border border-border bg-surface-panel p-10 text-center shadow-card">
            <ShieldAlert className="mx-auto h-8 w-8 text-status-attention" aria-hidden />
            <h2 className="mt-3 text-lg font-semibold">Admin only</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Switch to an admin user from the role switcher to view the Command Center.
            </p>
          </div>
        ) : (
          <>
            <KpiStrip items={kpis} active={activeKpi} onSelect={handleKpi} />

            <div className="grid gap-4 lg:grid-cols-12">
              <div className="lg:col-span-7 xl:col-span-8">
                <AttentionQueue
                  items={queue}
                  filter={filter}
                  onFilterChange={handleFilter}
                  onOpenProject={(id) => navigate(`/project/${id}`)}
                />
              </div>
              <div className="space-y-4 lg:col-span-5 xl:col-span-4">
                <PhaseFlowHeatmap matrix={matrix} />
                <BottleneckInsights insights={insights} />
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
