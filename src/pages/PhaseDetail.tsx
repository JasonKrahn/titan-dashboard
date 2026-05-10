import { useMemo, useState, useEffect, useRef, type RefObject } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  
  Camera,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Image as ImageIcon,
  Plus,
  ShieldCheck,
  Upload,
  User as UserIcon,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BadgeTone } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { MobileActionSheet, type MobileActionItem } from "@/components/ui/mobile-action-sheet";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { ActivityList } from "@/components/dashboard/ActivityList";
import { PageNav } from "@/components/dashboard/PageNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { statusToTone } from "@/components/dashboard/StatusBadge";
import { PhaseHealthPill } from "@/components/dashboard/PhaseHealthPill";
import { SiteCheckDialog } from "@/components/dashboard/SiteCheckDialog";
import { SiteBlockDialog } from "@/components/dashboard/SiteBlockDialog";
import { SiteUnblockDialog } from "@/components/dashboard/SiteUnblockDialog";
import { InspectionResultDialog } from "@/components/dashboard/InspectionResultDialog";
import { DeficiencyDialog } from "@/components/dashboard/DeficiencyDialog";
import { PhotoViewerDialog } from "@/components/dashboard/PhotoViewerDialog";
import { PhotoUploadDialog } from "@/components/dashboard/PhotoUploadDialog";
import { DatePicker } from "@/components/ui/date-picker";
import { assignSubcontractorToPhase, getPhase, getPhotoViewUrl, markPhaseReadyForInspection, updatePhase } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Deficiency, Gate, PhaseStatus, PhotoEvidence } from "@/lib/types";
import {
  GATE_LABEL,
  PHASE_LABEL,
  STATUS_LABEL,
  type StatusTone,
  computePhaseHealth,
  gateStatusTone,
  phaseStatusTone,
  relativeTime,
} from "@/lib/derived";

export default function PhaseDetailPage() {
  const { projectId, phaseId } = useParams<{ projectId: string; phaseId: string }>();
  
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") ?? "overview";

  const phaseQ = useQuery({
    queryKey: ["phase", phaseId],
    queryFn: () => getPhase(phaseId!),
    enabled: !!phaseId,
  });

  const detail = phaseQ.data?.ok ? phaseQ.data.data : undefined;
  const error = phaseQ.data?.ok === false ? phaseQ.data.error : undefined;
  const qc = useQueryClient();

  const readyMutation = useMutation({
    mutationFn: ({ phaseId, projectId }: { phaseId: string; projectId: string }) =>
      markPhaseReadyForInspection({ phaseId, projectId }),
    onSuccess: (res) => {
      if (res.ok) {
        qc.invalidateQueries({ queryKey: ["phase", phaseId] });
      }
    },
  });

  const updatePhaseMutation = useMutation({
    mutationFn: ({ phaseId, scheduledStart, scheduledEnd }: { phaseId: string; scheduledStart?: string; scheduledEnd?: string }) =>
      updatePhase({ phaseId, scheduledStart, scheduledEnd }),
    onSuccess: (res) => {
      if (!res.ok) {
        setDateValidationError((res as { ok: false; error: { message: string } }).error.message);
        return;
      }
      qc.invalidateQueries({ queryKey: ["phase", phaseId] });
      setDateValidationError(null);
    },
  });

  const [siteCheckOpen, setSiteCheckOpen] = useState(false);
  const [siteBlockOpen, setSiteBlockOpen] = useState(false);
  const [siteUnblockOpen, setSiteUnblockOpen] = useState(false);
  const [inspectionResultOpen, setInspectionResultOpen] = useState(false);
  const [inspectionResultMode, setInspectionResultMode] = useState<"passed" | "failed">("passed");
  const [selectedGateId, setSelectedGateId] = useState<string | null>(null);
  const [deficiencyDialogOpen, setDeficiencyDialogOpen] = useState(false);
  const [deficiencyDialogMode, setDeficiencyDialogMode] = useState<"create" | "edit" | "resolve">("create");
  const [selectedDeficiencyId, setSelectedDeficiencyId] = useState<string | null>(null);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoEvidence | null>(null);
  const [photoUploadOpen, setPhotoUploadOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [highlightedDeficiencyId, setHighlightedDeficiencyId] = useState<string | null>(null);
  const deficiencyRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const siteCheckHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const inspectionHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const [dateValidationError, setDateValidationError] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);

  useEffect(() => {
    if (!highlightedDeficiencyId) return;
    const el = deficiencyRefs.current[highlightedDeficiencyId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    const timer = setTimeout(() => setHighlightedDeficiencyId(null), 1500);
    return () => clearTimeout(timer);
  }, [highlightedDeficiencyId]);

  const health = useMemo(() => {
    if (!detail) return undefined;
    return computePhaseHealth(detail.phase, detail.gates, detail.deficiencies);
  }, [detail]);

  if (phaseQ.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader activeSection="dashboard" />
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
        <AppHeader activeSection="dashboard" />
        <main className="container py-6">
          <PageNav
            backFallback={`/project/${detail?.project.id ?? ""}`}
            items={[
              { label: "All Projects", to: "/", state: { view: "dashboard" } },
              { label: "Phase" },
            ]}
            className="mb-4"
          />
          <Alert variant={error ? "destructive" : "default"}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{error ? "Couldn't load phase" : "Phase not found"}</AlertTitle>
            <AlertDescription>{error?.message ?? "This phase doesn't exist or you don't have access."}</AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  const { phase, project, gates, deficiencies, photoEvidence, auditEvents, subcontractors } = detail;
  const activeDefs = deficiencies.filter((d) => d.status === "open" || d.status === "in_progress");
  const siteGate = gates.find((g) => g.type === "site_check");
  const inspectionGate = gates.find((g) => g.type === "inspection");
  const showReadyButton =
    !!inspectionGate &&
    (phase.status === "in_progress" || (phase.status === "blocked" && inspectionGate.status === "failed")) &&
    activeDefs.length === 0;
  const showPassedFailed =
    !!inspectionGate &&
    phase.status === "ready_for_inspection" &&
    activeDefs.length === 0;
  const jumpToSection = ({
    tab,
    focusRef,
  }: {
    tab: string;
    focusRef?: RefObject<HTMLElement | null>;
  }) => {
    setActiveTab(tab);
    if (!focusRef?.current) return;
    window.setTimeout(() => {
      focusRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
      focusRef.current?.focus();
    }, 0);
  };
  const phaseMobileActions: MobileActionItem[] = [
    ...(phase.status !== "closed"
      ? [
          {
            label: "Edit schedule",
            icon: <Calendar className="h-4 w-4" />,
            helperText: "Update start or end date",
            onClick: () => setScheduleOpen(true),
          },
        ]
      : []),
    ...(siteGate?.status === "not_started"
      ? [
          {
            label: "Site checked",
            icon: <CheckCircle2 className="h-4 w-4" />,
            helperText: "Mark the site check as passed",
            onClick: () => setSiteCheckOpen(true),
          },
          {
            label: "Site blocked",
            icon: <AlertTriangle className="h-4 w-4" />,
            helperText: "Block this phase with notes and evidence",
            onClick: () => setSiteBlockOpen(true),
          },
        ]
      : []),
    ...(siteGate?.status === "blocked"
      ? [
          {
            label: "Site cleared",
            icon: <ShieldCheck className="h-4 w-4" />,
            helperText: "Clear the site check block",
            onClick: () => setSiteUnblockOpen(true),
          },
        ]
      : []),
    ...(showReadyButton
      ? [
          {
            label: readyMutation.isPending ? "Marking ready..." : "Ready for inspection",
            icon: <ShieldCheck className="h-4 w-4" />,
            helperText: "Move this phase into inspection queue",
            disabled: readyMutation.isPending,
            onClick: () => readyMutation.mutate({ phaseId: phase.id, projectId: project.id }),
          },
        ]
      : []),
    ...(showPassedFailed && inspectionGate
      ? [
          {
            label: "Pass inspection",
            icon: <CheckCircle2 className="h-4 w-4" />,
            helperText: "Record a passed inspection",
            onClick: () => {
              setSelectedGateId(inspectionGate.id);
              setInspectionResultMode("passed");
              setInspectionResultOpen(true);
            },
          },
          {
            label: "Fail inspection",
            icon: <XCircle className="h-4 w-4" />,
            helperText: "Record a failed inspection",
            onClick: () => {
              setSelectedGateId(inspectionGate.id);
              setInspectionResultMode("failed");
              setInspectionResultOpen(true);
            },
          },
        ]
      : []),
    {
      label: "Add deficiency",
      icon: <Plus className="h-4 w-4" />,
      helperText: "Log an issue for this phase",
      onClick: () => {
        setActiveTab("deficiencies");
        setDeficiencyDialogMode("create");
        setSelectedDeficiencyId(null);
        setDeficiencyDialogOpen(true);
      },
    },
    {
      label: "Upload photo",
      icon: <Upload className="h-4 w-4" />,
      helperText: "Add phase or deficiency evidence",
      onClick: () => {
        setActiveTab("photos");
        setPhotoUploadOpen(true);
      },
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader activeSection="dashboard" />

      <main className="container space-y-5 pb-28 pt-5 md:space-y-6 md:py-6">
        <PageNav
          backFallback={`/project/${project.id}`}
          items={[
            { label: "All Projects", to: "/", state: { view: "dashboard" } },
            { label: project.name, to: `/project/${project.id}` },
            { label: PHASE_LABEL[phase.type] },
          ]}
        />

        {/* Hero */}
        <Card surface="panel" className="rounded-xl p-4 sm:p-6">
          <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
            <div className="min-w-0">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="text-eyebrow font-semibold uppercase tracking-widest text-muted-foreground sm:text-[10px]">
                    {project.projectNumber} · Phase
                  </div>
                  <h1 className="mt-1 truncate text-2xl font-bold leading-tight sm:text-3xl">{PHASE_LABEL[phase.type]}</h1>
                  <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{health.reason}</p>
                </div>
                <PhaseHealthPill health={health} size="md" className="self-start" />
              </div>
              {dateValidationError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Date validation error</AlertTitle>
                  <AlertDescription>{dateValidationError}</AlertDescription>
                </Alert>
              )}
              <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3 md:hidden">
                <SectionHeading as="div" size="sm">Schedule</SectionHeading>
                <div className="mt-1 text-sm font-semibold">
                  {fmt(phase.scheduledStart)} → {fmt(phase.scheduledEnd)}
                </div>
              </div>
              <div className="mt-4 hidden md:flex md:flex-wrap md:items-center md:gap-x-5 md:gap-y-2 md:text-sm md:text-muted-foreground">
                <span className="font-medium text-foreground">{fmt(phase.scheduledStart)} → {fmt(phase.scheduledEnd)}</span>
                <span>Last update: <span className="font-medium text-foreground">{relativeTime(phase.updatedAt)}</span></span>
                <span>Closed: <span className="font-medium text-foreground">{fmt(phase.closedAt)}</span></span>
                {phase.type === "finishing" && project.finishLevel && (
                  <span>Finish level: <span className="font-medium text-foreground">{project.finishLevel}</span></span>
                )}
              </div>
            </div>

            <div className="hidden md:flex md:flex-col md:items-stretch md:gap-3">
              {siteGate?.status === "not_started" && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setSiteCheckOpen(true)}>
                    <CheckCircle2 className="mr-1.5 h-4 w-4" /> Site Checked
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setSiteBlockOpen(true)}>
                    <AlertTriangle className="mr-1.5 h-4 w-4" /> Site Blocked
                  </Button>
                </div>
              )}
              {siteGate?.status === "blocked" && (
                <Button size="sm" variant="outline" onClick={() => setSiteUnblockOpen(true)}>
                  <ShieldCheck className="mr-1.5 h-4 w-4" /> Site Cleared
                </Button>
              )}
              {showReadyButton && (
                <Button
                  size="sm"
                  onClick={() => readyMutation.mutate({ phaseId: phase.id, projectId: project.id })}
                  disabled={readyMutation.isPending}
                >
                  <ShieldCheck className="mr-1.5 h-4 w-4" />
                  {readyMutation.isPending ? "Marking ready…" : "Ready for Inspection"}
                </Button>
              )}
              {showPassedFailed && inspectionGate && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedGateId(inspectionGate.id);
                      setInspectionResultMode("passed");
                      setInspectionResultOpen(true);
                    }}
                  >
                    <CheckCircle2 className="mr-1.5 h-4 w-4" /> Mark Passed
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setSelectedGateId(inspectionGate.id);
                      setInspectionResultMode("failed");
                      setInspectionResultOpen(true);
                    }}
                  >
                    <XCircle className="mr-1.5 h-4 w-4" /> Mark Failed
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="hidden md:grid md:grid-cols-4 md:gap-3">
            <DesktopSummaryButton
              ariaLabel="Open deficiencies summary"
              label="Open deficiencies"
              value={String(activeDefs.length)}
              tone={activeDefs.length > 0 ? "danger" : "success"}
              onClick={() => jumpToSection({ tab: "deficiencies" })}
            />
            <DesktopSummaryButton
              ariaLabel="Photos summary"
              label="Photos"
              value={String(photoEvidence.length)}
              tone={photoEvidence.length > 0 ? "accent" : "neutral"}
              onClick={() => jumpToSection({ tab: "photos" })}
            />
            {siteGate ? (
              <DesktopSummaryButton
                ariaLabel="Site check summary"
                label="Site check"
                value={STATUS_LABEL[siteGate.status]}
                tone={statusToTone(gateStatusTone(siteGate.status))}
                onClick={() => jumpToSection({ tab: "overview", focusRef: siteCheckHeadingRef })}
              />
            ) : (
              <div />
            )}
            {inspectionGate ? (
              <DesktopSummaryButton
                ariaLabel="Inspection summary"
                label="Inspection"
                value={STATUS_LABEL[inspectionGate.status]}
                tone={statusToTone(gateStatusTone(inspectionGate.status))}
                onClick={() => jumpToSection({ tab: "overview", focusRef: inspectionHeadingRef })}
              />
            ) : (
              <div />
            )}
          </div>
          <TabsList className="border border-border p-1 shadow-sm bg-card">
            <TabsTrigger value="overview" className="font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm hover:bg-muted/50">Overview</TabsTrigger>
            <TabsTrigger value="deficiencies" className="font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm hover:bg-muted/50">
              Deficiencies {activeDefs.length > 0 && <span className="ml-1 text-status-blocked">({activeDefs.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="photos" className="font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm hover:bg-muted/50">Photos</TabsTrigger>
            <TabsTrigger value="activity" className="hidden font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm hover:bg-muted/50 md:inline-flex">Activity</TabsTrigger>
          </TabsList>

          {/* Overview (Gates + Schedule/Personnel) */}
          <TabsContent value="overview" className="space-y-4">
            {/* Gates */}
            <div className="md:hidden">
              {gates.length === 0 ? (
                <EmptyCard icon={<ShieldCheck className="h-5 w-5" />} text="No gates configured for this phase yet." />
              ) : (
                <div className="mobile-list overflow-hidden">
                  {gates.map((g) => {
                    const gatePhotos = photoEvidence.filter((p) => p.gateId === g.id);
                    const hasMobileAction = mobileGateHasAction({
                      gate: g,
                      phaseStatus: phase.status,
                      activeDeficiencyCount: activeDefs.length,
                    });
                    const content = (
                      <>
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          {g.requiredPhotoEvidence ? <Camera className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-foreground">{GATE_LABEL[g.type]}</span>
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                g.requiredPhotoEvidence ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                              )}
                            >
                              {gatePhotos.length > 0 ? `${gatePhotos.length} photo${gatePhotos.length === 1 ? "" : "s"}` : STATUS_LABEL[g.status]}
                            </span>
                          </span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {gatePhotos.length > 0
                              ? "Photo evidence attached"
                              : g.requiredPhotoEvidence
                                ? "Photo evidence required"
                                : "No photo required"}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            Updated {relativeTime(g.updatedAt)}
                          </span>
                          {g.notes && <span className="mt-1 block text-xs text-foreground">{g.notes}</span>}
                        </span>
                        {hasMobileAction && (
                          <span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-foreground">
                            Actions
                          </span>
                        )}
                      </>
                    );

                    return hasMobileAction ? (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setMobileActionsOpen(true)}
                        className="flex w-full items-center gap-3 px-3 py-3 text-left active:bg-muted/60"
                      >
                        {content}
                      </button>
                    ) : (
                      <div key={g.id} className="flex items-center gap-3 px-3 py-3">
                        {content}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="hidden gap-4 md:grid md:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.95fr)]">
              <div className="space-y-4">
                {gates.length === 0 ? (
                  <EmptyCard icon={<ShieldCheck className="h-5 w-5" />} text="No gates configured for this phase yet." />
                ) : (
                  gates.map((g) => {
                    const gatePhotos = photoEvidence.filter((p) => p.gateId === g.id);
                    const tone = gateStatusTone(g.status);
                    const headingRef = g.type === "site_check" ? siteCheckHeadingRef : g.type === "inspection" ? inspectionHeadingRef : undefined;
                    return (
                      <Card key={g.id} className="p-5 shadow-card">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <h3 ref={headingRef} tabIndex={-1} className="font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            {GATE_LABEL[g.type]}
                          </h3>
                          <StatusBadge tone={tone} label={STATUS_LABEL[g.status]} size="sm" />
                        </div>
                        <div className="space-y-2 text-xs text-muted-foreground">
                          {gatePhotos.length > 0 ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Camera className="h-3.5 w-3.5" />
                              {gatePhotos.map((p) => (
                                <button
                                  key={p.id}
                                  onClick={() => { setSelectedPhoto(p); setPhotoViewerOpen(true); }}
                                  className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/30 px-2 py-0.5 text-xs hover:bg-muted/50"
                                >
                                  <ImageIcon className="h-3 w-3" />
                                  {PURPOSE_LABEL[p.purpose] ?? p.purpose}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <Camera className="h-3.5 w-3.5" />
                              {g.requiredPhotoEvidence ? "Photo evidence required" : "No photo required"}
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            Updated {relativeTime(g.updatedAt)}
                          </div>
                          {g.notes && <p className="text-foreground">{g.notes}</p>}
                        </div>
                      </Card>
                    );
                  })
                )}
                {activeDefs.length > 0 && (
                  <Card className="p-5 shadow-card">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <SectionHeading as="h3">Open Deficiencies</SectionHeading>
                      <Button size="sm" variant="ghost" onClick={() => setActiveTab("deficiencies")}>
                        View all
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {activeDefs.slice(0, 3).map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            setActiveTab("deficiencies");
                            setHighlightedDeficiencyId(d.id);
                          }}
                          className="flex w-full items-start justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2 text-left hover:bg-muted/35"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-foreground">{d.title}</div>
                            <div className="mt-0.5 text-xs text-muted-foreground">{STATUS_LABEL[phase.status]}</div>
                          </div>
                          <SeverityBadge severity={d.severity} size="xs" />
                        </button>
                      ))}
                    </div>
                  </Card>
                )}
              </div>

              <div className="space-y-4">
                <Card className="p-5 shadow-card">
                  <SectionHeading as="h3">Schedule</SectionHeading>
                  <div className="mt-3 space-y-3">
                    <div>
                      <div className="text-xs text-muted-foreground">Scheduled start</div>
                      <DatePicker
                        value={phase.scheduledStart ? new Date(phase.scheduledStart) : undefined}
                        onChange={(date) => {
                          if (date) {
                            updatePhaseMutation.mutate({ phaseId: phase.id, scheduledStart: date.toISOString() });
                          }
                        }}
                        placeholder="Not set"
                        disabled={updatePhaseMutation.isPending || phase.status === "closed"}
                      />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Scheduled end</div>
                      <DatePicker
                        value={phase.scheduledEnd ? new Date(phase.scheduledEnd) : undefined}
                        onChange={(date) => {
                          if (date) {
                            updatePhaseMutation.mutate({ phaseId: phase.id, scheduledEnd: date.toISOString() });
                          }
                        }}
                        placeholder="Not set"
                        disabled={updatePhaseMutation.isPending || phase.status === "closed"}
                      />
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                    <div>Closed: <span className="font-medium text-foreground">{fmt(phase.closedAt)}</span></div>
                    <div>Last update: <span className="font-medium text-foreground">{relativeTime(phase.updatedAt)}</span></div>
                  </div>
                </Card>

                <Card className="p-5 shadow-card">
                  <SectionHeading as="h3">Personnel</SectionHeading>
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <UserIcon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-muted-foreground">Subcontractor</div>
                        <Select
                          value={phase.assignedSubcontractorId || "unassigned"}
                          onValueChange={(value) => {
                            if (value === "unassigned") return;
                            assignSubcontractorToPhase(phase.id, value).then((res) => {
                              if (res.ok) {
                                qc.invalidateQueries({ queryKey: ["phase", phaseId] });
                              }
                            });
                          }}
                        >
                          <SelectTrigger className="mt-1 h-8 border border-input bg-background px-3 py-2 text-xs font-medium">
                            <SelectValue placeholder="Select subcontractor" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Not assigned</SelectItem>
                            {subcontractors
                              .filter((s) => s.trade === phase.type)
                              .map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.displayName}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <UserIcon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-muted-foreground">Project manager</div>
                        <div className="mt-1 truncate text-sm font-semibold text-foreground">
                          {detail.assignedProjectManager?.fullName ?? "Unassigned"}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            <Card className="border-border bg-card p-0 shadow-card md:hidden md:p-5">
              <div className="p-4 pb-2 md:p-0">
                <SectionHeading as="h4" size="sm">Personnel</SectionHeading>
              </div>
              <div className="grid gap-3 md:mt-3 md:grid-cols-2">
                <div className="flex items-center gap-3 px-4 pb-4 pt-2 text-sm md:rounded-md md:border md:border-border md:bg-muted/30 md:p-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground md:h-auto md:w-auto md:bg-transparent">
                    <UserIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-muted-foreground">Subcontractor</div>
                    <Select
                      value={phase.assignedSubcontractorId || "unassigned"}
                      onValueChange={(value) => {
                        if (value === "unassigned") return;
                        assignSubcontractorToPhase(phase.id, value).then((res) => {
                          if (res.ok) {
                            qc.invalidateQueries({ queryKey: ["phase", phaseId] });
                          }
                        });
                      }}
                    >
                      <SelectTrigger className="mt-0.5 h-auto border-0 bg-transparent p-0 text-sm font-semibold shadow-none ring-offset-0 focus:ring-0 focus:ring-offset-0 md:h-7 md:border md:border-input md:bg-background md:px-3 md:py-2 md:text-xs md:font-normal md:focus:ring-2 md:focus:ring-ring md:focus:ring-offset-2">
                        <SelectValue placeholder="Select subcontractor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Not assigned</SelectItem>
                        {subcontractors
                          .filter((s) => s.trade === phase.type)
                          .map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.displayName}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 pb-4 pt-2 text-sm">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <UserIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-muted-foreground">Project manager</div>
                    <div className="mt-0.5 truncate text-sm font-semibold">
                      {detail.assignedProjectManager?.fullName ?? "Unassigned"}
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Activity (mobile only — desktop has its own tab) */}
            <section className="md:hidden">
              <SectionHeading as="h3" className="mb-3">Activity</SectionHeading>
              {auditEvents.length === 0 ? (
                <EmptyCard icon={<FileText className="h-5 w-5" />} text="No activity recorded for this phase yet." />
              ) : (
                <Card className="p-5 shadow-card">
                  <ActivityList
                    events={auditEvents}
                    lookups={{
                      projects: [project],
                      phases: [phase],
                      gates,
                      deficiencies,
                    }}
                  />
                </Card>
              )}
            </section>
          </TabsContent>

          {/* Activity tab (desktop) */}
          <TabsContent value="activity">
            {auditEvents.length === 0 ? (
              <EmptyCard icon={<FileText className="h-5 w-5" />} text="No activity recorded for this phase yet." />
            ) : (
              <Card className="p-5 shadow-card">
                <ActivityList
                  events={auditEvents}
                  lookups={{
                    projects: [project],
                    phases: [phase],
                    gates,
                    deficiencies,
                  }}
                />
              </Card>
            )}
          </TabsContent>

          {/* Deficiencies */}
          <TabsContent value="deficiencies">
            <div className="mb-4 flex justify-end">
              <Button size="sm" onClick={() => { setDeficiencyDialogMode("create"); setSelectedDeficiencyId(null); setDeficiencyDialogOpen(true); }}>
                Add Deficiency
              </Button>
            </div>
            {deficiencies.length === 0 ? (
              <EmptyCard icon={<AlertTriangle className="h-5 w-5" />} text="No deficiencies logged for this phase." />
            ) : (
              <Card className="p-2 shadow-card">
                <ul className="divide-y divide-border">
                  {deficiencies.map((d) => {
                    const deficiencyPhotos = photoEvidence.filter((p) => p.deficiencyId === d.id);
                    const isHighlighted = highlightedDeficiencyId === d.id;
                    return (
                      <li
                        key={d.id}
                        ref={(el) => { deficiencyRefs.current[d.id] = el; }}
                        className={`flex items-start justify-between gap-3 px-3 py-3 rounded-md transition-all duration-300 ${
                          isHighlighted ? "ring-2 ring-primary bg-primary/5" : ""
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{d.title}</p>
                          {d.description && <p className="mt-0.5 text-xs text-muted-foreground">{d.description}</p>}
                          <div className="mt-1.5"><SeverityBadge severity={d.severity} size="xs" /></div>
                          {deficiencyPhotos.length > 0 && (
                            <div className="mt-2 flex gap-2">
                              {deficiencyPhotos.map((p) => (
                                <button
                                  key={p.id}
                                  onClick={() => { setSelectedPhoto(p); setPhotoViewerOpen(true); }}
                                  className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/30 px-2 py-1 text-xs hover:bg-muted/50"
                                >
                                  <ImageIcon className="h-3 w-3" />
                                  {p.purpose === "deficiency_before" ? "Before" : "After"}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {(d.status === "open" || d.status === "in_progress") && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                onClick={() => { setDeficiencyDialogMode("edit"); setSelectedDeficiencyId(d.id); setDeficiencyDialogOpen(true); }}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                onClick={() => { setDeficiencyDialogMode("resolve"); setSelectedDeficiencyId(d.id); setDeficiencyDialogOpen(true); }}
                              >
                                Resolve
                              </Button>
                            </div>
                          )}
                          {d.status === "resolved" && (
                            <StatusBadge tone="closed" label="Resolved" size="sm" />
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            )}
          </TabsContent>

          {/* Photos */}
          <TabsContent value="photos">
            <div className="mb-4 flex justify-end">
              <Button size="sm" onClick={() => setPhotoUploadOpen(true)}>
                <Camera className="mr-1.5 h-4 w-4" />
                Upload Photo
              </Button>
            </div>
            {photoEvidence.length === 0 ? (
              <EmptyCard icon={<ImageIcon className="h-5 w-5" />} text="No photos uploaded for this phase yet." />
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {photoEvidence.map((p) => {
                  const linkedDef = p.deficiencyId ? deficiencies.find((d) => d.id === p.deficiencyId) : undefined;
                  return (
                    <PhotoCard
                      key={p.id}
                      photo={p}
                      linkedDeficiency={linkedDef}
                      onOpen={() => { setSelectedPhoto(p); setPhotoViewerOpen(true); }}
                      onDeficiencyClick={() => {
                        setActiveTab("deficiencies");
                        setHighlightedDeficiencyId(p.deficiencyId!);
                      }}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

        </Tabs>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:hidden">
        <Button
          type="button"
          className="h-12 w-full rounded-full text-sm font-semibold shadow-glow"
          onClick={() => setMobileActionsOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Phase actions
        </Button>
      </div>
      <MobileActionSheet
        open={mobileActionsOpen}
        onOpenChange={setMobileActionsOpen}
        title="Phase actions"
        actions={phaseMobileActions}
      />

      {detail && (() => {
        const siteGate = gates.find((g) => g.type === "site_check");
        return siteGate ? (
          <>
            <SiteCheckDialog
              open={siteCheckOpen}
              onOpenChange={setSiteCheckOpen}
              gateId={siteGate.id}
              phaseId={phase.id}
              projectId={project.id}
              phaseLabel={PHASE_LABEL[phase.type]}
            />
            <SiteBlockDialog
              open={siteBlockOpen}
              onOpenChange={setSiteBlockOpen}
              gateId={siteGate.id}
              phaseId={phase.id}
              projectId={project.id}
              phaseLabel={PHASE_LABEL[phase.type]}
            />
            <SiteUnblockDialog
              open={siteUnblockOpen}
              onOpenChange={setSiteUnblockOpen}
              gateId={siteGate.id}
              phaseId={phase.id}
              projectId={project.id}
              phaseLabel={PHASE_LABEL[phase.type]}
            />
          </>
        ) : null;
      })()}
      {detail && selectedGateId && (
        <InspectionResultDialog
          open={inspectionResultOpen}
          onOpenChange={setInspectionResultOpen}
          gateId={selectedGateId}
          phaseId={phase.id}
          projectId={project.id}
          phaseLabel={PHASE_LABEL[phase.type]}
          mode={inspectionResultMode}
        />
      )}
      {detail && (
        <DeficiencyDialog
          open={deficiencyDialogOpen}
          onOpenChange={setDeficiencyDialogOpen}
          phaseId={phase.id}
          projectId={project.id}
          phaseLabel={PHASE_LABEL[phase.type]}
          mode={deficiencyDialogMode}
          deficiency={deficiencies.find((d) => d.id === selectedDeficiencyId)}
        />
      )}
      <PhotoViewerDialog
        open={photoViewerOpen}
        onOpenChange={setPhotoViewerOpen}
        photo={selectedPhoto}
      />
      {detail && (
        <PhotoUploadDialog
          open={photoUploadOpen}
          onOpenChange={setPhotoUploadOpen}
          phaseId={phase.id}
          projectId={project.id}
          deficiencies={deficiencies}
        />
      )}
      <BottomSheet open={scheduleOpen} onOpenChange={setScheduleOpen} title="Schedule">
        <div className="grid gap-4">
          {dateValidationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Date validation error</AlertTitle>
              <AlertDescription>{dateValidationError}</AlertDescription>
            </Alert>
          )}
          <div className="grid gap-1.5">
            <div className="text-xs text-muted-foreground">Scheduled start</div>
            <DatePicker
              value={phase.scheduledStart ? new Date(phase.scheduledStart) : undefined}
              onChange={(date) => {
                if (date) {
                  updatePhaseMutation.mutate({
                    phaseId: phase.id,
                    scheduledStart: date.toISOString(),
                  });
                }
              }}
              placeholder="Not set"
              disabled={updatePhaseMutation.isPending || phase.status === "closed"}
            />
          </div>
          <div className="grid gap-1.5">
            <div className="text-xs text-muted-foreground">Scheduled end</div>
            <DatePicker
              value={phase.scheduledEnd ? new Date(phase.scheduledEnd) : undefined}
              onChange={(date) => {
                if (date) {
                  updatePhaseMutation.mutate({
                    phaseId: phase.id,
                    scheduledEnd: date.toISOString(),
                  });
                }
              }}
              placeholder="Not set"
              disabled={updatePhaseMutation.isPending || phase.status === "closed"}
            />
          </div>
          <Button type="button" onClick={() => setScheduleOpen(false)}>
            Done
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}

function fmt(iso?: string) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";
}

function mobileGateHasAction({
  gate,
  phaseStatus,
  activeDeficiencyCount,
}: {
  gate: Gate;
  phaseStatus: PhaseStatus;
  activeDeficiencyCount: number;
}) {
  if (gate.type === "site_check") {
    return gate.status === "not_started" || gate.status === "blocked";
  }

  if (gate.type !== "inspection" || activeDeficiencyCount > 0) {
    return false;
  }

  return (
    phaseStatus === "ready_for_inspection" ||
    phaseStatus === "in_progress" ||
    (phaseStatus === "blocked" && gate.status === "failed")
  );
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

const PURPOSE_LABEL: Record<string, string> = {
  site_check: "Site Check",
  inspection: "Inspection",
  attic_check: "Attic Check",
  deficiency_before: "Before",
  deficiency_after: "After",
  general: "General",
};

function PhotoCard({
  photo,
  linkedDeficiency,
  onOpen,
  onDeficiencyClick,
}: {
  photo: PhotoEvidence;
  linkedDeficiency?: Deficiency;
  onOpen: () => void;
  onDeficiencyClick: () => void;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPhotoViewUrl(photo.id).then((res) => {
      if (!cancelled && res.ok && res.data.url) {
        setBlobUrl(res.data.url);
      }
    });
    return () => { cancelled = true; };
  }, [photo.id]);

  return (
    <div className="group flex flex-col overflow-hidden rounded-md border border-border bg-card shadow-card">
      <button
        type="button"
        onClick={onOpen}
        className="relative aspect-square w-full overflow-hidden bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {blobUrl ? (
          <img src={blobUrl} alt={PURPOSE_LABEL[photo.purpose] ?? photo.purpose} className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
      </button>
      <div className="flex flex-col gap-0.5 p-2">
        <span className="text-xs font-medium">{PURPOSE_LABEL[photo.purpose] ?? photo.purpose}</span>
        {photo.fileSizeBytes && (
          <span className="text-[10px] text-muted-foreground">{(photo.fileSizeBytes / 1024).toFixed(0)} KB</span>
        )}
        {linkedDeficiency && (
          <button
            type="button"
            onClick={onDeficiencyClick}
            className="mt-0.5 truncate text-left text-[10px] text-primary hover:text-primary/80"
          >
            Deficiency: {linkedDeficiency.title}
          </button>
        )}
      </div>
    </div>
  );
}

function DesktopSummaryButton({
  label,
  value,
  tone,
  onClick,
  ariaLabel,
}: {
  label: string;
  value: string;
  tone: BadgeTone;
  onClick: () => void;
  ariaLabel: string;
}) {
  const toneClasses: Record<BadgeTone, string> = {
    neutral: "border-status-not-started/30 bg-status-not-started/10 text-status-not-started",
    info: "border-status-in-progress/30 bg-status-in-progress/10 text-status-in-progress",
    ready: "border-status-ready/30 bg-status-ready/10 text-status-ready",
    success: "border-status-closed/30 bg-status-closed/10 text-status-closed",
    warning: "border-status-attention/30 bg-status-attention/10 text-status-attention",
    danger: "border-status-blocked/30 bg-status-blocked/10 text-status-blocked",
    accent: "border-status-accent/30 bg-status-accent/10 text-status-accent",
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        "flex items-center justify-between rounded-xl border px-4 py-3 text-left transition hover:border-border-emphasis hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        toneClasses[tone],
      )}
    >
      <span className="text-[11px] font-semibold uppercase tracking-widest opacity-75">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </button>
  );
}
