import { useMemo, useState, useEffect, useRef, type RefObject } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
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
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BadgeTone } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import { InventoryDisplayCard, type InventoryDisplayItem, type InventoryPickupSummaryItem } from "@/components/dashboard/InventoryDisplayCard";
import { PhotoViewerDialog, type PhotoViewerItem } from "@/components/dashboard/PhotoViewerDialog";
import { PhotoUploadDialog } from "@/components/dashboard/PhotoUploadDialog";
import { QuantityStepperModal } from "@/components/dashboard/QuantityStepperModal";
import { DatePicker } from "@/components/ui/date-picker";
import { assignSubcontractorToPhase, createPhaseChecklistItem, deletePhaseChecklistItem, getCurrentUser, getPhase, getPhaseMaterials, getPhotoViewUrl, getProjectInventoryPickups, markPhaseReadyForInspection, updatePhase, updatePhaseChecklistItem, updatePhaseMaterials } from "@/lib/api";
import { formatDateWithOptions } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import type { Deficiency, Gate, InventoryPickup, MaterialLog, PhaseChecklistItem, PhaseStatus, PhotoEvidence } from "@/lib/types";
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
import { PHASE_MATERIAL_CATALOGS } from "@/lib/inventoryCatalog";

const GATE_BADGE_CLASS: Record<StatusTone, string> = {
  "not-started": "bg-status-not-started/15 text-status-not-started",
  "in-progress": "bg-status-in-progress/15 text-status-in-progress",
  ready: "bg-status-ready/15 text-status-ready",
  blocked: "bg-status-blocked/15 text-status-blocked",
  closed: "bg-status-closed/15 text-status-closed",
};

function formatMaterialPickupSummary(pickup: InventoryPickup, itemKeys: Set<string>, labelByKey: Map<string, string>) {
  const parts = pickup.items
    .filter((item) => item.kind === "material" && itemKeys.has(item.itemKey))
    .map((item) => `${labelByKey.get(item.itemKey) ?? item.itemKey} ×${item.quantity}`);
  return parts.length > 0 ? parts.join(", ") : undefined;
}

const EMPTY_PHASE_LOOKUPS = {
  gates: [],
  deficiencies: [],
  photoEvidence: [],
  auditEvents: [],
  subcontractors: [],
  materials: [],
};

export default function PhaseDetailPage() {
  const { projectId, phaseId } = useParams<{ projectId: string; phaseId: string }>();
  const navigate = useNavigate();

  const meQ = useQuery({ queryKey: ["me"], queryFn: getCurrentUser });
  useEffect(() => {
    if (meQ.data?.ok && meQ.data.data.role === "inventory_viewer") navigate("/inventory");
  }, [meQ.data, navigate]);

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

  const materialsQ = useQuery({
    queryKey: ["phase-materials", detail?.phase.id],
    queryFn: () => getPhaseMaterials(detail!.phase.id),
    enabled: !!detail?.phase.id,
  });
  const pickupsQ = useQuery({
    queryKey: ["project-inventory-pickups", detail?.project.id],
    queryFn: () => getProjectInventoryPickups(detail!.project.id),
    enabled: !!detail?.project.id,
  });

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
  const taskChecklistInputRef = useRef<HTMLInputElement | null>(null);
  const [dateValidationError, setDateValidationError] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const [materialsOpen, setMaterialsOpen] = useState(false);
  const [materialDraft, setMaterialDraft] = useState<Record<string, number>>({});
  const [materialSaveError, setMaterialSaveError] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState("");

  const saveMaterialsMutation = useMutation({
    mutationFn: async ({
      phaseId,
      projectId,
      changes,
    }: {
      phaseId: string;
      projectId: string;
      changes: { itemKey: string; quantity: number }[];
    }) => updatePhaseMaterials({ phaseId, projectId, changes }),
    onSuccess: async (result, variables) => {
      if (result.ok === false) {
        setMaterialSaveError(result.error.message);
        return;
      }
      await qc.invalidateQueries({ queryKey: ["phase-materials", variables.phaseId] });
      await qc.invalidateQueries({ queryKey: ["phase", variables.phaseId] });
      setMaterialsOpen(false);
      setMaterialDraft({});
      setMaterialSaveError(null);
    },
  });

  const createChecklistItemMutation = useMutation({
    mutationFn: ({ projectId, phaseId, text }: { projectId: string; phaseId: string; text: string }) =>
      createPhaseChecklistItem({ projectId, phaseId, text }),
    onSuccess: async (result, variables) => {
      if (result.ok === false) return;
      await qc.invalidateQueries({ queryKey: ["phase", variables.phaseId] });
      setNewTaskText("");
    },
  });

  const updateChecklistItemMutation = useMutation({
    mutationFn: ({ itemId, completed }: { itemId: string; completed: boolean; phaseId: string }) =>
      updatePhaseChecklistItem({ itemId, completed }),
    onSuccess: async (result, variables) => {
      if (result.ok === false) return;
      await qc.invalidateQueries({ queryKey: ["phase", variables.phaseId] });
    },
  });

  const deleteChecklistItemMutation = useMutation({
    mutationFn: ({ itemId }: { itemId: string; phaseId: string }) => deletePhaseChecklistItem(itemId),
    onSuccess: async (result, variables) => {
      if (result.ok === false) return;
      await qc.invalidateQueries({ queryKey: ["phase", variables.phaseId] });
    },
  });

  const addTask = () => {
    const trimmed = newTaskText.trim();
    if (!trimmed || !detail) return;
    createChecklistItemMutation.mutate({ projectId: detail.project.id, phaseId: detail.phase.id, text: trimmed });
  };

  const toggleTask = (task: PhaseChecklistItem) => {
    updateChecklistItemMutation.mutate({ itemId: task.id, completed: !task.completed, phaseId: task.phaseId });
  };

  const deleteTask = (task: PhaseChecklistItem) => {
    deleteChecklistItemMutation.mutate({ itemId: task.id, phaseId: task.phaseId });
  };

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
  const photoViewerItems = useMemo<PhotoViewerItem[]>(() => {
    if (!detail) return [];

    return detail.photoEvidence.map((photo) => {
      const gate = detail.gates.find((g) => g.id === photo.gateId);
      const deficiency = detail.deficiencies.find((d) => d.id === photo.deficiencyId);
      const purposeLabel = PURPOSE_LABEL[photo.purpose] ?? photo.purpose;

      if (deficiency) {
        return { photo, caption: `Deficiency: ${deficiency.title}, ${purposeLabel}` };
      }
      if (gate) {
        return { photo, caption: `${GATE_LABEL[gate.type] ?? gate.type} · ${PHASE_LABEL[detail.phase.type]}, ${purposeLabel}` };
      }
      return { photo, caption: `${PHASE_LABEL[detail.phase.type]}, ${purposeLabel}` };
    });
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
            backLabel="Back to Project"
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

  const { phase, project, gates, deficiencies, photoEvidence, auditEvents, subcontractors, checklistItems } = detail;
  const activeDefs = deficiencies.filter((d) => d.status === "open" || d.status === "in_progress");
  const siteGate = gates.find((g) => g.type === "site_check");
  const inspectionGate = gates.find((g) => g.type === "inspection");
  const materialCatalog = PHASE_MATERIAL_CATALOGS[phase.type];
  const materialLogs: MaterialLog[] = materialsQ.data?.ok ? materialsQ.data.data : [];
  const materialLabelByKey = new Map(materialCatalog.map((item) => [item.itemKey, item.label]));
  const materialItemKeys = new Set(materialCatalog.map((item) => item.itemKey));
  const materialQuantityByKey = new Map(materialLogs.map((log) => [log.itemKey, log.quantity]));
  const materialItems: InventoryDisplayItem[] = materialLogs
    .filter((log) => log.quantity > 0)
    .map((log) => ({
      label: materialLabelByKey.get(log.itemKey) ?? log.itemKey,
      quantity: log.quantity,
    }));
  const pickups: InventoryPickup[] = pickupsQ.data?.ok ? pickupsQ.data.data : [];
  const materialPickupSummaries: InventoryPickupSummaryItem[] = pickups
    .map((pickup) => {
      const text = formatMaterialPickupSummary(pickup, materialItemKeys, materialLabelByKey);
      return text ? { id: pickup.id, text } : undefined;
    })
    .filter((item): item is InventoryPickupSummaryItem => Boolean(item))
    .slice(0, 3);
  const materialModalItems = materialCatalog.map((item) => ({
    ...item,
    quantity: materialDraft[item.itemKey] ?? materialQuantityByKey.get(item.itemKey) ?? 0,
  }));
  const openMaterialsModal = () => {
    setMaterialDraft(
      Object.fromEntries(
        materialCatalog.map((item) => [item.itemKey, materialQuantityByKey.get(item.itemKey) ?? 0]),
      ),
    );
    setMaterialSaveError(null);
    setMaterialsOpen(true);
  };
  const saveMaterialDraft = () => {
    const changes = materialCatalog
      .map((item) => ({
        itemKey: item.itemKey,
        quantity: materialDraft[item.itemKey] ?? 0,
        currentQuantity: materialQuantityByKey.get(item.itemKey) ?? 0,
      }))
      .filter((item) => item.quantity !== item.currentQuantity)
      .map(({ itemKey, quantity }) => ({ itemKey, quantity }));

    if (changes.length === 0) {
      setMaterialsOpen(false);
      setMaterialDraft({});
      setMaterialSaveError(null);
      return;
    }

    saveMaterialsMutation.mutate({ phaseId: phase.id, projectId: project.id, changes });
  };
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
    {
      label: "Upload photo",
      icon: <Upload className="h-4 w-4" />,
      helperText: "Add phase or deficiency evidence",
      onClick: () => {
        setActiveTab("photos");
        setPhotoUploadOpen(true);
      },
    },
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
    ...(project.status !== "completed" && project.status !== "archived"
      ? [
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
        ]
      : []),
    {
      label: "Add checklist item",
      icon: <Plus className="h-4 w-4" />,
      helperText: "Add a task to the phase checklist",
      onClick: () => {
        setActiveTab("overview");
        window.setTimeout(() => {
          taskChecklistInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          taskChecklistInputRef.current?.focus();
        }, 0);
      },
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader activeSection="dashboard" />

      <main className="container space-y-5 pb-28 pt-5 md:space-y-6 md:pt-6 lg:py-6">
        <PageNav
          backFallback={`/project/${project.id}`}
          backLabel="Back to Project"
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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
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
                  {formatDateWithOptions(phase.scheduledStart, { showYear: true })} → {formatDateWithOptions(phase.scheduledEnd, { showYear: true })}
                </div>
              </div>
              <div className="mt-4 hidden md:flex md:flex-wrap md:items-center md:gap-x-5 md:gap-y-2 md:text-sm md:text-muted-foreground">
                <span className="font-medium text-foreground">{formatDateWithOptions(phase.scheduledStart, { showYear: true })} → {formatDateWithOptions(phase.scheduledEnd, { showYear: true })}</span>
                <span>Last update: <span className="font-medium text-foreground">{relativeTime(phase.updatedAt)}</span></span>
                <span>Closed: <span className="font-medium text-foreground">{formatDateWithOptions(phase.closedAt, { showYear: true })}</span></span>
                {phase.type === "finishing" && project.finishLevel && (
                  <span>Finish level: <span className="font-medium text-foreground">{project.finishLevel}</span></span>
                )}
              </div>
            </div>

          </div>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="hidden md:grid md:grid-cols-4 md:gap-3">
            <DesktopSummaryButton
              ariaLabel={`Open deficiencies: ${activeDefs.length}`}
              label="Open deficiencies"
              value={String(activeDefs.length)}
              tone={activeDefs.length > 0 ? "danger" : "success"}
              onClick={() => jumpToSection({ tab: "deficiencies" })}
            />
            <DesktopSummaryButton
              ariaLabel={`Photos: ${photoEvidence.length}`}
              label="Photos"
              value={String(photoEvidence.length)}
              tone={photoEvidence.length > 0 ? "accent" : "neutral"}
              onClick={() => jumpToSection({ tab: "photos" })}
            />
            {siteGate ? (
              <DesktopSummaryButton
                ariaLabel={`Site check: ${STATUS_LABEL[siteGate.status]}`}
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
                ariaLabel={`Inspection: ${STATUS_LABEL[inspectionGate.status]}`}
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
            <div className="lg:hidden">
              {gates.length === 0 ? (
                <EmptyCard icon={<ShieldCheck className="h-5 w-5" />} text="No gates configured for this phase yet." />
              ) : (
                <Card data-testid="phase-narrow-gates" className="divide-y divide-border overflow-hidden p-0 shadow-card">
                  {gates.map((g) => {
                    if (g.type === "inspection" && siteGate?.status !== "passed") {
                      return null;
                    }
                    const gatePhotos = photoEvidence.filter((p) => p.gateId === g.id);
                    const hasMobileAction = mobileGateHasAction({
                      gate: g,
                      phaseStatus: phase.status,
                      activeDeficiencyCount: activeDefs.length,
                    });
                    const content = (
                      <>
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          {(g.requiredPhotoEvidence || g.status === "blocked") ? <Camera className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-foreground">{GATE_LABEL[g.type]}</span>
                            {gatePhotos.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => { setSelectedPhoto(gatePhotos[0]); setPhotoViewerOpen(true); }}
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide cursor-pointer hover:opacity-80",
                                  GATE_BADGE_CLASS[gateStatusTone(g.status)],
                                )}
                              >
                                {gatePhotos.length} photo{gatePhotos.length === 1 ? "" : "s"}
                              </button>
                            ) : (
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                  GATE_BADGE_CLASS[gateStatusTone(g.status)],
                                )}
                              >
                                {STATUS_LABEL[g.status]}
                              </span>
                            )}
                          </span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {gatePhotos.length > 0
                              ? "Photo evidence attached"
                              : (g.requiredPhotoEvidence || g.status === "blocked")
                                ? "Photo evidence required"
                                : "No photo required"}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            Updated {relativeTime(g.updatedAt)}
                          </span>
                          {g.notes && <span className="mt-1 block text-xs text-foreground">{g.notes}</span>}
                        </span>
                        {g.type === "site_check" && g.status === "not_started" && (
                          <div className="flex w-full gap-2 pl-[3.25rem] sm:w-auto sm:pl-0">
                            <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => setSiteCheckOpen(true)}>
                              Site Checked
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => setSiteBlockOpen(true)}>
                              Site Blocked
                            </Button>
                          </div>
                        )}
                        {g.type === "site_check" && g.status === "blocked" && (
                          <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => setSiteUnblockOpen(true)}>
                            Site Cleared
                          </Button>
                        )}
                      </>
                    );

                    const inspectionButtons = g.type === "inspection" && showPassedFailed && (
                      <div className="flex w-full gap-2 pl-[3.25rem] sm:w-auto sm:pl-0">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedGateId(g.id);
                            setInspectionResultMode("passed");
                            setInspectionResultOpen(true);
                          }}
                        >
                          Passed
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedGateId(g.id);
                            setInspectionResultMode("failed");
                            setInspectionResultOpen(true);
                          }}
                        >
                          Failed
                        </Button>
                      </div>
                    );

                    const gateRowClass = "flex w-full flex-wrap items-start gap-3 px-4 py-4 text-left transition-colors active:bg-muted/60";
                    const rowHasInlineAction =
                      gatePhotos.length > 0 ||
                      Boolean(inspectionButtons) ||
                      (g.type === "site_check" && (g.status === "not_started" || g.status === "blocked"));

                    return hasMobileAction && !rowHasInlineAction ? (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setMobileActionsOpen(true)}
                        className={gateRowClass}
                      >
                        {content}
                        {inspectionButtons}
                      </button>
                    ) : (
                      <div key={g.id} className={gateRowClass}>
                        {content}
                        {inspectionButtons}
                      </div>
                    );
                  })}
                </Card>
              )}
            </div>

            <div className="hidden gap-4 lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.95fr)]">
              <div className="space-y-4">
                {gates.length === 0 ? (
                  <EmptyCard icon={<ShieldCheck className="h-5 w-5" />} text="No gates configured for this phase yet." />
                ) : (
                  gates.map((g) => {
                    if (g.type === "inspection" && siteGate?.status !== "passed") {
                      return null;
                    }
                    const gatePhotos = photoEvidence.filter((p) => p.gateId === g.id);
                    const tone = gateStatusTone(g.status);
                    const headingRef = g.type === "site_check" ? siteCheckHeadingRef : g.type === "inspection" ? inspectionHeadingRef : undefined;
                    return (
                      <Card key={g.id} className="p-5 shadow-card">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <h2 ref={headingRef} tabIndex={-1} className="font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            {GATE_LABEL[g.type]}
                          </h2>
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
                              {(g.requiredPhotoEvidence || g.status === "blocked") ? "Photo evidence required" : "No photo required"}
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            Updated {relativeTime(g.updatedAt)}
                          </div>
                          {g.notes && <p className="text-foreground">{g.notes}</p>}
                        </div>
                        {g.type === "site_check" && g.status === "not_started" && (
                          <div className="mt-4 flex gap-2">
                            <Button size="sm" variant="outline" className="flex-1" onClick={() => setSiteCheckOpen(true)}>
                              <CheckCircle2 className="mr-1.5 h-4 w-4" /> Site Checked
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1" onClick={() => setSiteBlockOpen(true)}>
                              <AlertTriangle className="mr-1.5 h-4 w-4" /> Site Blocked
                            </Button>
                          </div>
                        )}
                        {g.type === "site_check" && g.status === "blocked" && (
                          <div className="mt-4">
                            <Button size="sm" variant="outline" className="flex-1" onClick={() => setSiteUnblockOpen(true)}>
                              <ShieldCheck className="mr-1.5 h-4 w-4" /> Site Cleared
                            </Button>
                          </div>
                        )}
                        {g.type === "inspection" && showReadyButton && (
                          <div className="mt-4">
                            <Button
                              size="sm"
                              onClick={() => readyMutation.mutate({ phaseId: phase.id, projectId: project.id })}
                              disabled={readyMutation.isPending}
                            >
                              <ShieldCheck className="mr-1.5 h-4 w-4" />
                              {readyMutation.isPending ? "Marking ready…" : "Ready for Inspection"}
                            </Button>
                          </div>
                        )}
                        {g.type === "inspection" && showPassedFailed && (
                          <div className="mt-4 flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => {
                                setSelectedGateId(g.id);
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
                                setSelectedGateId(g.id);
                                setInspectionResultMode("failed");
                                setInspectionResultOpen(true);
                              }}
                            >
                              <XCircle className="mr-1.5 h-4 w-4" /> Mark Failed
                            </Button>
                          </div>
                        )}
                      </Card>
                    );
                  })
                )}
                {activeDefs.length > 0 && (
                  <Card className="p-5 shadow-card">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <SectionHeading as="h2">Open Deficiencies</SectionHeading>
                      <Button size="sm" variant="ghost" onClick={() => setActiveTab("deficiencies")}>
                        View all
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {activeDefs.slice(0, 3).map((d) => (
                        <div
                          key={d.id}
                          onClick={() => {
                            setActiveTab("deficiencies");
                            setHighlightedDeficiencyId(d.id);
                          }}
                          className="flex w-full cursor-pointer items-start justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2 text-left hover:bg-muted/35"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-foreground">{d.title}</div>
                            <div className="mt-0.5 text-xs text-muted-foreground">{STATUS_LABEL[phase.status]}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <SeverityBadge severity={d.severity} size="xs" />
                            {project.status !== "completed" && project.status !== "archived" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeficiencyDialogMode("resolve");
                                  setSelectedDeficiencyId(d.id);
                                  setDeficiencyDialogOpen(true);
                                }}
                              >
                                Resolve
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Task Checklist */}
                <Card className="p-5 shadow-card">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <SectionHeading as="h2">Task Checklist</SectionHeading>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={addTask}
                      disabled={!newTaskText.trim()}
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Add Item
                    </Button>
                  </div>
                  <div className="mb-3 flex gap-2">
                    <Input
                      id="phase-task-input-desktop"
                      name="phaseTaskDesktop"
                      aria-label="Add phase task"
                      value={newTaskText}
                      onChange={(e) => setNewTaskText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTask();
                        }
                      }}
                      placeholder="Add a new task..."
                      className="flex-1"
                    />
                  </div>
                  {checklistItems.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No tasks yet</div>
                  ) : (
                    <div className="space-y-2">
                      {checklistItems.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2"
                        >
                          <Checkbox
                            checked={task.completed}
                            onCheckedChange={() => toggleTask(task)}
                            id={`task-${task.id}`}
                          />
                          <label
                            htmlFor={`task-${task.id}`}
                            className={cn(
                              "flex-1 cursor-pointer text-sm",
                              task.completed && "line-through text-muted-foreground"
                            )}
                          >
                            {task.text}
                          </label>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 shrink-0"
                            aria-label={`Delete ${task.text}`}
                            onClick={() => deleteTask(task)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <InventoryDisplayCard
                  title="Materials"
                  items={materialItems}
                  onManage={openMaterialsModal}
                  layout="grid"
                  emptyText="No materials logged"
                  pickupSummaries={materialPickupSummaries}
                />
              </div>

              <div className="space-y-4">
                <Card className="p-5 shadow-card">
                  <SectionHeading as="h2">Schedule</SectionHeading>
                  <div className="mt-3 space-y-3">
                    <div>
                      <div className="text-xs text-muted-foreground">Scheduled start</div>
                      <DatePicker
                        id="scheduled-start"
                        value={phase.scheduledStart ? new Date(phase.scheduledStart) : undefined}
                        onChange={(date) => {
                          if (date) {
                            const newStart = date.toISOString();
                            if (newStart < project.scheduledStart || (phase.scheduledEnd && newStart > phase.scheduledEnd) || (project.scheduledEnd && newStart > project.scheduledEnd)) {
                              setDateValidationError("Phase start must be on or before project end date.");
                              return;
                            }
                            updatePhaseMutation.mutate({ phaseId: phase.id, scheduledStart: newStart });
                          }
                        }}
                        placeholder="Not set"
                        disabled={updatePhaseMutation.isPending || phase.status === "closed"}
                      />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Scheduled end</div>
                      <DatePicker
                        id="scheduled-end"
                        value={phase.scheduledEnd ? new Date(phase.scheduledEnd) : undefined}
                        onChange={(date) => {
                          if (date) {
                            const newEnd = date.toISOString();
                            if (newEnd > project.scheduledEnd || (phase.scheduledStart && newEnd < phase.scheduledStart) || (project.scheduledStart && newEnd < project.scheduledStart)) {
                              setDateValidationError("Phase end must be on or after project start date.");
                              return;
                            }
                            updatePhaseMutation.mutate({ phaseId: phase.id, scheduledEnd: newEnd });
                          }
                        }}
                        placeholder="Not set"
                        disabled={updatePhaseMutation.isPending || phase.status === "closed"}
                      />
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                    <div>Closed: <span className="font-medium text-foreground">{formatDateWithOptions(phase.closedAt, { showYear: true })}</span></div>
                    <div>Last update: <span className="font-medium text-foreground">{relativeTime(phase.updatedAt)}</span></div>
                  </div>
                </Card>

                <Card className="p-5 shadow-card">
                  <SectionHeading as="h2">Personnel</SectionHeading>
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
                          <SelectTrigger id="phase-subcontractor-select" name="phaseSubcontractor" aria-label="Assign subcontractor" className="mt-1 h-8 border border-input bg-background px-3 py-2 text-base md:text-xs font-medium">
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

            {/* Task Checklist (mobile) */}
            <Card data-testid="phase-narrow-task-checklist" className="border-border bg-card p-0 shadow-card lg:hidden">
              <div className="p-4 pb-2">
                <SectionHeading as="h2" size="sm">Task Checklist</SectionHeading>
              </div>
              <div className="px-4 pb-4">
                <div className="mb-3 flex gap-2">
                  <Input
                    ref={taskChecklistInputRef}
                    id="phase-task-input-mobile"
                    name="phaseTaskMobile"
                    aria-label="Add phase task"
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTask();
                      }
                    }}
                    placeholder="Add a new task..."
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addTask}
                    disabled={!newTaskText.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {checklistItems.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No tasks yet</div>
                ) : (
                  <div className="space-y-2">
                    {checklistItems.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2"
                      >
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={() => toggleTask(task)}
                          id={`mobile-task-${task.id}`}
                        />
                        <label
                          htmlFor={`mobile-task-${task.id}`}
                          className={cn(
                            "flex-1 cursor-pointer text-sm",
                            task.completed && "line-through text-muted-foreground"
                          )}
                        >
                          {task.text}
                        </label>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0"
                          aria-label={`Delete ${task.text}`}
                          onClick={() => deleteTask(task)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <Card data-testid="phase-narrow-personnel" className="border-border bg-card p-0 shadow-card lg:hidden md:p-5">
              <div className="p-4 pb-2 md:p-0">
                <SectionHeading as="h2" size="sm">Personnel</SectionHeading>
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
                      <SelectTrigger id="phase-subcontractor-select-mobile" name="phaseSubcontractorMobile" aria-label="Assign subcontractor" className="mt-0.5 h-auto border-0 bg-transparent p-0 text-base md:text-xs font-semibold shadow-none ring-offset-0 focus:ring-0 focus:ring-offset-0 md:h-7 md:border md:border-input md:bg-background md:px-3 md:py-2 md:font-normal md:focus:ring-2 md:focus:ring-ring md:focus:ring-offset-2">
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

            <div className="lg:hidden">
              <InventoryDisplayCard
                title="Materials"
                items={materialItems}
                onManage={openMaterialsModal}
                layout="grid"
                emptyText="No materials logged"
                pickupSummaries={materialPickupSummaries}
              />
            </div>

            {/* Activity (mobile only — desktop has its own tab) */}
            <section className="md:hidden">
              <SectionHeading as="h2" className="mb-3">Activity</SectionHeading>
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
            {project.status !== "completed" && project.status !== "archived" && (
              <div className="mb-4 flex justify-end">
                <Button size="sm" onClick={() => { setDeficiencyDialogMode("create"); setSelectedDeficiencyId(null); setDeficiencyDialogOpen(true); }}>
                  Add Deficiency
                </Button>
              </div>
            )}
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

      <button
        type="button"
        aria-label="Phase actions"
        className="fixed right-4 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow transition active:scale-95 bottom-[max(1rem,env(safe-area-inset-bottom))] lg:hidden"
        onClick={() => setMobileActionsOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </button>
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
      {detail && (
        <QuantityStepperModal
          open={materialsOpen}
          onOpenChange={(open) => {
            setMaterialsOpen(open);
            if (!open) {
              setMaterialDraft({});
              setMaterialSaveError(null);
            }
          }}
          title="Manage Materials"
          description={materialSaveError ?? `Update ${PHASE_LABEL[phase.type].toLowerCase()} material quantities.`}
          items={materialModalItems}
          onQuantityChange={(itemKey, quantity) => {
            setMaterialDraft((current) => ({ ...current, [itemKey]: quantity }));
            setMaterialSaveError(null);
          }}
          confirmLabel="Save"
          onConfirm={saveMaterialDraft}
          isConfirming={saveMaterialsMutation.isPending}
        />
      )}
      <PhotoViewerDialog
        open={photoViewerOpen}
        onOpenChange={setPhotoViewerOpen}
        items={photoViewerItems}
        initialPhotoId={selectedPhoto?.id ?? null}
      />
      {detail && (
        <PhotoUploadDialog
          open={photoUploadOpen}
          onOpenChange={setPhotoUploadOpen}
          phases={[phase]}
          defaultPhaseId={phase.id}
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
