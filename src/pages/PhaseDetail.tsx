import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Camera,
  Clock,
  FileText,
  Image as ImageIcon,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { PhaseHealthPill } from "@/components/dashboard/PhaseHealthPill";
import { getPhase } from "@/lib/api";
import {
  GATE_LABEL,
  PHASE_LABEL,
  STATUS_LABEL,
  computePhaseHealth,
  gateStatusTone,
  phaseStatusTone,
  relativeTime,
} from "@/lib/derived";

export default function PhaseDetailPage() {
  const { projectId, phaseId } = useParams<{ projectId: string; phaseId: string }>();
  const navigate = useNavigate();

  const phaseQ = useQuery({
    queryKey: ["phase", phaseId],
    queryFn: () => getPhase(phaseId!),
    enabled: !!phaseId,
  });

  const detail = phaseQ.data?.ok ? phaseQ.data.data : undefined;
  const error = phaseQ.data?.ok === false ? phaseQ.data.error : undefined;

  const health = useMemo(() => {
    if (!detail) return undefined;
    return computePhaseHealth(detail.phase, detail.gates, detail.deficiencies);
  }, [detail]);

  if (phaseQ.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border">
          <div className="container flex h-16 items-center">
            <Skeleton className="h-9 w-24" />
          </div>
        </header>
        <main className="container space-y-6 py-6">
          <Skeleton className="h-24" />
          <Skeleton className="h-64" />
        </main>
      </div>
    );
  }

  if (error || !detail || !health) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border">
          <div className="container flex h-16 items-center">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
          </div>
        </header>
        <main className="container py-6">
          <Alert variant={error ? "destructive" : "default"}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{error ? "Couldn't load phase" : "Phase not found"}</AlertTitle>
            <AlertDescription>{error?.message ?? "This phase doesn't exist or you don't have access."}</AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  const { phase, project, gates, deficiencies, photoEvidence, auditEvents } = detail;
  const activeDefs = deficiencies.filter((d) => d.status === "open" || d.status === "in_progress");

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/project/${project.id}`}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                {project.name}
              </Link>
            </Button>
          </div>
          <StatusBadge tone={phaseStatusTone(phase.status)} label={STATUS_LABEL[phase.status]} size="sm" />
        </div>
      </header>

      <main className="container space-y-6 py-6">
        {/* Hero */}
        <section className="rounded-xl border border-border bg-gradient-surface p-6 shadow-card">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {project.projectNumber} · Phase
              </div>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{PHASE_LABEL[phase.type]}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{health.reason}</p>
            </div>
            <div className="flex flex-col items-start gap-3 md:items-end">
              <PhaseHealthPill health={health} size="lg" />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled title="Site check gate required">
                  Start phase
                </Button>
                <Button size="sm" disabled title="Requires QC sign-off">
                  Mark ready
                </Button>
              </div>
            </div>
          </div>
        </section>

        <Tabs defaultValue="gates" className="space-y-4">
          <TabsList className="bg-card">
            <TabsTrigger value="gates">Gates</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="deficiencies">
              Deficiencies {activeDefs.length > 0 && <span className="ml-1 text-status-blocked">({activeDefs.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Gates */}
          <TabsContent value="gates" className="grid gap-4 md:grid-cols-2">
            {gates.length === 0 ? (
              <EmptyCard icon={<ShieldCheck className="h-5 w-5" />} text="No gates configured for this phase yet." />
            ) : (
              gates.map((g) => (
                <Card key={g.id} className="border-border bg-card p-5 shadow-card">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-semibold">{GATE_LABEL[g.type]}</h3>
                    <StatusBadge tone={gateStatusTone(g.status)} label={STATUS_LABEL[g.status]} size="sm" />
                  </div>
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Camera className="h-3.5 w-3.5" />
                      {g.requiredPhotoEvidence ? "Photo evidence required" : "No photo required"}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Updated {relativeTime(g.updatedAt)}
                    </div>
                    {g.notes && <p className="text-foreground">{g.notes}</p>}
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Overview */}
          <TabsContent value="overview">
            <Card className="border-border bg-card p-5 shadow-card">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Scheduled start" value={fmt(phase.scheduledStart)} />
                <Field label="Scheduled end" value={fmt(phase.scheduledEnd)} />
                <Field label="Closed at" value={fmt(phase.closedAt)} />
                <Field label="Last updated" value={relativeTime(phase.updatedAt)} />
              </div>
              <div className="mt-6 border-t border-border pt-4">
                <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Personnel</h4>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-3 text-sm">
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">Subcontractor</div>
                      <div className="font-medium">Not assigned</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-3 text-sm">
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">Foreman / QC</div>
                      <div className="font-medium">Pending sign-off</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Deficiencies */}
          <TabsContent value="deficiencies">
            {deficiencies.length === 0 ? (
              <EmptyCard icon={<AlertTriangle className="h-5 w-5" />} text="No deficiencies logged for this phase." />
            ) : (
              <Card className="border-border bg-card p-2 shadow-card">
                <ul className="divide-y divide-border">
                  {deficiencies.map((d) => (
                    <li key={d.id} className="flex items-start justify-between gap-3 px-3 py-3">
                      <div className="min-w-0">
                        <p className="font-medium">{d.title}</p>
                        {d.description && <p className="mt-0.5 text-xs text-muted-foreground">{d.description}</p>}
                        <p className="mt-1 text-xs text-muted-foreground">Severity: {d.severity}</p>
                      </div>
                      <StatusBadge
                        tone={d.status === "open" ? "blocked" : d.status === "resolved" || d.status === "closed" ? "closed" : "in-progress"}
                        label={STATUS_LABEL[d.status]}
                        size="sm"
                        dot={false}
                      />
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </TabsContent>

          {/* Photos */}
          <TabsContent value="photos">
            {photoEvidence.length === 0 ? (
              <EmptyCard icon={<ImageIcon className="h-5 w-5" />} text="No photos uploaded for this phase yet." />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {photoEvidence.map((p) => (
                  <div
                    key={p.id}
                    className="flex aspect-square items-center justify-center rounded-md border border-border bg-muted/40 text-xs text-muted-foreground"
                  >
                    <ImageIcon className="h-6 w-6" />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Activity */}
          <TabsContent value="activity">
            {auditEvents.length === 0 ? (
              <EmptyCard icon={<FileText className="h-5 w-5" />} text="No activity recorded for this phase yet." />
            ) : (
              <Card className="border-border bg-card p-5 shadow-card">
                <ol className="space-y-3">
                  {auditEvents.map((a) => (
                    <li key={a.id} className="flex items-start gap-3 text-sm">
                      <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <div>
                        <p className="font-medium capitalize">
                          {a.action.replace(/_/g, " ")}
                          <span className="ml-1 font-normal text-muted-foreground">· {relativeTime(a.createdAt)}</span>
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function fmt(iso?: string) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  );
}

function EmptyCard({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <Card className="border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-card">
      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">{icon}</div>
      {text}
    </Card>
  );
}
