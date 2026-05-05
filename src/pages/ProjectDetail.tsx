import { useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  MapPin,
  User,
  Camera,
  AlertTriangle,
  Calendar,
  Clock,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { PhaseHealthPill } from "@/components/dashboard/PhaseHealthPill";
import { getProject } from "@/lib/api";
import {
  PHASE_LABEL,
  PHASE_ORDER,
  STATUS_LABEL,
  computePhaseHealth,
  gateStatusTone,
  initials,
  phaseHealthClasses,
  projectStatusTone,
  relativeTime,
} from "@/lib/derived";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const projectQ = useQuery({
    queryKey: ["project", id],
    queryFn: () => getProject(id!),
    enabled: !!id,
  });

  const detail = projectQ.data?.ok ? projectQ.data.data : undefined;
  const error = projectQ.data?.ok === false ? projectQ.data.error : undefined;

  const activeDefs = useMemo(
    () => detail?.deficiencies.filter((d) => d.status === "open" || d.status === "in_progress") ?? [],
    [detail],
  );
  const atticGate = useMemo(() => detail?.gates.find((g) => g.type === "attic_check"), [detail]);
  const hasAtticPhoto = useMemo(
    () => detail?.photoEvidence.some((p) => p.purpose === "attic_check" && p.status === "confirmed") ?? false,
    [detail],
  );

  if (projectQ.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border">
          <div className="container flex h-16 items-center">
            <Skeleton className="h-9 w-20" />
          </div>
        </header>
        <main className="container space-y-6 py-6">
          <Skeleton className="h-24" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-44" />
            <Skeleton className="h-44" />
            <Skeleton className="h-44" />
          </div>
          <Skeleton className="h-48" />
        </main>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border">
          <div className="container flex h-16 items-center">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
          </div>
        </header>
        <main className="container py-6">
          <Alert variant={error ? "destructive" : "default"}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{error ? "Couldn't load project" : "Project not found"}</AlertTitle>
            <AlertDescription>{error?.message ?? "This project doesn't exist or you don't have access."}</AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  const p = detail.project;
  const formatDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—");

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="container flex h-16 items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-3 text-sm">
            <span className="font-mono text-xs text-muted-foreground">{p.projectNumber}</span>
            <StatusBadge tone={projectStatusTone(p.status)} label={STATUS_LABEL[p.status]} size="sm" />
          </div>
        </div>
      </header>

      <main className="container space-y-8 py-6">
        {/* Hero / project header */}
        <section className="rounded-xl border border-border bg-gradient-surface p-6 shadow-card">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold sm:text-3xl">{p.name}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  {detail.client.name}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {p.siteAddress}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {formatDate(p.scheduledStart)} → {formatDate(p.scheduledEnd)}
                </span>
              </div>

              {detail.assignedProjectManager && (
                <div className="mt-4 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 bg-primary/15 text-xs font-semibold text-primary">
                    {initials(detail.assignedProjectManager.fullName)}
                  </div>
                  <div className="text-sm">
                    <div className="font-medium">{detail.assignedProjectManager.fullName}</div>
                    <div className="text-xs text-muted-foreground">Project manager</div>
                  </div>
                </div>
              )}
            </div>

            {/* KPI chips */}
            <div className="flex flex-wrap gap-3 lg:flex-col lg:items-end">
              <KpiChip
                label="Open issues"
                value={String(activeDefs.length)}
                tone={activeDefs.length > 0 ? "blocked" : "closed"}
                icon={<AlertTriangle className="h-4 w-4" />}
              />
              <KpiChip
                label="Attic gate"
                value={atticGate ? STATUS_LABEL[atticGate.status] : "—"}
                tone={atticGate ? gateStatusTone(atticGate.status) : "not-started"}
                icon={<Camera className="h-4 w-4" />}
              />
              <KpiChip
                label="Last update"
                value={relativeTime(p.updatedAt)}
                tone="not-started"
                icon={<Clock className="h-4 w-4" />}
              />
            </div>
          </div>
        </section>

        {/* Phases */}
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Phases</h2>
            <span className="text-xs text-muted-foreground">Click a phase for details</span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {PHASE_ORDER.map((type) => {
              const phase = detail.phases.find((ph) => ph.type === type);
              const phaseGates = phase ? detail.gates.filter((g) => g.phaseId === phase.id) : [];
              const phaseDefs = phase ? detail.deficiencies.filter((d) => d.phaseId === phase.id) : [];
              const health = computePhaseHealth(phase, phaseGates, phaseDefs);
              const c = phaseHealthClasses(health.tone);
              const openCount = phaseDefs.filter((d) => d.status === "open" || d.status === "in_progress").length;

              const cardInner = (
                <Card
                  className={`group relative h-full overflow-hidden border-border bg-gradient-surface p-5 shadow-card transition-all ${
                    phase ? "cursor-pointer hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-glow" : "opacity-70"
                  }`}
                >
                  {/* tone accent strip */}
                  <div className={`absolute inset-x-0 top-0 h-1 ${c.dot}`} />

                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {PHASE_LABEL[type]}
                      </div>
                      <div className="mt-1 text-base font-semibold">
                        {phase ? STATUS_LABEL[phase.status] : "Not configured"}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>

                  <div className="mt-4">
                    <PhaseHealthPill health={health} size="lg" />
                    <p className="mt-2 text-xs text-muted-foreground">{health.reason}</p>
                  </div>

                  <div className="mt-4 flex items-center gap-4 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Camera className="h-3.5 w-3.5" />
                      {phaseGates.length} gates
                    </span>
                    <span className={`inline-flex items-center gap-1 ${openCount > 0 ? "text-status-blocked" : ""}`}>
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {openCount} open
                    </span>
                    <span className="ml-auto inline-flex items-center gap-1 text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      Details <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Card>
              );

              return phase ? (
                <Link key={type} to={`/project/${p.id}/phase/${phase.id}`} className="block">
                  {cardInner}
                </Link>
              ) : (
                <div key={type}>{cardInner}</div>
              );
            })}
          </div>
        </section>

        {/* Two-column: Attic & Deficiencies */}
        <section className="grid gap-6 md:grid-cols-2">
          <Card className="border-border bg-card p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Attic Gate</h3>
              {atticGate && <StatusBadge tone={gateStatusTone(atticGate.status)} label={STATUS_LABEL[atticGate.status]} size="sm" />}
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Camera className={`h-4 w-4 ${hasAtticPhoto ? "text-status-closed" : "text-status-ready"}`} />
                <span>
                  {hasAtticPhoto ? "Photo evidence confirmed" : "Photo evidence not yet uploaded"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-md border border-border bg-muted/30 p-2.5">
                  <div className="text-muted-foreground">Call-in date</div>
                  <div className="mt-0.5 font-medium">—</div>
                </div>
                <div className="rounded-md border border-border bg-muted/30 p-2.5">
                  <div className="text-muted-foreground">Install date</div>
                  <div className="mt-0.5 font-medium">—</div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="border-border bg-card p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Deficiencies</h3>
              <span className="text-xs text-muted-foreground">{activeDefs.length} active</span>
            </div>
            {activeDefs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active deficiencies.</p>
            ) : (
              <div className="space-y-2">
                {activeDefs.map((d) => {
                  const phase = detail.phases.find((ph) => ph.id === d.phaseId);
                  return (
                    <div key={d.id} className="flex items-start justify-between gap-2 rounded-md border border-border bg-muted/20 p-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{d.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {phase ? PHASE_LABEL[phase.type] : "—"} · {d.severity}
                        </p>
                      </div>
                      <StatusBadge
                        tone={d.status === "open" ? "blocked" : "in-progress"}
                        label={STATUS_LABEL[d.status]}
                        size="sm"
                        dot={false}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </section>

        {/* Activity */}
        {detail.auditEvents.length > 0 && (
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent activity</h3>
            <Card className="border-border bg-card shadow-card">
              <CardContent className="p-5">
                <ol className="space-y-3">
                  {detail.auditEvents.slice(0, 6).map((a) => (
                    <li key={a.id} className="flex items-start gap-3 text-sm">
                      <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <div>
                        <p className="font-medium capitalize">
                          {a.action.replace(/_/g, " ")}
                          <span className="ml-1 font-normal text-muted-foreground">· {relativeTime(a.createdAt)}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {detail.assignedProjectManager?.fullName ?? "System"}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </section>
        )}
      </main>
    </div>
  );
}

function KpiChip({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: "blocked" | "closed" | "not-started" | "in-progress" | "ready";
  icon: React.ReactNode;
}) {
  const c = phaseHealthClasses(tone);
  return (
    <div className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${c.bg} ${c.border}`}>
      <span className={c.text}>{icon}</span>
      <div className="leading-tight">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className={`text-sm font-semibold ${c.text}`}>{value}</div>
      </div>
    </div>
  );
}
