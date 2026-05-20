import { useMemo, useRef, useState, useEffect } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
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
  ChevronDown,
  Plus,
  MoreVertical,
  ShieldCheck,
  Download,
} from "lucide-react";
import { formatAddressShort } from "@/lib/address";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MobileActionSheet, type MobileActionItem } from "@/components/ui/mobile-action-sheet";
import { EmptyInline } from "@/components/ui/empty-inline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { IconWell } from "@/components/ui/icon-well";
import { SectionHeading } from "@/components/ui/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { PageNav } from "@/components/dashboard/PageNav";
import { Fab } from "@/components/ui/fab";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { PhaseHealthPill } from "@/components/dashboard/PhaseHealthPill";
import { SiteCheckDialog } from "@/components/dashboard/SiteCheckDialog";
import { SiteBlockDialog } from "@/components/dashboard/SiteBlockDialog";
import { SiteUnblockDialog } from "@/components/dashboard/SiteUnblockDialog";
import { InspectionResultDialog } from "@/components/dashboard/InspectionResultDialog";
import { ArchiveProjectDialog } from "@/components/dashboard/ArchiveProjectDialog";
import { NewProjectDialog } from "@/components/dashboard/NewProjectDialog";
import { ProjectNotes } from "@/components/dashboard/ProjectNotes";
import { ProjectScheduleTimeline } from "@/components/dashboard/ProjectScheduleTimeline";
import { PhotoViewerDialog, type PhotoViewerItem } from "@/components/dashboard/PhotoViewerDialog";
import { DeficiencyDialog } from "@/components/dashboard/DeficiencyDialog";
import { PhotoUploadDialog } from "@/components/dashboard/PhotoUploadDialog";
import { InventoryDisplayCard, type InventoryDisplayItem, type InventoryPickupSummaryItem } from "@/components/dashboard/InventoryDisplayCard";
import { QuantityStepperModal } from "@/components/dashboard/QuantityStepperModal";
import { useShortcutActions } from "@/components/dashboard/ShortcutActionsContext";
import { getCurrentUser, getProject, getProjectEquipment, getPhaseMaterials, getPhase, getProjectInventoryPickups, updateProjectEquipmentBatch, updateAtticGate, getPhotoViewUrl, updatePhaseSchedules } from "@/lib/api";
import { exportProjectZip } from "@/lib/projectExport";
import { formatDateWithOptions, type PhaseScheduleChange } from "@/lib/schedule";
import type { EquipmentLog, Gate, InventoryPickup, MaterialLog, Phase, PhaseChecklistItem, PhotoEvidence, ProjectDetail as ProjectDetailData } from "@/lib/types";
import { EQUIPMENT_ITEMS, PHASE_MATERIAL_CATALOGS } from "@/lib/inventoryCatalog";
import {
  PHASE_LABEL,
  PHASE_ORDER,
  STATUS_LABEL,
  computePhaseHealth,
  gateStatusTone,
  GATE_LABEL,
  initials,
  projectStatusTone,
  relativeTime,
  type PhaseHealthTone,
} from "@/lib/derived";
import { ActionBadge } from "@/components/ui/action-badge";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { useToast } from "@/hooks/use-toast";

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

const PHASE_CARD_ACCENT: Record<PhaseHealthTone, { rail: string; ring: string; footer: string; chevron: string }> = {
  blocked: {
    rail: "bg-status-blocked",
    ring: "ring-status-blocked/25",
    footer: "border-status-blocked/20 bg-status-blocked/5",
    chevron: "text-status-blocked",
  },
  attention: {
    rail: "bg-status-attention",
    ring: "ring-status-attention/25",
    footer: "border-status-attention/20 bg-status-attention/5",
    chevron: "text-status-attention",
  },
  "in-progress": {
    rail: "bg-status-in-progress",
    ring: "ring-status-in-progress/25",
    footer: "border-status-in-progress/20 bg-status-in-progress/5",
    chevron: "text-status-in-progress",
  },
  ready: {
    rail: "bg-status-ready",
    ring: "ring-status-ready/25",
    footer: "border-status-ready/20 bg-status-ready/5",
    chevron: "text-status-ready",
  },
  closed: {
    rail: "bg-status-closed",
    ring: "ring-status-closed/25",
    footer: "border-status-closed/20 bg-status-closed/5",
    chevron: "text-status-closed",
  },
  "not-started": {
    rail: "bg-status-not-started",
    ring: "ring-status-not-started/15",
    footer: "border-border/70 bg-muted/10",
    chevron: "text-muted-foreground",
  },
};

function formatEquipmentPickupSummary(pickup: InventoryPickup, labelByKey: Map<string, string>) {
  const parts = pickup.items
    .filter((item) => item.kind === "equipment")
    .map((item) => `${labelByKey.get(item.itemKey) ?? item.itemKey} ×${item.quantity}`);
  return parts.length > 0 ? parts.join(", ") : undefined;
}

type ProjectViewMode = "summary" | "detailed";
type ProjectMobileTab = "overview" | "deficiencies" | "notes" | "photos" | "activity";

function isProjectMobileTab(value: unknown): value is ProjectMobileTab {
  return value === "overview"
    || value === "deficiencies"
    || value === "notes"
    || value === "photos"
    || value === "activity";
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const meQ = useQuery({ queryKey: ["me"], queryFn: getCurrentUser });
  const [isEditingEnabled, setIsEditingEnabled] = useState(false);
  const me = meQ.data?.ok ? meQ.data.data : undefined;
  const isAdmin = me?.role === "admin";
  const [viewMode, setViewMode] = useState<ProjectViewMode>("detailed");
  const [defaultedViewUserId, setDefaultedViewUserId] = useState<string | undefined>();
  const canEdit = isAdmin ? isEditingEnabled : true;
  const { registerEditAction } = useShortcutActions();

  useEffect(() => {
    if (meQ.data?.ok && meQ.data.data.role === "inventory_viewer") navigate("/inventory");
  }, [meQ.data, navigate]);
  useEffect(() => {
    if (!me || defaultedViewUserId === me.id) return;
    setDefaultedViewUserId(me.id);
    setViewMode(me.role === "admin" ? "summary" : "detailed");
    setIsEditingEnabled(false);
  }, [defaultedViewUserId, me]);
  const projectQ = useQuery({
    queryKey: ["project", id],
    queryFn: () => getProject(id!),
    enabled: !!id,
  });

  const detail = projectQ.data?.ok ? projectQ.data.data : undefined;
  const error = projectQ.data?.ok === false ? projectQ.data.error : undefined;

  const equipmentQ = useQuery({
    queryKey: ["project-equipment", detail?.project.id],
    queryFn: () => getProjectEquipment(detail!.project.id),
    enabled: !!detail?.project.id,
  });
  const pickupsQ = useQuery({
    queryKey: ["project-inventory-pickups", detail?.project.id],
    queryFn: () => getProjectInventoryPickups(detail!.project.id),
    enabled: !!detail?.project.id,
  });
  const materialSummaryQ = useQuery({
    queryKey: ["project-materials", detail?.project.id],
    queryFn: async () => {
      const results = await Promise.all(detail!.phases.map((phase) => getPhaseMaterials(phase.id)));
      const failed = results.find((result) => result.ok === false);
      if (failed?.ok === false) throw new Error(failed.error.message);
      return results.flatMap((result) => (result.ok ? result.data : []));
    },
    enabled: !!detail?.project.id && isAdmin && viewMode === "summary",
  });

  useEffect(() => {
    if (canEdit && detail?.project.status !== "archived" && detail?.project.status !== "completed") {
      registerEditAction(() => setEditOpen(true));
    } else {
      registerEditAction(null);
    }

    return () => {
      registerEditAction(null);
    };
  }, [canEdit, detail?.project.status, registerEditAction]);

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
  const [inspectionTarget, setInspectionTarget] = useState<{
    gateId: string;
    phaseId: string;
    phaseLabel: string;
  } | null>(null);
  const [inspectionMode, setInspectionMode] = useState<"passed" | "failed">("passed");

  const qc = useQueryClient();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [equipmentOpen, setEquipmentOpen] = useState(false);
  const [equipmentDraft, setEquipmentDraft] = useState<Record<string, number>>({});
  const [equipmentSaveError, setEquipmentSaveError] = useState<string | null>(null);
  const scheduleMutation = useMutation({
    mutationFn: (changes: PhaseScheduleChange[]) => updatePhaseSchedules({ projectId: id!, changes }),
    onSuccess: (res) => {
      if (!res.ok) {
        setScheduleError(res.error.message);
        return;
      }
      setScheduleError(null);
      qc.invalidateQueries({ queryKey: ["project", id] });
      qc.invalidateQueries({ queryKey: ["phases"] });
    },
  });
  const saveEquipmentMutation = useMutation({
    mutationFn: async ({
      projectId,
      changes,
    }: {
      projectId: string;
      changes: { itemKey: string; quantity: number }[];
    }) => updateProjectEquipmentBatch({ projectId, changes }),
    onSuccess: async (result, variables) => {
      if (result.ok === false) {
        setEquipmentSaveError(result.error.message);
        return;
      }
      await qc.invalidateQueries({ queryKey: ["project-equipment", variables.projectId] });
      await qc.invalidateQueries({ queryKey: ["project", variables.projectId] });
      setEquipmentOpen(false);
      setEquipmentDraft({});
      setEquipmentSaveError(null);
    },
  });

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
  const [photoUploadOpen, setPhotoUploadOpen] = useState(false);
  const [deficiencyDialogOpen, setDeficiencyDialogOpen] = useState(false);
  const [deficiencyDialogMode, setDeficiencyDialogMode] = useState<"create" | "resolve">("create");
  const [selectedDeficiencyId, setSelectedDeficiencyId] = useState<string | null>(null);
  const [phaseDeficiencyTarget, setPhaseDeficiencyTarget] = useState<Phase | null>(null);
  const [phasePhotoTarget, setPhasePhotoTarget] = useState<Phase | null>(null);
  async function handleExport() {
    if (!detail) return;
    setExporting(true);
    try {
      const [equipmentResult, pickupsResult, materialResults, phaseDetailResults] = await Promise.all([
        getProjectEquipment(detail.project.id),
        getProjectInventoryPickups(detail.project.id),
        Promise.all(detail.phases.map((phase) => getPhaseMaterials(phase.id))),
        Promise.all(detail.phases.map((phase) => getPhase(phase.id))),
      ]);
      const failedMaterialResult = materialResults.find((result) => result.ok === false);
      if (failedMaterialResult?.ok === false) {
        toast({
          title: "Export failed",
          description: failedMaterialResult.error.message,
          variant: "destructive",
        });
        return;
      }
      if (equipmentResult.ok === false) {
        toast({
          title: "Export failed",
          description: equipmentResult.error.message,
          variant: "destructive",
        });
        return;
      }
      if (pickupsResult.ok === false) {
        toast({
          title: "Export failed",
          description: pickupsResult.error.message,
          variant: "destructive",
        });
        return;
      }
      const materialLogs: MaterialLog[] = materialResults.flatMap((result) => (result.ok ? result.data : []));
      const checklistItems: PhaseChecklistItem[] = phaseDetailResults.flatMap((result) => (result.ok ? result.data.checklistItems : []));
      await exportProjectZip(detail, detail.client, detail.assignedProjectManager, {
        equipmentLogs: equipmentResult.data,
        inventoryPickups: pickupsResult.data,
        materialLogs,
        checklistItems,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Unable to create the project export.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  }

  const [mobileInfoOpen, setMobileInfoOpen] = useState(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const [phaseActionsTarget, setPhaseActionsTarget] = useState<Phase | null>(null);
  const [mobileTab, setMobileTab] = useState<ProjectMobileTab>("overview");

  useEffect(() => {
    const initialMobileTab = (location.state as { initialMobileTab?: unknown } | null)?.initialMobileTab;
    if (!isProjectMobileTab(initialMobileTab)) return;
    setMobileTab(initialMobileTab);
    window.history.replaceState({}, "");
  }, [location.state]);

  const activeDefs = useMemo(
    () => detail?.deficiencies.filter((d) => d.status === "open" || d.status === "in_progress") ?? [],
    [detail],
  );
  const atticGate = useMemo(() => detail?.gates.find((g) => g.type === "attic_check"), [detail]);
  const atticSubcontractor = useMemo(
    () =>
      atticGate?.callInSubcontractorId
        ? detail?.subcontractors.find((subcontractor) => subcontractor.id === atticGate.callInSubcontractorId)
        : undefined,
    [atticGate, detail],
  );
  const hasAtticPhoto = useMemo(
    () => detail?.photoEvidence.some((p) => p.purpose === "attic_check" && p.status === "confirmed") ?? false,
    [detail],
  );
  const projectPhotos = useMemo(
    () => detail?.photoEvidence ?? [],
    [detail],
  );
  const allPhotoViewerItems = useMemo<PhotoViewerItem[]>(() => {
    if (!detail) return [];

    return detail.photoEvidence.map((photo) => {
      const phase = detail.phases.find((p) => p.id === photo.phaseId);
      const gate = detail.gates.find((g) => g.id === photo.gateId);
      const deficiency = detail.deficiencies.find((d) => d.id === photo.deficiencyId);
      const purposeLabel = PURPOSE_LABEL[photo.purpose] ?? photo.purpose;

      if (deficiency && phase) {
        return { photo, caption: `Deficiency: ${deficiency.title}, ${purposeLabel}` };
      }
      if (gate && phase) {
        return { photo, caption: `${GATE_LABEL[gate.type] ?? gate.type} · ${PHASE_LABEL[phase.type]}, ${purposeLabel}` };
      }
      if (gate) {
        return { photo, caption: `${GATE_LABEL[gate.type] ?? gate.type}, ${purposeLabel}` };
      }
      if (phase) {
        return { photo, caption: `${PHASE_LABEL[phase.type]}, ${purposeLabel}` };
      }
      return { photo, caption: purposeLabel };
    });
  }, [detail]);
  const photoViewerItems = useMemo<PhotoViewerItem[]>(() => {
    if (!detail) return [];

    return projectPhotos.map((photo) => {
      const phase = detail.phases.find((p) => p.id === photo.phaseId);
      const gate = detail.gates.find((g) => g.id === photo.gateId);
      const deficiency = detail.deficiencies.find((d) => d.id === photo.deficiencyId);
      const purposeLabel = PURPOSE_LABEL[photo.purpose] ?? photo.purpose;

      if (deficiency && phase) {
        return { photo, caption: `Deficiency: ${deficiency.title}, ${purposeLabel}` };
      }
      if (gate && phase) {
        return { photo, caption: `${GATE_LABEL[gate.type] ?? gate.type} · ${PHASE_LABEL[phase.type]}, ${purposeLabel}` };
      }
      if (gate) {
        return { photo, caption: `${GATE_LABEL[gate.type] ?? gate.type}, ${purposeLabel}` };
      }
      if (phase) {
        return { photo, caption: `${PHASE_LABEL[phase.type]}, ${purposeLabel}` };
      }
      return { photo, caption: purposeLabel };
    });
  }, [detail, projectPhotos]);
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
  const activePhase = useMemo(() => detail?.phases.find((ph) => ph.status === "in_progress"), [detail]);

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
        <AppHeader activeSection="dashboard" />
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
        <AppHeader activeSection="dashboard" />
        <main className="container py-6">
          <PageNav
            backFallback="/"
            backLabel="Back to Projects"
            items={[{ label: "All Projects", to: "/", state: { view: "dashboard" } }, { label: "Project" }]}
            className="mb-4"
          />
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
  const equipmentLogs: EquipmentLog[] = equipmentQ.data?.ok ? equipmentQ.data.data : [];
  const equipmentLabelByKey = new Map(EQUIPMENT_ITEMS.map((item) => [item.itemKey, item.label]));
  const equipmentQuantityByKey = new Map(equipmentLogs.map((log) => [log.itemKey, log.quantity]));
  const equipmentItems: InventoryDisplayItem[] = equipmentLogs
    .filter((log) => log.quantity > 0)
    .map((log) => ({
      label: equipmentLabelByKey.get(log.itemKey) ?? log.itemKey,
      quantity: log.quantity,
    }));
  const pickups: InventoryPickup[] = pickupsQ.data?.ok ? pickupsQ.data.data : [];
  const equipmentPickupSummaries: InventoryPickupSummaryItem[] = pickups
    .map((pickup) => {
      const text = formatEquipmentPickupSummary(pickup, equipmentLabelByKey);
      return text ? { id: pickup.id, text } : undefined;
    })
    .filter((item): item is InventoryPickupSummaryItem => Boolean(item))
    .slice(0, 3);
  const equipmentModalItems = EQUIPMENT_ITEMS.map((item) => ({
    ...item,
    quantity: equipmentDraft[item.itemKey] ?? equipmentQuantityByKey.get(item.itemKey) ?? 0,
  }));
  const openEquipmentModal = () => {
    setEquipmentDraft(
      Object.fromEntries(
        EQUIPMENT_ITEMS.map((item) => [item.itemKey, equipmentQuantityByKey.get(item.itemKey) ?? 0]),
      ),
    );
    setEquipmentSaveError(null);
    setEquipmentOpen(true);
  };
  const saveEquipmentDraft = () => {
    const changes = EQUIPMENT_ITEMS
      .map((item) => ({
        itemKey: item.itemKey,
        quantity: equipmentDraft[item.itemKey] ?? 0,
        currentQuantity: equipmentQuantityByKey.get(item.itemKey) ?? 0,
      }))
      .filter((item) => item.quantity !== item.currentQuantity)
      .map(({ itemKey, quantity }) => ({ itemKey, quantity }));

    if (changes.length === 0) {
      setEquipmentOpen(false);
      setEquipmentDraft({});
      setEquipmentSaveError(null);
      return;
    }

    saveEquipmentMutation.mutate({ projectId: p.id, changes });
  };
  const phaseActionGates = phaseActionsTarget
    ? detail.gates.filter((g) => g.phaseId === phaseActionsTarget.id)
    : [];
  const phaseActionSiteGate = phaseActionGates.find((g) => g.type === "site_check");
  const phaseActions: MobileActionItem[] = phaseActionsTarget
    ? buildProjectPhaseActions({
        phase: phaseActionsTarget,
        siteGate: phaseActionSiteGate,
        projectId: p.id,
        navigate,
        setSiteCheckTarget,
        setSiteBlockTarget,
        setSiteUnblockTarget,
        setPhaseDeficiencyTarget,
        setDeficiencyDialogOpen,
        setPhasePhotoTarget,
        canEdit,
      })
    : [];
  const projectMobileActions: MobileActionItem[] = [
    ...(p.status !== "completed" && p.status !== "archived" && canEdit
      ? [
          {
            label: "Upload photo",
            icon: <Camera className="h-4 w-4" />,
            helperText: "Add photo evidence to this project",
            onClick: () => {
              setMobileTab("photos");
              setPhotoUploadOpen(true);
            },
          },
          {
            label: "Add deficiency",
            icon: <Plus className="h-4 w-4" />,
            helperText: "Log an issue against this project",
            onClick: () => setDeficiencyDialogOpen(true),
          },
          {
            label: "Edit project",
            icon: <Pencil className="h-4 w-4" />,
            helperText: "Update project details",
            onClick: () => setEditOpen(true),
          },
        ]
      : []),
    {
      label: "Deficiencies",
      icon: <AlertTriangle className="h-4 w-4" />,
      helperText: "Jump to active project issues",
      onClick: () => setMobileTab("deficiencies"),
    },
    {
      label: "Photos",
      icon: <ImageIcon className="h-4 w-4" />,
      helperText: "Review project photo evidence",
      onClick: () => setMobileTab("photos"),
    },
    {
      label: "Activity",
      icon: <Clock className="h-4 w-4" />,
      helperText: "Review recent project changes",
      onClick: () => setMobileTab("activity"),
    },
    ...(p.status === "completed" && canEdit
      ? [
          {
            label: "Archive project",
            icon: <Archive className="h-4 w-4" />,
            helperText: "Move completed work out of active views",
            onClick: () => setArchiveOpen(true),
          },
        ]
      : []),
    ...(p.status === "archived"
      ? [
          {
            label: "Export project",
            icon: <Download className="h-4 w-4" />,
            helperText: "Download the archived project package",
            onClick: handleExport,
          },
        ]
      : []),
  ];

  if (isAdmin && viewMode === "summary") {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader activeSection="dashboard" />
        <main className="container space-y-6 py-6">
          <PageNav
            backFallback="/"
            backLabel="Back to Projects"
            items={[
              { label: "All Projects", to: "/", state: { view: "dashboard" } },
              { label: detail.client.name, to: "/", state: { clientId: detail.client.id } },
              { label: p.name },
            ]}
          />
          <AdminProjectSummary
            detail={detail}
            equipmentItems={equipmentItems}
            materialLogs={materialSummaryQ.data ?? []}
            materialsLoading={materialSummaryQ.isLoading}
            materialsError={materialSummaryQ.error instanceof Error ? materialSummaryQ.error.message : undefined}
            onOpenPhoto={(photo) => {
              setSelectedPhoto(photo);
              setPhotoViewerOpen(true);
            }}
            onExport={handleExport}
            exporting={exporting}
            onViewDetails={() => setViewMode("detailed")}
          />
        </main>
        {selectedPhoto && (
          <PhotoViewerDialog
            open={photoViewerOpen}
            onOpenChange={setPhotoViewerOpen}
            items={allPhotoViewerItems}
            initialPhotoId={selectedPhoto.id}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader activeSection="dashboard" />

      <main className="container space-y-4 py-3 sm:space-y-8 sm:py-6">
        <PageNav
          backFallback="/"
          backLabel="Back to Projects"
          items={[
            { label: "All Projects", to: "/", state: { view: "dashboard" } },
            { label: detail.client.name, to: "/", state: { clientId: detail.client.id } },
            { label: p.name },
          ]}
        />


        {/* Compact mobile header */}
        <section className="md:hidden -mx-3 border-b border-border bg-card px-3 py-3">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-base font-semibold">{p.name}</h1>
                <StatusBadge tone={projectStatusTone(p.status)} label={STATUS_LABEL[p.status]} size="sm" />
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {detail.client.name}
                {detail.assignedProjectManager ? ` · ${initials(detail.assignedProjectManager.fullName)}` : ""}
                {p.siteAddress ? ` · ${formatAddressShort(p.siteAddress)}` : ""}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span>
                  <span className="font-medium text-foreground/80">Start</span>{" "}
                  {formatDateWithOptions(p.scheduledStart ?? "")}
                </span>
                <span>
                  <span className="font-medium text-foreground/80">End</span>{" "}
                  {formatDateWithOptions(p.scheduledEnd ?? "")}
                </span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                aria-label="Toggle info"
                onClick={() => setMobileInfoOpen((v) => !v)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border text-muted-foreground"
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${mobileInfoOpen ? "rotate-180" : ""}`} />
              </button>
              <button
                type="button"
                aria-label="Open project actions"
                onClick={() => setMobileActionsOpen(true)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border text-muted-foreground"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          </div>
          {mobileInfoOpen && (
            <div className="mt-2 space-y-1 border-t border-border pt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{formatAddressShort(p.siteAddress)}</div>
              {detail.assignedProjectManager && (
                <div className="flex items-center gap-1.5"><User className="h-3 w-3" />{detail.assignedProjectManager.fullName}</div>
              )}
              <div className="flex items-center gap-1.5"><Clock className="h-3 w-3" />Updated {relativeTime(p.updatedAt)}</div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                <span>Start {formatDateWithOptions(p.scheduledStart ?? "")}</span>
                <span>End {formatDateWithOptions(p.scheduledEnd ?? "")}</span>
              </div>
              {p.finishLevel && <div>Finish level: {p.finishLevel}</div>}
            </div>
          )}
        </section>

        {/* Mobile sticky tab bar */}
        <nav className="md:hidden sticky top-16 z-10 -mx-3 border-b border-border bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex gap-1 overflow-x-auto py-1.5 scrollbar-hide">
            {([
              { id: "overview", label: "Overview" },
              { id: "deficiencies", label: "Deficiencies" },
              { id: "notes", label: "Notes" },
              { id: "photos", label: "Photos" },
              { id: "activity", label: "Activity" },
            ] as const).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setMobileTab(item.id)}
                className={`min-h-11 shrink-0 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  mobileTab === item.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Hero / project header (desktop) */}
        <Card surface="panel" className="hidden rounded-xl p-6 md:block">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold sm:text-3xl">{p.name}</h1>
                <StatusBadge tone={projectStatusTone(p.status)} label={STATUS_LABEL[p.status]} size="sm" />
                <span className="text-xs text-muted-foreground">Last update: {relativeTime(p.updatedAt)}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  {detail.client.name}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {formatAddressShort(p.siteAddress)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>
                    <span className="font-medium text-foreground/80">Start</span>{" "}
                    {formatDateWithOptions(p.scheduledStart ?? "")}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>
                    <span className="font-medium text-foreground/80">End</span>{" "}
                    {formatDateWithOptions(p.scheduledEnd ?? "")}
                  </span>
                </span>
              </div>

              {detail.assignedProjectManager && (
                <div className="mt-4 flex items-center gap-2.5">
                  <IconWell tone="primary" size="md" shape="pill" className="text-xs font-semibold">
                    {initials(detail.assignedProjectManager.fullName)}
                  </IconWell>
                  <div className="text-sm">
                    <div className="font-medium">{detail.assignedProjectManager.fullName}</div>
                    <div className="text-xs text-muted-foreground">Project manager</div>
                  </div>
                </div>
              )}
            </div>

            {/* KPI chips */}
            <div className="flex flex-wrap gap-3 lg:flex-col lg:items-end">
              {isAdmin && (
                <Button variant={canEdit ? "default" : "outline"} size="sm" onClick={() => setIsEditingEnabled((current) => !current)}>
                  {canEdit ? "Editing Enabled" : "Enable Editing"}
                </Button>
              )}
              {p.status !== "completed" && p.status !== "archived" && (
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} disabled={!canEdit}>
                  <Pencil className="mr-1 h-4 w-4" />
                  Edit Project
                </Button>
              )}
              {p.status === "completed" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="default" size="sm" onClick={() => setArchiveOpen(true)} disabled={!canEdit}>
                      <Archive className="mr-1 h-4 w-4" />
                      Archive
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>This project will be moved out of active views. This action cannot be undone.</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {p.status === "archived" && (
                <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
                  <Download className="mr-1 h-4 w-4" />
                  {exporting ? "Exporting…" : "Export"}
                </Button>
              )}
            </div>
          </div>
        </Card>

        <ProjectScheduleTimeline
          project={p}
          phases={detail.phases}
          gates={detail.gates}
          deficiencies={detail.deficiencies}
          saving={scheduleMutation.isPending}
          errorMessage={scheduleError}
          onScheduleChange={(changes) => scheduleMutation.mutate(changes)}
          canEdit={canEdit}
        />

        {/* Phases */}
        <section className={mobileTab === "overview" ? "" : "hidden md:block"}>
          <div className="mb-3 flex items-baseline justify-between">
            <SectionHeading as="h2">Phases</SectionHeading>
            <span className="text-xs text-muted-foreground">{detail.phases.length} active work areas</span>
          </div>
          <div className="space-y-2.5 sm:space-y-3">
            {PHASE_ORDER.map((type) => {
                const phase = detail.phases.find((ph) => ph.type === type);
                const phaseGates = phase ? detail.gates.filter((g) => g.phaseId === phase.id) : [];
                const phaseDefs = phase ? detail.deficiencies.filter((d) => d.phaseId === phase.id) : [];
                const health = computePhaseHealth(phase, phaseGates, phaseDefs);
                const accent = PHASE_CARD_ACCENT[health.tone];
                const openCount = phaseDefs.filter((d) => d.status === "open" || d.status === "in_progress").length;
                const siteGate = phase ? phaseGates.find((g) => g.type === "site_check") : undefined;
                const inspectionGate = phase ? phaseGates.find((g) => g.type === "inspection") : undefined;
                const hasSiteActions = !!(phase && siteGate && (siteGate.status === "not_started" || siteGate.status === "blocked"));
                const hasInspectionActions = !!(phase && phase.status === "ready_for_inspection" && inspectionGate && openCount === 0);

                const phaseSummary = (
                  <div className="relative flex min-h-[92px] flex-col gap-2.5 px-3 py-3 pl-4 pr-10 sm:grid sm:min-h-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-3 sm:px-4 sm:py-4 sm:pl-5 sm:pr-10">
                    <div className="min-w-0">
                      <div className="text-eyebrow font-semibold uppercase tracking-widest text-muted-foreground">
                        {phase ? p.projectNumber : "Pending"}
                      </div>
                      <h3 className="mt-1 text-base font-semibold leading-tight text-foreground sm:text-sm">
                        {PHASE_LABEL[type]}
                        {type === "finishing" && p.finishLevel && (
                          <span className="ml-2 text-xs font-medium text-primary">level: {p.finishLevel}</span>
                        )}
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 sm:flex-nowrap sm:justify-end sm:gap-2">
                      <PhaseHealthPill health={health} size="sm" />
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
                          openCount > 0
                            ? "border-status-blocked/40 bg-status-blocked/10 text-status-blocked"
                            : "border-border/60 bg-muted/20 text-muted-foreground"
                        }`}
                      >
                        <AlertTriangle className="h-3 w-3" />
                        {openCount} open issues
                      </span>
                    </div>

                    {phase ? (
                      <span className={`absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 text-sm font-medium sm:right-4 ${accent.chevron}`}>
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground sm:text-right">Waiting to start</span>
                    )}
                  </div>
                );

                const actionControls = phase && (hasSiteActions || hasInspectionActions) ? (
                  <div className="flex flex-wrap gap-2">
                    {hasSiteActions && siteGate ? (
                      <>
                        {siteGate.status === "not_started" && (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-11 flex-1 px-3 text-xs sm:h-8 sm:flex-none sm:px-2"
                              onClick={() => {
                                setSiteCheckTarget({
                                  gateId: siteGate.id,
                                  phaseId: phase.id,
                                  phaseLabel: PHASE_LABEL[type],
                                });
                              }}
                              disabled={!canEdit}
                            >
                              Site Checked
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-11 flex-1 px-3 text-xs sm:h-8 sm:flex-none sm:px-2"
                              onClick={() => {
                                setSiteBlockTarget({
                                  gateId: siteGate.id,
                                  phaseId: phase.id,
                                  phaseLabel: PHASE_LABEL[type],
                                });
                              }}
                              disabled={!canEdit}
                            >
                              Site Blocked
                            </Button>
                          </>
                        )}
                        {siteGate.status === "blocked" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-11 flex-1 px-3 text-xs sm:h-8 sm:flex-none sm:px-2"
                            onClick={() => {
                              setSiteUnblockTarget({
                                gateId: siteGate.id,
                                phaseId: phase.id,
                                phaseLabel: PHASE_LABEL[type],
                              });
                            }}
                            disabled={!canEdit}
                          >
                            Site Cleared
                          </Button>
                        )}
                      </>
                    ) : null}

                    {hasInspectionActions && inspectionGate ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-11 flex-1 px-3 text-xs sm:h-8 sm:flex-none sm:px-2"
                          onClick={() => {
                            setInspectionTarget({
                              gateId: inspectionGate.id,
                              phaseId: phase.id,
                              phaseLabel: PHASE_LABEL[type],
                            });
                            setInspectionMode("passed");
                          }}
                          disabled={!canEdit}
                        >
                          Passed
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-11 flex-1 px-3 text-xs sm:h-8 sm:flex-none sm:px-2"
                          onClick={() => {
                            setInspectionTarget({
                              gateId: inspectionGate.id,
                              phaseId: phase.id,
                              phaseLabel: PHASE_LABEL[type],
                            });
                            setInspectionMode("failed");
                          }}
                          disabled={!canEdit}
                        >
                          Failed
                        </Button>
                      </>
                    ) : null}
                  </div>
                ) : null;

                return (
                  <Card
                    key={type}
                    surface="panel"
                    className={`relative overflow-hidden rounded-xl border-border-strong shadow-card ring-1 ${accent.ring} ${
                      phase ? "transition-all hover:-translate-y-0.5 hover:border-border-emphasis hover:shadow-interactive" : "opacity-70"
                    }`}
                  >
                    <span className={`absolute inset-y-0 left-0 w-1 ${accent.rail}`} aria-hidden="true" />
                    {phase ? (
                      <Link
                        to={`/project/${p.id}/phase/${phase.id}`}
                        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {phaseSummary}
                      </Link>
                    ) : (
                      phaseSummary
                    )}
                    {actionControls ? (
                      <div className={`border-t px-3 py-2.5 pl-4 sm:px-4 sm:py-2 sm:pl-5 ${accent.footer}`}>
                        {actionControls}
                      </div>
                    ) : null}
                  </Card>
                );
            })}
          </div>
        </section>

        {/* Project context */}
        <section className="grid gap-6 lg:grid-cols-2">
          <Card
            id="deficiencies"
            className={`${mobileTab === "overview" || mobileTab === "deficiencies" ? "" : "hidden md:block"} p-3 shadow-card sm:p-5`}
          >
            {p.status !== "completed" && p.status !== "archived" && (
              <div className="mb-3 flex items-center justify-between">
                <SectionHeading as="h3">Deficiencies</SectionHeading>
                <span className="text-xs text-muted-foreground">{activeDefs.length} active</span>
              </div>
            )}
            {p.status === "completed" || p.status === "archived" ? (
              <div className="mb-3">
                <SectionHeading as="h3">Deficiencies</SectionHeading>
              </div>
            ) : activeDefs.length === 0 ? (
              <EmptyInline text="No active deficiencies" />
            ) : (
              <div className="space-y-1.5 sm:space-y-2">
                {activeDefs.map((d) => {
                  const phase = detail.phases.find((ph) => ph.id === d.phaseId);
                  return (
                    <div
                      key={d.id}
                      onClick={() => navigate(`/project/${p.id}/phase/${d.phaseId}?tab=deficiencies`)}
                      className="flex items-start justify-between gap-2 rounded-md border border-border bg-muted/20 p-2 sm:p-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{d.title}</p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">{phase ? PHASE_LABEL[phase.type] : "—"}</span>
                          <SeverityBadge severity={d.severity} size="xs" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.status !== "completed" && p.status !== "archived" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 sm:h-7 px-3 sm:px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeficiencyDialogMode("resolve");
                              setSelectedDeficiencyId(d.id);
                              setDeficiencyDialogOpen(true);
                            }}
                            disabled={!canEdit}
                          >
                            Resolve
                          </Button>
                        )}
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {p.status !== "completed" && p.status !== "archived" && (
              <div className="mt-4 flex justify-start">
                <Button size="sm" className="hidden md:inline-flex" onClick={() => setDeficiencyDialogOpen(true)} disabled={!canEdit}>
                  Add Deficiency
                </Button>
                <button
                  type="button"
                  aria-label="Add deficiency"
                  onClick={() => setDeficiencyDialogOpen(true)}
                  disabled={!canEdit}
                  className="md:hidden inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            )}
          </Card>

          {detail && (
            <div id="project-notes" className={mobileTab === "notes" ? "" : "hidden md:block"}>
              <ProjectNotes
                projectId={detail.project.id}
                notes={detail.project.notes}
                notesLastEditedBy={detail.project.notesLastEditedBy}
                notesLastEditedAt={detail.project.notesLastEditedAt}
                editorName={detail.assignedProjectManager?.fullName}
              />
            </div>
          )}
        </section>

        <section className={mobileTab === "overview" ? "" : "hidden md:block"}>
          <Card id="attic-gate" className="p-3 shadow-card sm:p-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.35fr)_minmax(0,0.8fr)] lg:items-start">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <SectionHeading as="h3">Attic Check</SectionHeading>
                  {insulationClosed && drywallStarted && (
                    <Badge tone="ready" appearance="soft" size="sm">Ready</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Camera className={`h-4 w-4 ${hasAtticPhoto ? "text-status-closed" : "text-status-ready"}`} />
                  {hasAtticPhoto ? (
                    <button
                      type="button"
                      onClick={() => {
                        const atticPhoto = detail?.photoEvidence.find(
                          (p) => p.purpose === "attic_check" && p.status === "confirmed",
                        );
                        if (atticPhoto) {
                          setSelectedPhoto(atticPhoto);
                          setPhotoViewerOpen(true);
                        }
                      }}
                      className="text-sm font-medium text-foreground hover:underline"
                    >
                      Photo evidence confirmed
                    </button>
                  ) : (
                    <span>Photo evidence not yet uploaded</span>
                  )}
                </div>
                {!(insulationClosed && drywallStarted) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Lock className="h-4 w-4 shrink-0" />
                    <span>Available after insulation phase is closed and drywall site check is passed</span>
                  </div>
                )}
              </div>

              <div className="space-y-4 text-sm">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Call-in date</span>
                    {insulationClosed && drywallStarted ? (
                      <Popover open={callInOpen} onOpenChange={canEdit ? setCallInOpen : undefined}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" disabled={!canEdit} className="h-8 px-2 text-xs">
                            {atticGate?.callInDate
                              ? new Date(atticGate.callInDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                              : "Select date"}
                            <Calendar className="ml-1.5 h-3.5 w-3.5" />
                          </Button>
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
                                    <SelectTrigger className="h-8 text-base md:text-xs">
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
                      <span className="font-medium text-muted-foreground">
                        {atticGate?.callInDate ? new Date(atticGate.callInDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Install date</span>
                    {insulationClosed && drywallStarted ? (
                      <Popover open={installOpen} onOpenChange={canEdit ? (o) => { setInstallOpen(o); if (!o) setInstallPhoto(null); } : undefined}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" disabled={!canEdit} className="h-8 px-2 text-xs">
                            {atticGate?.installDate
                              ? new Date(atticGate.installDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                              : "Select date"}
                            <Calendar className="ml-1.5 h-3.5 w-3.5" />
                          </Button>
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
                                multiple={false}
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
                      <span className="font-medium text-muted-foreground">
                        {atticGate?.installDate ? new Date(atticGate.installDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {atticSubcontractor ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4 shrink-0" />
                  <span>{atticSubcontractor.displayName}{atticSubcontractor.companyName ? ` · ${atticSubcontractor.companyName}` : ""}</span>
                </div>
              ) : null}
            </div>
          </Card>
        </section>

        {/* Attic check completion warning */}
        {detail && p.status === "active" && atticGate && atticGate.status !== "passed" && detail.phases.every((ph) => ph.status === "closed") && (
          <Alert variant="default" className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertTitle>Attic check incomplete</AlertTitle>
            <AlertDescription>
              This project cannot be completed until the attic install date and photo evidence have been submitted.
            </AlertDescription>
          </Alert>
        )}

        <section className={mobileTab === "overview" ? "" : "hidden md:block"}>
          <InventoryDisplayCard
            title="Equipment"
            items={equipmentItems}
            onManage={canEdit ? openEquipmentModal : undefined}
            emptyText="No equipment logged"
            layout="grid"
            pickupSummaries={equipmentPickupSummaries}
          />
        </section>

        {/* Project Photos */}
        {detail && (
          <section className={mobileTab === "photos" ? "" : "hidden md:block"}>
            <div className="mb-3 flex flex-col gap-2">
              <SectionHeading as="h3" className="mb-0">Project Photos</SectionHeading>
              <div className="flex justify-start">
                <Button size="sm" className="hidden md:inline-flex" onClick={() => setPhotoUploadOpen(true)} disabled={!canEdit}>
                  <Camera className="mr-1.5 h-4 w-4" />
                  Upload Photos
                </Button>
              </div>
            </div>
            {projectPhotos.length === 0 ? (
              <>
                <EmptyInline text="No photos in this project yet" icon={<ImageIcon className="h-3.5 w-3.5" />} className="md:hidden" />
                <Card className="hidden md:block border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-card">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  No photos in this project yet
                </Card>
              </>
            ) : (
              <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 scrollbar-hide snap-x md:mx-0 md:grid md:grid-cols-4 md:gap-3 md:overflow-visible md:px-0">
                {projectPhotos.map((photo) => (
                  <div key={photo.id} className="w-24 shrink-0 snap-start md:w-auto">
                    <ProjectPhotoCard
                      photo={photo}
                      phases={detail.phases}
                      gates={detail.gates}
                      deficiencies={detail.deficiencies}
                      onOpen={() => {
                        setSelectedPhoto(photo);
                        setPhotoViewerOpen(true);
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Activity */}
        {detail.auditEvents.length > 0 && (
          <section id="activity" className={mobileTab === "activity" ? "" : "hidden md:block"}>
            <SectionHeading as="h3" className="mb-3">Recent activity</SectionHeading>
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
                            <ActionBadge action={a.action} size="xs" />
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
                            {typeof a.metadata?.summary === "string" && (
                              <span className="text-xs text-muted-foreground">Picked up: {a.metadata.summary}</span>
                            )}
                            {typeof a.metadata?.note === "string" && (
                              <span className="text-xs text-muted-foreground italic">&ldquo;{a.metadata.note}&rdquo;</span>
                            )}
                            <IconWell
                              tone="primary"
                              size="sm"
                              shape="pill"
                              className="text-eyebrow font-semibold"
                              title={detail.assignedProjectManager?.fullName ?? "System"}
                            >
                              {initials(detail.assignedProjectManager?.fullName ?? "System")}
                            </IconWell>
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

      <Fab
        label="Project actions"
        icon={<Plus className="h-6 w-6" />}
        onClick={() => setMobileActionsOpen(true)}
      />
      <MobileActionSheet
        open={mobileActionsOpen}
        onOpenChange={setMobileActionsOpen}
        title="Project actions"
        actions={projectMobileActions}
        variant="project"
      />
      <MobileActionSheet
        open={!!phaseActionsTarget}
        onOpenChange={(open) => { if (!open) setPhaseActionsTarget(null); }}
        title={phaseActionsTarget ? `${PHASE_LABEL[phaseActionsTarget.type]} actions` : "Phase actions"}
        actions={phaseActions}
      />
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
      {inspectionTarget && detail && (
        <InspectionResultDialog
          open={!!inspectionTarget}
          onOpenChange={(o) => { if (!o) setInspectionTarget(null); }}
          gateId={inspectionTarget.gateId}
          phaseId={inspectionTarget.phaseId}
          projectId={detail.project.id}
          phaseLabel={inspectionTarget.phaseLabel}
          mode={inspectionMode}
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
          currentUser={me}
          onUpdated={() => qc.invalidateQueries({ queryKey: ["project", id] })}
          onDeleted={() => navigate("/")}
        />
      )}
      {selectedPhoto && (
        <PhotoViewerDialog
          open={photoViewerOpen}
          onOpenChange={setPhotoViewerOpen}
          items={photoViewerItems}
          initialPhotoId={selectedPhoto.id}
        />
      )}
      {detail && (
        <QuantityStepperModal
          open={equipmentOpen}
          onOpenChange={(open) => {
            setEquipmentOpen(open);
            if (!open) {
              setEquipmentDraft({});
              setEquipmentSaveError(null);
            }
          }}
          title="Manage Equipment"
          description={equipmentSaveError ?? "Update project equipment quantities."}
          items={equipmentModalItems}
          onQuantityChange={(itemKey, quantity) => {
            setEquipmentDraft((current) => ({ ...current, [itemKey]: quantity }));
            setEquipmentSaveError(null);
          }}
          confirmLabel="Save"
          onConfirm={saveEquipmentDraft}
          isConfirming={saveEquipmentMutation.isPending}
        />
      )}
      {detail && (
        <DeficiencyDialog
          open={deficiencyDialogOpen}
          onOpenChange={(open) => {
            setDeficiencyDialogOpen(open);
            if (!open) {
              setPhaseDeficiencyTarget(null);
              setSelectedDeficiencyId(null);
            }
          }}
          projectId={detail.project.id}
          phaseId={phaseDeficiencyTarget?.id}
          phaseLabel={phaseDeficiencyTarget ? PHASE_LABEL[phaseDeficiencyTarget.type] : undefined}
          mode={deficiencyDialogMode}
          deficiency={selectedDeficiencyId ? detail.deficiencies.find((d) => d.id === selectedDeficiencyId) : undefined}
          phases={detail.phases}
        />
      )}
      {detail && phasePhotoTarget && (
        <PhotoUploadDialog
          open={!!phasePhotoTarget}
          onOpenChange={(open) => { if (!open) setPhasePhotoTarget(null); }}
          phases={[phasePhotoTarget]}
          defaultPhaseId={phasePhotoTarget.id}
          projectId={detail.project.id}
          deficiencies={detail.deficiencies}
        />
      )}
      {detail && (
        <PhotoUploadDialog
          open={photoUploadOpen}
          onOpenChange={setPhotoUploadOpen}
          phases={detail.phases}
          defaultPhaseId={activePhase?.id}
          projectId={p.id}
          deficiencies={detail.deficiencies}
          allowAllPhases
        />
      )}
    </div>
  );
}


function AdminProjectSummary({
  detail,
  equipmentItems,
  materialLogs,
  materialsLoading,
  materialsError,
  onOpenPhoto,
  onExport,
  exporting,
  onViewDetails,
}: {
  detail: ProjectDetailData;
  equipmentItems: InventoryDisplayItem[];
  materialLogs: MaterialLog[];
  materialsLoading: boolean;
  materialsError?: string;
  onOpenPhoto: (photo: PhotoEvidence) => void;
  onExport: () => void;
  exporting: boolean;
  onViewDetails: () => void;
}) {
  const p = detail.project;
  const activeDefs = detail.deficiencies.filter((d) => d.status === "open" || d.status === "in_progress");
  const currentPhase =
    detail.phases.find((phase) => phase.status === "in_progress") ??
    detail.phases.find((phase) => phase.status === "ready_for_inspection") ??
    detail.phases.find((phase) => phase.status === "blocked") ??
    detail.phases.find((phase) => phase.status !== "closed");
  const atticGate = detail.gates.find((gate) => gate.type === "attic_check");
  const atticSubcontractor = atticGate?.callInSubcontractorId
    ? detail.subcontractors.find((subcontractor) => subcontractor.id === atticGate.callInSubcontractorId)
    : undefined;
  const atticPhoto = detail.photoEvidence.find((p) => p.purpose === "attic_check" && p.status === "confirmed") ?? null;
  const visibleMaterialLogs = materialLogs.filter((log) => log.quantity > 0);

  return (
    <div className="space-y-6">
      <Card surface="panel" className="rounded-xl p-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
          <div className="min-w-0">
            <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Executive Summary</div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold sm:text-3xl">{p.name}</h1>
              <StatusBadge tone={projectStatusTone(p.status)} label={STATUS_LABEL[p.status]} size="sm" />
              {p.status === "archived" && (
                <Button variant="outline" size="sm" onClick={onExport} disabled={exporting}>
                  <Download className="mr-1 h-4 w-4" />
                  {exporting ? "Exporting…" : "Export"}
                </Button>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                {p.projectNumber}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {formatAddressShort(p.siteAddress)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {formatDateWithOptions(p.scheduledStart ?? "", { showYear: true })} - {formatDateWithOptions(p.scheduledEnd ?? "", { showYear: true })}
              </span>
            </div>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              <SummaryMetric label="Client" value={detail.client.name} />
              <SummaryMetric label="Project manager" value={detail.assignedProjectManager?.fullName ?? "Unassigned"} />
              <SummaryMetric label="Current phase" value={currentPhase ? PHASE_LABEL[currentPhase.type] : "No active phase"} />
            </div>
          </div>
          <div className="grid gap-2 rounded-lg border border-border bg-muted/20 p-4 text-sm">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Executive readout</div>
            <div className="flex items-center justify-between gap-6">
              <span>Active deficiencies</span>
              <span className="font-semibold tabular-nums">{activeDefs.length}</span>
            </div>
            <div className="flex items-center justify-between gap-6">
              <span>Photo evidence</span>
              <span className="font-semibold tabular-nums">{detail.photoEvidence.length}</span>
            </div>
            <div className="flex items-center justify-between gap-6">
              <span>Attic check</span>
              <StatusBadge
                tone={gateStatusTone(atticGate?.status ?? p.atticCheckStatus)}
                label={STATUS_LABEL[atticGate?.status ?? p.atticCheckStatus] ?? "Not started"}
                size="xs"
              />
            </div>
            <div className="mt-4">
              <Button variant="outline" onClick={onViewDetails}>
                View Full Project Details
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <ProjectScheduleTimeline
        project={p}
        phases={detail.phases}
        gates={detail.gates}
        deficiencies={detail.deficiencies}
        canEdit={false}
        onScheduleChange={() => undefined}
      />

      <section className="grid gap-4 lg:grid-cols-3">
        {PHASE_ORDER.map((type) => {
          const phase = detail.phases.find((item) => item.type === type);
          const gates = phase ? detail.gates.filter((gate) => gate.phaseId === phase.id) : [];
          const deficiencies = phase ? detail.deficiencies.filter((deficiency) => deficiency.phaseId === phase.id) : [];
          const health = computePhaseHealth(phase, gates, deficiencies);
          return (
            <Card key={type} className="p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <SectionHeading as="h3">{PHASE_LABEL[type]}</SectionHeading>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateWithOptions(phase?.scheduledStart ?? "", { showYear: true })} - {formatDateWithOptions(phase?.scheduledEnd ?? "", { showYear: true })}
                  </p>
                </div>
                <PhaseHealthPill health={health} size="sm" />
              </div>
              <div className="mt-4 space-y-2">
                {gates.length === 0 ? (
                  <EmptyInline text="No gates logged" />
                ) : (
                  gates.map((gate) => (
                    <div key={gate.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                      <span>{GATE_LABEL[gate.type]}</span>
                      <StatusBadge tone={gateStatusTone(gate.status)} label={STATUS_LABEL[gate.status]} size="xs" />
                    </div>
                  ))
                )}
                <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                  <span>Deficiencies</span>
                  <span className="font-semibold tabular-nums">{deficiencies.length}</span>
                </div>
              </div>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5 shadow-card">
          <SectionHeading as="h3">Deficiencies</SectionHeading>
          <div className="mt-3 space-y-2">
            {activeDefs.length === 0 ? (
              <EmptyInline text="No active deficiencies" />
            ) : (
              activeDefs.map((deficiency) => {
                const phase = detail.phases.find((item) => item.id === deficiency.phaseId);
                return (
                  <div key={deficiency.id} className="rounded-md border border-border bg-muted/20 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{deficiency.title}</span>
                      <SeverityBadge severity={deficiency.severity} size="xs" />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {phase ? PHASE_LABEL[phase.type] : "Unassigned phase"} · {STATUS_LABEL[deficiency.status] ?? deficiency.status}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <Card className="p-5 shadow-card">
          <SectionHeading as="h3">Project Notes</SectionHeading>
          <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
            {p.notes?.trim() ? p.notes : "No project notes recorded."}
          </p>
        </Card>

        <Card id="attic-check-details" className="p-4 shadow-card lg:col-span-2">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.65fr)_minmax(0,1.35fr)] lg:items-start">
            <div className="flex items-center justify-between gap-3 lg:block">
              <SectionHeading as="h3">Attic Check Details</SectionHeading>
              <StatusBadge
                tone={gateStatusTone(atticGate?.status ?? p.atticCheckStatus)}
                label={STATUS_LABEL[atticGate?.status ?? p.atticCheckStatus] ?? "Not started"}
                size="xs"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryMetric
                label="Call-in date"
                value={atticGate?.callInDate ? formatDateWithOptions(atticGate.callInDate, { showYear: true }) : "Not set"}
              />
              <SummaryMetric
                label="Install date"
                value={atticGate?.installDate ? formatDateWithOptions(atticGate.installDate, { showYear: true }) : "Not set"}
              />
              <SummaryMetric
                label="Subcontractor"
                value={
                  atticSubcontractor
                    ? `${atticSubcontractor.displayName}${atticSubcontractor.companyName ? ` · ${atticSubcontractor.companyName}` : ""}`
                    : "Unassigned"
                }
              />
              {atticGate?.notes?.trim() ? (
                <div className="rounded-md border border-border bg-muted/20 p-3 sm:col-span-3">
                  <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Notes</div>
                  <div className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">{atticGate.notes.trim()}</div>
                </div>
              ) : null}
              {atticPhoto ? (
                <div className="sm:col-span-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenPhoto(atticPhoto)}
                    className="w-full"
                  >
                    View Attic Evidence
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <ReadOnlyInventoryCard title="Equipment" items={equipmentItems} emptyText="No equipment logged" />
        <Card className="p-5 shadow-card">
          <SectionHeading as="h3">Materials</SectionHeading>
          <div className="mt-3 space-y-3">
            {materialsLoading ? (
              <Skeleton className="h-20" />
            ) : materialsError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Couldn't load materials</AlertTitle>
                <AlertDescription>{materialsError}</AlertDescription>
              </Alert>
            ) : visibleMaterialLogs.length === 0 ? (
              <EmptyInline text="No materials logged" />
            ) : (
              PHASE_ORDER.map((type) => {
                const phase = detail.phases.find((item) => item.type === type);
                const phaseLogs = phase ? visibleMaterialLogs.filter((log) => log.phaseId === phase.id) : [];
                if (phaseLogs.length === 0) return null;
                const labelByKey = new Map(PHASE_MATERIAL_CATALOGS[type].map((item) => [item.itemKey, item.label]));
                return (
                  <div key={type} className="rounded-md border border-border bg-muted/20 p-3">
                    <div className="text-sm font-semibold">{PHASE_LABEL[type]}</div>
                    <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                      {phaseLogs.map((log) => (
                        <li key={log.id} className="flex items-center justify-between gap-2 text-sm">
                          <span className="truncate text-muted-foreground">{labelByKey.get(log.itemKey) ?? log.itemKey}</span>
                          <span className="font-semibold tabular-nums">{log.quantity}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <SectionHeading as="h3" className="mb-0">Photo Evidence</SectionHeading>
          <span className="text-xs text-muted-foreground">{detail.photoEvidence.length} photos</span>
        </div>
        {detail.photoEvidence.length === 0 ? (
          <Card className="border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-card">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <ImageIcon className="h-5 w-5" />
            </div>
            No photos in this project yet
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {detail.photoEvidence.map((photo) => (
              <SummaryPhotoEvidenceCard
                key={photo.id}
                photo={photo}
                phases={detail.phases}
                gates={detail.gates}
                deficiencies={detail.deficiencies}
                onOpen={() => onOpenPhoto(photo)}
              />
            ))}
          </div>
        )}
      </section>

      <div className="sticky bottom-0 -mx-4 border-t border-border bg-background/95 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pt-2">
        <Button size="lg" className="w-full sm:w-auto" onClick={onViewDetails}>
          View Full Project Details
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-medium">{value}</div>
    </div>
  );
}

function ReadOnlyInventoryCard({ title, items, emptyText }: { title: string; items: InventoryDisplayItem[]; emptyText: string }) {
  return (
    <Card className="p-5 shadow-card">
      <SectionHeading as="h3">{title}</SectionHeading>
      <div className="mt-3">
        {items.length === 0 ? (
          <EmptyInline text={emptyText} />
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {items.map((item) => (
              <li key={item.label} className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/20 p-2.5">
                <span className="min-w-0 truncate text-sm font-medium">{item.label}</span>
                <span className="shrink-0 tabular-nums text-sm font-semibold text-foreground">{item.quantity}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function SummaryPhotoEvidenceCard({
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

  const phase = phases.find((item) => item.id === photo.phaseId);
  const gate = gates.find((item) => item.id === photo.gateId);
  const deficiency = deficiencies.find((item) => item.id === photo.deficiencyId);
  const context = deficiency
    ? `Deficiency: ${deficiency.title}`
    : gate && phase
      ? `${GATE_LABEL[gate.type] ?? gate.type} · ${PHASE_LABEL[phase.type]}`
      : gate
        ? GATE_LABEL[gate.type] ?? gate.type
        : phase
          ? PHASE_LABEL[phase.type]
          : "Project";

  return (
    <Card className="overflow-hidden shadow-card">
      <button
        type="button"
        onClick={onOpen}
        className="relative aspect-[4/3] w-full overflow-hidden bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {blobUrl ? (
          <img src={blobUrl} alt={PURPOSE_LABEL[photo.purpose] ?? photo.purpose} className="h-full w-full object-cover transition-transform duration-200 hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-7 w-7 text-muted-foreground" />
          </div>
        )}
      </button>
      <div className="space-y-1.5 p-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">{PURPOSE_LABEL[photo.purpose] ?? photo.purpose}</span>
          <Badge tone={photo.status === "confirmed" ? "success" : photo.status === "failed" ? "danger" : "neutral"} appearance="soft" size="xs">
            {STATUS_LABEL[photo.status] ?? photo.status.replace(/_/g, " ")}
          </Badge>
        </div>
        <p className="truncate text-xs text-muted-foreground">{context}</p>
        <p className="text-xs text-muted-foreground">
          {formatDateWithOptions(photo.createdAt, { showYear: true })}
          {photo.fileSizeBytes ? ` · ${Math.round(photo.fileSizeBytes / 1024)} KB` : ""}
        </p>
      </div>
    </Card>
  );
}

function buildProjectPhaseActions({
  phase,
  siteGate,
  projectId,
  navigate,
  setSiteCheckTarget,
  setSiteBlockTarget,
  setSiteUnblockTarget,
  setPhaseDeficiencyTarget,
  setDeficiencyDialogOpen,
  setPhasePhotoTarget,
  canEdit,
}: {
  phase: Phase;
  siteGate?: Gate;
  projectId: string;
  navigate: ReturnType<typeof useNavigate>;
  setSiteCheckTarget: React.Dispatch<React.SetStateAction<{ gateId: string; phaseId: string; phaseLabel: string } | null>>;
  setSiteBlockTarget: React.Dispatch<React.SetStateAction<{ gateId: string; phaseId: string; phaseLabel: string } | null>>;
  setSiteUnblockTarget: React.Dispatch<React.SetStateAction<{ gateId: string; phaseId: string; phaseLabel: string } | null>>;
  setPhaseDeficiencyTarget: React.Dispatch<React.SetStateAction<Phase | null>>;
  setDeficiencyDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setPhasePhotoTarget: React.Dispatch<React.SetStateAction<Phase | null>>;
  canEdit: boolean;
}): MobileActionItem[] {
  const phaseLabel = PHASE_LABEL[phase.type];
  return [
    {
      label: "View phase",
      icon: <ChevronRight className="h-4 w-4" />,
      helperText: "Open detailed phase workspace",
      onClick: () => navigate(`/project/${projectId}/phase/${phase.id}`),
    },
    ...(canEdit && siteGate?.status === "not_started"
      ? [
          {
            label: "Site checked",
            icon: <CheckCircle2 className="h-4 w-4" />,
            helperText: "Mark the site check as passed",
            onClick: () =>
              setSiteCheckTarget({
                gateId: siteGate.id,
                phaseId: phase.id,
                phaseLabel,
              }),
          },
          {
            label: "Site blocked",
            icon: <AlertTriangle className="h-4 w-4" />,
            helperText: "Block this phase with notes and evidence",
            onClick: () =>
              setSiteBlockTarget({
                gateId: siteGate.id,
                phaseId: phase.id,
                phaseLabel,
              }),
          },
        ]
      : []),
    ...(canEdit && siteGate?.status === "blocked"
      ? [
          {
            label: "Site cleared",
            icon: <ShieldCheck className="h-4 w-4" />,
            helperText: "Clear the site check block",
            onClick: () =>
              setSiteUnblockTarget({
                gateId: siteGate.id,
                phaseId: phase.id,
                phaseLabel,
              }),
          },
        ]
      : []),
    ...(canEdit
      ? [
          {
            label: "Add deficiency",
            icon: <Plus className="h-4 w-4" />,
            helperText: `Log an issue for ${phaseLabel}`,
            onClick: () => {
              setPhaseDeficiencyTarget(phase);
              setDeficiencyDialogOpen(true);
            },
          },
          {
            label: "Upload photo",
            icon: <Upload className="h-4 w-4" />,
            helperText: `Add evidence for ${phaseLabel}`,
            onClick: () => setPhasePhotoTarget(phase),
          },
        ]
      : []),
  ];
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
