import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  MapPin,
  User,
  Camera,
  AlertTriangle,
  FileText,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { getProject } from "@/lib/api";
import type { Phase, PhaseType } from "@/lib/types";
import {
  PHASE_LABEL,
  PHASE_ORDER,
  STATUS_LABEL,
  gateStatusTone,
  phaseStatusTone,
  projectPhases,
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

  const phasesByType = useMemo(() => {
    if (!detail) return {} as Record<PhaseType, Phase | undefined>;
    return projectPhases(detail.project.id, detail.phases);
  }, [detail]);

  const activeDefs = useMemo(() => {
    if (!detail) return [];
    return detail.deficiencies.filter(
      (d) => d.status === "open" || d.status === "in_progress"
    );
  }, [detail]);

  const hasAtticEvidence = useMemo(() => {
    if (!detail) return false;
    return detail.photoEvidence.some(
      (ph) => ph.purpose === "attic_check" && ph.status === "confirmed"
    );
  }, [detail]);

  const atticGate = useMemo(() => {
    if (!detail) return undefined;
    return detail.gates.find((g) => g.type === "attic_check");
  }, [detail]);

  const recentAudit = useMemo(() => {
    if (!detail) return [];
    return detail.auditEvents.slice(0, 6);
  }, [detail]);

  if (projectQ.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border sticky top-0 z-20 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="container flex items-center h-16">
            <Skeleton className="h-9 w-20" />
          </div>
        </header>
        <main className="container py-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-48" />
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border sticky top-0 z-20 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="container flex items-center h-16">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>
        </header>
        <main className="container py-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Couldn&apos;t load project</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border sticky top-0 z-20 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="container flex items-center h-16">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>
        </header>
        <main className="container py-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Project not found</AlertTitle>
            <AlertDescription>
              The project you&apos;re looking for doesn&apos;t exist or you don&apos;t have access.
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  const p = detail.project;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-20 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="container flex items-center justify-between h-16">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{p.projectNumber}</span>
            <StatusBadge
              tone={projectStatusTone(p.status)}
              label={STATUS_LABEL[p.status]}
              size="sm"
            />
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* Project title block */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{p.name}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-2">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {p.siteAddress}
            </span>
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              {detail.client.name}
            </span>
            {detail.assignedProjectManager && (
              <span className="inline-flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {detail.assignedProjectManager.fullName}
              </span>
            )}
          </div>
        </div>

        {/* Phase summary */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {PHASE_ORDER.map((type) => {
            const phase = phasesByType[type];
            const gate = detail.gates.find(
              (g) => g.phaseId === phase?.id && g.type === "site_check"
            );
            const inspection = detail.gates.find(
              (g) => g.phaseId === phase?.id && g.type === "inspection"
            );
            return (
              <Card key={type} className="shadow-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-semibold">
                    {PHASE_LABEL[type]}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <StatusBadge
                    tone={phase ? phaseStatusTone(phase.status) : "not-started"}
                    label={phase ? STATUS_LABEL[phase.status] : "Not started"}
                    size="sm"
                  />
                  <div className="space-y-1.5">
                    {gate && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Site check</span>
                        <StatusBadge
                          tone={gateStatusTone(gate.status)}
                          label={STATUS_LABEL[gate.status]}
                          size="sm"
                          dot={false}
                        />
                      </div>
                    )}
                    {inspection && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Inspection</span>
                        <StatusBadge
                          tone={gateStatusTone(inspection.status)}
                          label={STATUS_LABEL[inspection.status]}
                          size="sm"
                          dot={false}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Attic check */}
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Attic Check
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {atticGate ? (
                <>
                  <StatusBadge
                    tone={gateStatusTone(atticGate.status)}
                    label={STATUS_LABEL[atticGate.status]}
                    size="sm"
                  />
                  <div className="flex items-center gap-2 text-sm">
                    {hasAtticEvidence ? (
                      <>
                        <Camera className="h-4 w-4 text-emerald-500" />
                        <span className="text-emerald-600">Photo evidence confirmed</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <span className="text-amber-600">
                          {p.status === "draft" || p.status === "archived"
                            ? "Not required"
                            : "Missing photo evidence"}
                        </span>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">No attic gate configured</span>
              )}
            </CardContent>
          </Card>

          {/* Deficiencies */}
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Deficiencies
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeDefs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active deficiencies</p>
              ) : (
                <div className="space-y-2">
                  {activeDefs.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-start justify-between gap-2 rounded-md border border-border p-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{d.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {PHASE_LABEL[detail.phases.find((ph) => ph.id === d.phaseId)?.type ?? "insulation"]}
                        </p>
                      </div>
                      <StatusBadge
                        tone={d.status === "open" ? "blocked" : "in-progress"}
                        label={STATUS_LABEL[d.status]}
                        size="sm"
                        dot={false}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Audit timeline */}
        {recentAudit.length > 0 && (
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentAudit.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">
                        {a.action.replace(/_/g, " ")}
                        <span className="text-muted-foreground font-normal">
                          {" "}
                          · {relativeTime(a.createdAt)}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {detail.assignedProjectManager?.fullName ?? "System"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Separator />

        <p className="text-[11px] text-muted-foreground/70 text-center">
          Prototype data · Backend swap-in via lib/api adapters
        </p>
      </main>
    </div>
  );
}
