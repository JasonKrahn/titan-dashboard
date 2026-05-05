import { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  Lock,
  Upload,
  CheckCircle2,
  Archive,
  Pencil,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { PhaseHealthPill } from "@/components/dashboard/PhaseHealthPill";
import { SiteCheckDialog } from "@/components/dashboard/SiteCheckDialog";
import { SiteBlockDialog } from "@/components/dashboard/SiteBlockDialog";
import { SiteUnblockDialog } from "@/components/dashboard/SiteUnblockDialog";
import { ArchiveProjectDialog } from "@/components/dashboard/ArchiveProjectDialog";
import { NewProjectDialog } from "@/components/dashboard/NewProjectDialog";
import { ProjectNotes } from "@/components/dashboard/ProjectNotes";
import { PhotoViewerDialog } from "@/components/dashboard/PhotoViewerDialog";
import { DeficiencyDialog } from "@/components/dashboard/DeficiencyDialog";
import { getProject, updateAtticGate, getPhotoViewUrl } from "@/lib/api";
import type { PhotoEvidence } from "@/lib/types";
import {
  PHASE_LABEL,
  PHASE_ORDER,
  STATUS_LABEL,
  computePhaseHealth,
  gateStatusTone,
  GATE_LABEL,
  initials,
  phaseHealthClasses,
  projectStatusTone,
  relativeTime,
} from "@/lib/derived";
import { Badge } from "@/components/ui/badge";

const ENTITY_LABEL: Record<string, string> = {
  project: "Project",
  phase: "Phase",
  gate: "Gate",
  deficiency: "Deficiency",
  photo_evidence: "Photo",
  client_record: "Client",
  subcontractor_contact: "Subcontractor",
  user: "User",
};

const ACTION_COLOR: Record<string, string> = {
  status_changed: "bg-blue-100 text-blue-700 border-blue-200",
  created: "bg-emerald-100 text-emerald-700 border-emerald-200",
  photo_uploaded: "bg-purple-100 text-purple-700 border-purple-200",
  deficiency_opened: "bg-amber-100 text-amber-700 border-amber-200",
  inspection_completed: "bg-teal-100 text-teal-700 border-teal-200",
  create_project: "bg-emerald-100 text-emerald-700 border-emerald-200",
  create_phase: "bg-emerald-100 text-emerald-700 border-emerald-200",
  create_client: "bg-emerald-100 text-emerald-700 border-emerald-200",
  create_deficiency: "bg-amber-100 text-amber-700 border-amber-200",
  pass_gate: "bg-teal-100 text-teal-700 border-teal-200",
  fail_gate: "bg-red-100 text-red-700 border-red-200",
  resolve_deficiency: "bg-teal-100 text-teal-700 border-teal-200",
  upload_photo: "bg-purple-100 text-purple-700 border-purple-200",
  activate_project: "bg-blue-100 text-blue-700 border-blue-200",
  complete_project: "bg-emerald-100 text-emerald-700 border-emerald-200",
  archive_project: "bg-slate-100 text-slate-600 border-slate-200",
};

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

  const [siteCheckTarget, setSiteCheckTarget] = useState<{
    gateId: string;
    phaseId: string;
    phaseLabel: string;
  } | null>(null);
  const [siteBlockTarget, setSiteBlockTarget] = useState<{
    gateId: string;
    phaseId: string;
    phaseLabel: string;
  } | null>(null);
  const [siteUnblockTarget, setSiteUnblockTarget] = useState<{
    gateId: string;
    phaseId: string;
    phaseLabel: string;
  } | null>(null);

  const qc = useQueryClient();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [callInOpen, setCallInOpen] = useState(false);
  const [callInDate, setCallInDate] = useState<Date | undefined>(undefined);
  const [callInSubId, setCallInSubId] = useState<string>("none");
  const [installOpen, setInstallOpen] = useState(false);
  const [installDate, setInstallDate] = useState<Date | undefined>(undefined);
  const [installPhoto, setInstallPhoto] = useState<File | null>(null);
  const [atticSaving, setAtticSaving] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoEvidence | null>(null);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [deficiencyDialogOpen, setDeficiencyDialogOpen] = useState(false);

  const activeDefs = useMemo(
    () => detail?.deficiencies.filter((d) => d.status === "open" || d.status === "in_progress") ?? [],
    [detail],
  );
  const atticGate = useMemo(() => detail?.gates.find((g) => g.type === "attic_check"), [detail]);
  const hasAtticPhoto = useMemo(
    () => detail?.photoEvidence.some((p) => p.purpose === "attic_check" && p.status === "confirmed") ?? false,
    [detail],
  );
  const insulationPhase = useMemo(() => detail?.phases.find((ph) => ph.type === "insulation"), [detail]);
  const insulationClosed = useMemo(() => insulationPhase?.status === "closed", [insulationPhase]);
  const drywallPhase = useMemo(() => detail?.phases.find((ph) => ph.type === "drywall"), [detail]);
  const drywallStarted = useMemo(
    () =>
      drywallPhase?.status === "in_progress" ||
      drywallPhase?.status === "ready_for_inspection" ||
      drywallPhase?.status === "closed",
    [drywallPhase],
  );

  async function saveCallIn() {
    if (!atticGate || !detail || !callInDate) return;
    setAtticSaving(true);
    const res = await updateAtticGate({
      gateId: atticGate.id,
      projectId: detail.project.id,
      callInDate: callInDate.toISOString().split("T")[0],
      callInSubcontractorId: callInSubId === "none" ? undefined : callInSubId,
    });
    setAtticSaving(false);
    if (res.ok) {
      setCallInOpen(false);
      qc.invalidateQueries({ queryKey: ["project", id] });
    }
  }

  async function saveInstall() {
    if (!atticGate || !detail || !installDate || !installPhoto) return;
    setAtticSaving(true);
    const res = await updateAtticGate({
      gateId: atticGate.id,
      projectId: detail.project.id,
      installDate: installDate.toISOString().split("T")[0],
      photo: installPhoto,
    });
    setAtticSaving(false);
    if (res.ok) {
      setInstallOpen(false);
      setInstallPhoto(null);
      qc.invalidateQueries({ queryKey: ["project", id] });
    }
  }

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
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
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
          <div className="flex min-w-0 items-center gap-1 text-sm">
            <Button variant="ghost" size="sm" className="shrink-0 px-2" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Dashboard
            </Button>
            <ChevronRight className="shrink-0 h-3.5 w-3.5 text-muted-foreground" />
            <button
              type="button"
              className="truncate max-w-[120px] sm:max-w-[200px] text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => navigate("/", { state: { clientId: detail.client.id } })}
            >
              {detail.client.name}
            </button>
            <ChevronRight className="shrink-0 h-3.5 w-3.5 text-muted-foreground" />
            <span className="truncate max-w-[120px] sm:max-w-[200px] font-medium text-foreground">{p.name}</span>
          </div>
          <div className="hidden md:flex items-center gap-3 text-sm">
            <span className="font-mono text-xs text-muted-foreground">{p.projectNumber}</span>
            <StatusBadge tone={projectStatusTone(p.status)} label={STATUS_LABEL[p.status]} size="sm" />
            {p.status === "completed" && (
              <Button variant="outline" size="sm" onClick={() => setArchiveOpen(true)}>
                <Archive className="mr-1 h-4 w-4" />
                Archive
              </Button>
            )}
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
              {p.status !== "completed" && p.status !== "archived" && (
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-1 h-4 w-4" />
                  Edit
                </Button>
              )}
              <KpiChip
                label="Last update"
                value={relativeTime(p.updatedAt)}
                tone="not-started"
                icon={<Clock className="h-4 w-4" />}
              />
            </div>
          </div>
        </section>

        {/* Mobile anchor nav */}
        <nav className="md:hidden">
          <div className="flex gap-1 overflow-x-auto border-b border-border pb-1 no-scrollbar snap-x snap-mandatory">
            {[
              { id: "attic-gate", label: "Attic Gate" },
              { id: "deficiencies", label: "Deficiencies" },
              { id: "project-notes", label: "Project Notes" },
              { id: "activity", label: "Activity" },
            ].map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="shrink-0 rounded-md px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground snap-start"
              >
                {item.label}
              </a>
            ))}
          </div>
        </nav>

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
              const phasePhotos = phase ? detail.photoEvidence.filter((p) => p.phaseId === phase.id) : [];
              const health = computePhaseHealth(phase, phaseGates, phaseDefs);
              const c = phaseHealthClasses(health.tone);
              const openCount = phaseDefs.filter((d) => d.status === "open" || d.status === "in_progress").length;

              const cardInner = (
                <Card
                  className={`group relative h-full overflow-hidden border-border bg-gradient-surface p-5 shadow-card transition-all ${phase ? "cursor-pointer hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-glow" : "opacity-70"
                    }`}
                >
                  {/* tone accent strip */}
                  <div className={`absolute inset-x-0 top-0 h-1 ${c.dot}`} />

                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {PHASE_LABEL[type]}
                      </div>
                      {type === "finishing" && p.finishLevel && (
                        <div className="mt-1 text-xs font-medium text-primary">Finish level: {p.finishLevel}</div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>

                  <div className="mt-4">
                    {health.tone === "attention" && phase ? (
                      <button
                        className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          navigate(`/project/${p.id}/phase/${phase.id}?tab=deficiencies`);
                        }}
                      >
                        <PhaseHealthPill health={health} size="lg" className="underline-offset-2 hover:underline" />
                      </button>
                    ) : (
                      <PhaseHealthPill health={health} size="lg" />
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">{health.reason}</p>
                    {phase?.status === "not_started" && (() => {
                      const siteGate = phaseGates.find((g) => g.type === "site_check");
                      return siteGate && siteGate.status === "not_started" ? (
                        <div className="mt-2 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSiteCheckTarget({
                                gateId: siteGate.id,
                                phaseId: phase.id,
                                phaseLabel: PHASE_LABEL[type],
                              });
                            }}
                          >
                            Site Checked
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSiteBlockTarget({
                                gateId: siteGate.id,
                                phaseId: phase.id,
                                phaseLabel: PHASE_LABEL[type],
                              });
                            }}
                          >
                            Site Blocked
                          </Button>
                        </div>
                      ) : null;
                    })()}
                    {phase?.status === "blocked" && (() => {
                      const siteGate = phaseGates.find((g) => g.type === "site_check");
                      return siteGate && siteGate.status === "blocked" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 w-full"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSiteUnblockTarget({
                              gateId: siteGate.id,
                              phaseId: phase.id,
                              phaseLabel: PHASE_LABEL[type],
                            });
                          }}
                        >
                          Site Cleared
                        </Button>
                      ) : null;
                    })()}
                  </div>

                  <div className="mt-4 flex items-center gap-4 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Camera className="h-3.5 w-3.5" />
                      {phasePhotos.length} photos
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
          <Card id="attic-gate" className="border-border bg-card p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Attic Gate</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Camera className={`h-4 w-4 ${hasAtticPhoto ? "text-status-closed" : "text-status-ready"}`} />
                <span>
                  {hasAtticPhoto ? "Photo evidence confirmed" : "Photo evidence not yet uploaded"}
                </span>
              </div>

              {!(insulationClosed && drywallStarted) && (
                <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/20 px-2.5 py-2 text-xs text-muted-foreground">
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  <span>Available after insulation phase is closed and drywall site check is passed</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Call-in date */}
                {insulationClosed && drywallStarted ? (
                  <Popover open={callInOpen} onOpenChange={setCallInOpen}>
                    <PopoverTrigger asChild>
                      <button className="rounded-md border border-border bg-muted/30 p-2.5 text-left transition-colors hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Call-in date</span>
                          <Calendar className="h-3 w-3" />
                        </div>
                        <div className="mt-0.5 font-medium">
                          {atticGate?.callInDate
                            ? new Date(atticGate.callInDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                            : "Select date"}
                        </div>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarPicker
                        mode="single"
                        selected={callInDate}
                        onSelect={setCallInDate}
                        initialFocus
                      />
                      <div className="border-t border-border p-3 space-y-2">
                        {(() => {
                          const insulators = detail?.subcontractors.filter((s) => s.trade === "insulation" && s.active) ?? [];
                          return insulators.length > 0 ? (
                            <div>
                              <p className="mb-1 text-xs text-muted-foreground">Insulator (optional)</p>
                              <Select value={callInSubId} onValueChange={setCallInSubId}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Select insulator" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  {insulators.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                      {s.displayName}{s.companyName ? ` · ${s.companyName}` : ""}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : null;
                        })()}
                        <Button
                          size="sm"
                          className="w-full"
                          disabled={!callInDate || atticSaving}
                          onClick={saveCallIn}
                        >
                          {atticSaving ? "Saving…" : "Save"}
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <div className="rounded-md border border-border bg-muted/30 p-2.5 opacity-50">
                    <div className="text-muted-foreground">Call-in date</div>
                    <div className="mt-0.5 font-medium">{atticGate?.callInDate ? new Date(atticGate.callInDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"}</div>
                  </div>
                )}

                {/* Install date */}
                {insulationClosed && drywallStarted ? (
                  <Popover open={installOpen} onOpenChange={(o) => { setInstallOpen(o); if (!o) setInstallPhoto(null); }}>
                    <PopoverTrigger asChild>
                      <button className="rounded-md border border-border bg-muted/30 p-2.5 text-left transition-colors hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Install date</span>
                          <Calendar className="h-3 w-3" />
                        </div>
                        <div className="mt-0.5 font-medium">
                          {atticGate?.installDate
                            ? new Date(atticGate.installDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                            : "Select date"}
                        </div>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarPicker
                        mode="single"
                        selected={installDate}
                        onSelect={setInstallDate}
                        initialFocus
                      />
                      <div className="border-t border-border p-3 space-y-2">
                        <div>
                          <p className="mb-1 text-xs text-muted-foreground">Photo evidence <span className="text-destructive">*required</span></p>
                          <input
                            ref={photoInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => setInstallPhoto(e.target.files?.[0] ?? null)}
                          />
                          <button
                            type="button"
                            onClick={() => photoInputRef.current?.click()}
                            className="flex w-full items-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/60"
                          >
                            {installPhoto ? (
                              <><CheckCircle2 className="h-3.5 w-3.5 text-status-closed shrink-0" /><span className="truncate">{installPhoto.name}</span></>
                            ) : (
                              <><Upload className="h-3.5 w-3.5 shrink-0" /><span>Upload photo</span></>
                            )}
                          </button>
                        </div>
                        <Button
                          size="sm"
                          className="w-full"
                          disabled={!installDate || !installPhoto || atticSaving}
                          onClick={saveInstall}
                        >
                          {atticSaving ? "Saving…" : "Save"}
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <div className="rounded-md border border-border bg-muted/30 p-2.5 opacity-50">
                    <div className="text-muted-foreground">Install date</div>
                    <div className="mt-0.5 font-medium">{atticGate?.installDate ? new Date(atticGate.installDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"}</div>
                  </div>
                )}
              </div>

              {atticGate?.callInSubcontractorId && (() => {
                const sub = detail?.subcontractors.find((s) => s.id === atticGate.callInSubcontractorId);
                return sub ? (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    <span>{sub.displayName}{sub.companyName ? ` · ${sub.companyName}` : ""}</span>
                  </div>
                ) : null;
              })()}
            </div>
          </Card>

          <Card id="deficiencies" className="border-border bg-card p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Deficiencies</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{activeDefs.length} active</span>
                <Button size="sm" onClick={() => setDeficiencyDialogOpen(true)}>
                  Add Deficiency
                </Button>
              </div>
            </div>
            {activeDefs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active deficiencies.</p>
            ) : (
              <div className="space-y-2">
                {activeDefs.map((d) => {
                  const phase = detail.phases.find((ph) => ph.id === d.phaseId);
                  return (
                    <Link key={d.id} to={`/project/${p.id}/phase/${d.phaseId}?tab=deficiencies`} className="block">
                      <div className="flex items-start justify-between gap-2 rounded-md border border-border bg-muted/20 p-2.5 cursor-pointer hover:bg-muted/30 transition-colors">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{d.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {phase ? PHASE_LABEL[phase.type] : "—"} · {d.severity}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
        </section>

        {/* Attic gate completion warning */}
        {detail && p.status === "active" && atticGate && atticGate.status !== "passed" && detail.phases.every((ph) => ph.status === "closed") && (
          <Alert variant="default" className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertTitle>Attic gate incomplete</AlertTitle>
            <AlertDescription>
              This project cannot be completed until the attic install date and photo evidence have been submitted.
            </AlertDescription>
          </Alert>
        )}

        {/* Project Notes */}
        {detail && (
          <div id="project-notes">
            <ProjectNotes
              projectId={detail.project.id}
              notes={detail.project.notes}
              notesLastEditedBy={detail.project.notesLastEditedBy}
              notesLastEditedAt={detail.project.notesLastEditedAt}
              editorName={detail.assignedProjectManager?.fullName}
            />
          </div>
        )}

        {/* Project Photos */}
        {detail && (
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Project Photos</h3>
            {detail.photoEvidence.filter(p => p.phaseId).length === 0 ? (
              <Card className="border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-card">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <ImageIcon className="h-5 w-5" />
                </div>
                No photos in this project yet
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {detail.photoEvidence.filter(p => p.phaseId).map((photo) => (
                  <ProjectPhotoCard
                    key={photo.id}
                    photo={photo}
                    phases={detail.phases}
                    gates={detail.gates}
                    deficiencies={detail.deficiencies}
                    onOpen={() => {
                      setSelectedPhoto(photo);
                      setPhotoViewerOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Activity */}
        {detail.auditEvents.length > 0 && (
          <section id="activity">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent activity</h3>
            <Card className="border-border bg-card shadow-card">
              <CardContent className="p-5">
                <ol className="space-y-3">
                  {detail.auditEvents.slice(0, 6).map((a) => {
                    const phase = detail.phases.find((ph) => ph.id === a.entityId);
                    const gate = detail.gates.find((g) => g.id === a.entityId);
                    const deficiency = detail.deficiencies.find((d) => d.id === a.entityId);
                    return (
                      <li key={a.id} className="flex items-start gap-3 text-sm">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${ACTION_COLOR[a.action] ?? ""}`}>
                              {a.action.replace(/_/g, " ")}
                            </Badge>
                            {phase && <span className="text-xs text-muted-foreground">{PHASE_LABEL[phase.type] ?? phase.type}</span>}
                            {gate && <span className="text-xs text-muted-foreground">{GATE_LABEL[gate.type] ?? gate.type}</span>}
                            {deficiency && <span className="text-xs text-muted-foreground">{deficiency.title}</span>}
                            {typeof a.previousValue === "string" && typeof a.nextValue === "string" && (
                              <span className="text-xs text-muted-foreground">
                                <span className="font-medium">{a.nextValue.replace(/_/g, " ")}</span>
                              </span>
                            )}
                            {typeof a.metadata?.notes === "string" && (
                              <span className="text-xs text-muted-foreground italic">&ldquo;{a.metadata.notes}&rdquo;</span>
                            )}
                            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-primary/30 bg-primary/15 text-[10px] font-semibold text-primary" title={detail.assignedProjectManager?.fullName ?? "System"}>
                              {initials(detail.assignedProjectManager?.fullName ?? "System")}
                            </div>
                            <span className="ml-auto text-xs text-muted-foreground">{relativeTime(a.createdAt)}</span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </CardContent>
            </Card>
          </section>
        )}
      </main>

      {siteCheckTarget && detail && (
        <SiteCheckDialog
          open={!!siteCheckTarget}
          onOpenChange={(o) => { if (!o) setSiteCheckTarget(null); }}
          gateId={siteCheckTarget.gateId}
          phaseId={siteCheckTarget.phaseId}
          projectId={detail.project.id}
          phaseLabel={siteCheckTarget.phaseLabel}
        />
      )}
      {siteBlockTarget && detail && (
        <SiteBlockDialog
          open={!!siteBlockTarget}
          onOpenChange={(o) => { if (!o) setSiteBlockTarget(null); }}
          gateId={siteBlockTarget.gateId}
          phaseId={siteBlockTarget.phaseId}
          projectId={detail.project.id}
          phaseLabel={siteBlockTarget.phaseLabel}
        />
      )}
      {siteUnblockTarget && detail && (
        <SiteUnblockDialog
          open={!!siteUnblockTarget}
          onOpenChange={(o) => { if (!o) setSiteUnblockTarget(null); }}
          gateId={siteUnblockTarget.gateId}
          phaseId={siteUnblockTarget.phaseId}
          projectId={detail.project.id}
          phaseLabel={siteUnblockTarget.phaseLabel}
        />
      )}
      {detail && (
        <ArchiveProjectDialog
          open={archiveOpen}
          onOpenChange={setArchiveOpen}
          projectId={detail.project.id}
          projectName={detail.project.name}
          onArchived={() => navigate("/")}
        />
      )}
      {detail && (
        <NewProjectDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          project={detail.project}
          currentUser={detail.assignedProjectManager}
          onUpdated={() => qc.invalidateQueries({ queryKey: ["project", id] })}
        />
      )}
      {selectedPhoto && (
        <PhotoViewerDialog
          open={photoViewerOpen}
          onOpenChange={setPhotoViewerOpen}
          photo={selectedPhoto}
        />
      )}
      {detail && (
        <DeficiencyDialog
          open={deficiencyDialogOpen}
          onOpenChange={setDeficiencyDialogOpen}
          projectId={detail.project.id}
          mode="create"
          phases={detail.phases}
        />
      )}
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

const PURPOSE_LABEL: Record<string, string> = {
  site_check: "Site Check",
  inspection: "Inspection",
  attic_check: "Attic Check",
  deficiency_before: "Before",
  deficiency_after: "After",
  general: "General",
};

function ProjectPhotoCard({
  photo,
  phases,
  gates,
  deficiencies,
  onOpen,
}: {
  photo: PhotoEvidence;
  phases: { id: string; type: string }[];
  gates: { id: string; type: string; phaseId?: string }[];
  deficiencies: { id: string; title: string; phaseId: string }[];
  onOpen: () => void;
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

  const phase = phases.find(p => p.id === photo.phaseId);
  const gate = gates.find(g => g.id === photo.gateId);
  const deficiency = deficiencies.find(d => d.id === photo.deficiencyId);

  let referenceLabel = "";
  let referenceLink: string | null = null;

  if (deficiency && phase) {
    referenceLabel = `Deficiency: ${deficiency.title}`;
    referenceLink = `/project/${photo.projectId}/phase/${phase.id}?tab=deficiencies`;
  } else if (gate && phase) {
    referenceLabel = `${GATE_LABEL[gate.type] ?? gate.type} · ${PHASE_LABEL[phase.type]}`;
    referenceLink = `/project/${photo.projectId}/phase/${phase.id}`;
  } else if (phase) {
    referenceLabel = PHASE_LABEL[phase.type];
    referenceLink = `/project/${photo.projectId}/phase/${phase.id}`;
  }

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
        {referenceLink ? (
          <Link
            to={referenceLink}
            className="mt-0.5 truncate text-left text-[10px] text-primary hover:text-primary/80"
          >
            {referenceLabel}
          </Link>
        ) : referenceLabel ? (
          <span className="mt-0.5 truncate text-[10px] text-muted-foreground">
            {referenceLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}
