import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Minus, Phone, Plus, Search, User } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { Badge } from "@/components/ui/badge";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useTypeToSearch } from "@/hooks/useTypeToSearch";
import { getGoogleMapsSearchUrl } from "@/lib/address";
import { cn } from "@/lib/utils";
import {
  getAllPhases,
  getCurrentUser,
  createInventoryAuditRequest,
  createInventoryPickup,
  getOutstandingInventoryAuditRequests,
  getProjectEquipment,
  getProjectInventoryPickups,
  getProjects,
  getPhaseMaterials,
  getUsers,
} from "@/lib/api";
import { EQUIPMENT_ITEMS, PHASE_MATERIAL_CATALOGS } from "@/lib/inventoryCatalog";
import type { AppNotification, EquipmentLog, InventoryAuditRequestType, InventoryPickup, InventoryPickupItemKind, MaterialLog, Phase, Project } from "@/lib/types";

interface AggregatedItem {
  itemKey: string;
  label: string;
  quantity: number;
  kind?: InventoryPickupItemKind;
}

interface PickupDraftItem extends AggregatedItem {
  kind: InventoryPickupItemKind;
  available: number;
}

function pickupDraftKey(item: Pick<PickupDraftItem, "kind" | "itemKey">) {
  return `${item.kind}:${item.itemKey}`;
}

const parseQuantityInput = (value: string) => {
  const quantity = Number(value);
  return Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0;
};

type AuditRequestType = InventoryAuditRequestType;
type InventoryFilter = "all" | "has_inventory" | "needs_audit" | "audit_requested" | "picked_up";

const AUDIT_REQUEST_OPTIONS: { value: AuditRequestType; label: string; description: string }[] = [
  { value: "materials", label: "Materials audit", description: "Request a count of materials on site." },
  { value: "hardware", label: "Hardware audit", description: "Request a count of hardware and equipment on site." },
  { value: "both", label: "Materials and hardware", description: "Request a full inventory audit for this site." },
];

const INVENTORY_FILTERS: { value: InventoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "has_inventory", label: "Has inventory" },
  { value: "needs_audit", label: "Needs audit" },
  { value: "audit_requested", label: "Audit requested" },
  { value: "picked_up", label: "Picked up" },
];

function auditRequestLabel(type: AuditRequestType) {
  if (type === "materials") return "Materials audit";
  if (type === "hardware") return "Hardware audit";
  return "Materials and hardware audit";
}

function notificationAuditType(notification: AppNotification): AuditRequestType | undefined {
  const type = notification.metadata?.auditRequestType;
  if (type === "materials" || type === "hardware" || type === "both") return type;
  return undefined;
}

function aggregateMaterials(phases: Phase[], materialsByPhase: Record<string, MaterialLog[]>): AggregatedItem[] {
  const totals = new Map<string, { label: string; quantity: number }>();

  for (const phase of phases) {
    const catalog = PHASE_MATERIAL_CATALOGS[phase.type];
    const logs = materialsByPhase[phase.id] ?? [];
    for (const log of logs) {
      if (log.quantity <= 0) continue;
      const item = catalog.find((c) => c.itemKey === log.itemKey);
      const label = item?.label ?? log.itemKey;
      const existing = totals.get(log.itemKey);
      if (existing) {
        existing.quantity += log.quantity;
      } else {
        totals.set(log.itemKey, { label, quantity: log.quantity });
      }
    }
  }

  return Array.from(totals.entries())
    .map(([itemKey, { label, quantity }]) => ({ itemKey, label, quantity }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function aggregateEquipment(logs: EquipmentLog[]): AggregatedItem[] {
  return logs
    .filter((log) => log.quantity > 0)
    .map((log) => {
      const item = EQUIPMENT_ITEMS.find((e) => e.itemKey === log.itemKey);
      return { itemKey: log.itemKey, label: item?.label ?? log.itemKey, quantity: log.quantity };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

function aggregatePickups(pickups: InventoryPickup[], phases: Phase[]): AggregatedItem[] {
  const totals = new Map<string, { label: string; quantity: number; kind: InventoryPickupItemKind }>();

  for (const pickup of pickups) {
    for (const item of pickup.items) {
      if (item.quantity <= 0) continue;
      const key = `${item.kind}:${item.itemKey}`;
      const existing = totals.get(key);
      if (existing) {
        existing.quantity += item.quantity;
        continue;
      }

      let label = item.itemKey;
      if (item.kind === "equipment") {
        label = EQUIPMENT_ITEMS.find((catalogItem) => catalogItem.itemKey === item.itemKey)?.label ?? item.itemKey;
      } else {
        for (const phase of phases) {
          const material = PHASE_MATERIAL_CATALOGS[phase.type].find((catalogItem) => catalogItem.itemKey === item.itemKey);
          if (material) {
            label = material.label;
            break;
          }
        }
      }
      totals.set(key, { label, quantity: item.quantity, kind: item.kind });
    }
  }

  return Array.from(totals.entries())
    .map(([key, { label, quantity, kind }]) => ({ itemKey: key, label, quantity, kind }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function matchesSearch(query: string, project: Project, pmName: string, equipment: AggregatedItem[], materials: AggregatedItem[], pickups: AggregatedItem[]): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  if (project.name.toLowerCase().includes(q)) return true;
  if (project.siteAddress.toLowerCase().includes(q)) return true;
  if (pmName.toLowerCase().includes(q)) return true;
  if (equipment.some((e) => e.label.toLowerCase().includes(q))) return true;
  if (materials.some((m) => m.label.toLowerCase().includes(q))) return true;
  if (pickups.some((p) => p.label.toLowerCase().includes(q))) return true;
  return false;
}

function ItemChips({ items, query }: { items: AggregatedItem[]; query: string }) {
  if (items.length === 0) return null;
  const q = query.toLowerCase();
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => {
        const isMatch = q && item.label.toLowerCase().includes(q);
        return (
          <span
            key={item.itemKey}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
              isMatch
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-border bg-muted/30 text-foreground"
            }`}
          >
            {item.label}
            <span className={`rounded-full px-1 py-px text-[10px] font-semibold tabular-nums ${isMatch ? "bg-primary/15" : "bg-foreground/10"}`}>
              ×{item.quantity}
            </span>
          </span>
        );
      })}
    </div>
  );
}

interface ProjectCardProps {
  project: Project;
  pmName: string;
  pmPhone: string | undefined;
  equipment: AggregatedItem[];
  materials: AggregatedItem[];
  pickups: AggregatedItem[];
  auditRequestTypes: AuditRequestType[];
  query: string;
  onRequestAudit: (project: Project) => void;
  onPickup: (project: Project, equipment: AggregatedItem[], materials: AggregatedItem[]) => void;
}

function InventorySection({ title, items, query }: { title: string; items: AggregatedItem[]; query: string }) {
  if (items.length === 0) return null;
  const total = items.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <div className="rounded-lg border border-border/80 bg-muted/15 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{title}</p>
        <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-foreground">
          {items.length} · ×{total}
        </span>
      </div>
      <ItemChips items={items} query={query} />
    </div>
  );
}

function ProjectCard({ project, pmName, pmPhone, equipment, materials, pickups, auditRequestTypes, query, onRequestAudit, onPickup }: ProjectCardProps) {
  const noInventory = equipment.length === 0 && materials.length === 0;
  const hasPickedUp = pickups.length > 0;
  const showEmptyInventory = noInventory && !hasPickedUp;
  const hasAuditRequest = auditRequestTypes.length > 0;
  const currentItemCount = equipment.length + materials.length;
  const currentQuantity = [...equipment, ...materials].reduce((sum, item) => sum + item.quantity, 0);
  const statusLabel = showEmptyInventory ? (hasAuditRequest ? "Audit requested" : "Needs audit") : noInventory ? "Picked up" : "Ready for pickup";
  const mapsUrl = getGoogleMapsSearchUrl(project.siteAddress);

  return (
    <Card className="overflow-hidden border-border-strong bg-gradient-surface shadow-card">
      <div className="p-3 sm:p-4">
      <div className="mb-2.5 flex items-start justify-between gap-2 sm:mb-3">
        <div className="min-w-0">
          <h2 className="line-clamp-2 text-base font-semibold leading-tight">{project.name}</h2>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
            aria-label={`Open ${project.siteAddress} in Google Maps`}
          >
            {project.siteAddress}
          </a>
        </div>
        <Badge tone={showEmptyInventory ? (hasAuditRequest ? "info" : "warning") : noInventory ? "success" : "info"} appearance="soft" size="sm" className="shrink-0">
          {statusLabel}
        </Badge>
      </div>

      {pmName && (
        <div className="mb-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground sm:mb-3">
          <User className="h-3.5 w-3.5 shrink-0" />
          <span className="font-medium text-foreground">{pmName}</span>
          {pmPhone && (
            <>
              <span aria-hidden="true">·</span>
              <a href={`tel:${pmPhone}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                <Phone className="h-3 w-3" />
                {pmPhone}
              </a>
            </>
          )}
        </div>
      )}

      <div className="mb-2.5 grid grid-cols-3 gap-1.5 rounded-lg border border-border/70 bg-background/35 p-2 sm:mb-3 sm:gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Hardware</p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums">{equipment.length}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Materials</p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums">{materials.length}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">On site</p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums">×{currentQuantity}</p>
        </div>
      </div>

      {hasAuditRequest && (
        <div className="mb-2.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary sm:mb-3">
          <p className="font-semibold">Audit requested</p>
          <p className="mt-1 text-xs leading-snug">
            {auditRequestTypes.map((type) => `${auditRequestLabel(type)} requested`).join(" · ")}
          </p>
        </div>
      )}

      {showEmptyInventory ? (
        <div className="space-y-2.5 sm:space-y-3">
          <p className="rounded-lg border border-dashed border-border bg-muted/10 px-3 py-2 text-sm text-muted-foreground">Nothing logged yet</p>
          <Button variant="outline" className="h-11 w-full" onClick={() => onRequestAudit(project)}>
            Request audit
          </Button>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-2.5">
          <InventorySection title="Hardware on site" items={equipment} query={query} />
          <InventorySection title="Materials on site" items={materials} query={query} />
          <InventorySection title="Picked up" items={pickups} query={query} />
          <Button className="h-11 w-full" disabled={currentItemCount === 0} onClick={() => onPickup(project, equipment, materials)}>
            Pick up
          </Button>
        </div>
      )}
      </div>
    </Card>
  );
}

const InventoryTrackerPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useTypeToSearch({
    searchInputRef,
    search,
    onSearchChange: setSearch,
  });

  const [inventoryFilter, setInventoryFilter] = useState<InventoryFilter>("all");
  const [auditProject, setAuditProject] = useState<Project | null>(null);
  const [auditType, setAuditType] = useState<AuditRequestType | "">("");
  const [auditError, setAuditError] = useState<string | null>(null);
  const [pickupProject, setPickupProject] = useState<Project | null>(null);
  const [pickupItems, setPickupItems] = useState<PickupDraftItem[]>([]);
  const [pickupDraft, setPickupDraft] = useState<Record<string, number>>({});
  const [pickupNote, setPickupNote] = useState("");
  const [pickupError, setPickupError] = useState<string | null>(null);

  const meQ = useQuery({ queryKey: ["me"], queryFn: getCurrentUser });
  const usersQ = useQuery({ queryKey: ["users"], queryFn: getUsers });
  const projectsQ = useQuery({ queryKey: ["projects-inventory"], queryFn: () => getProjects({ status: ["active"] }) });
  const phasesQ = useQuery({ queryKey: ["phases"], queryFn: getAllPhases });

  const me = meQ.data?.ok ? meQ.data.data : undefined;
  const users = useMemo(() => (usersQ.data?.ok ? usersQ.data.data : []), [usersQ.data]);
  const projects = useMemo(() => (projectsQ.data?.ok ? projectsQ.data.data : []), [projectsQ.data]);
  const phases = useMemo(() => (phasesQ.data?.ok ? phasesQ.data.data : []), [phasesQ.data]);

  const phasesByProject = useMemo(() => {
    const map: Record<string, Phase[]> = {};
    for (const phase of phases) {
      if (!map[phase.projectId]) map[phase.projectId] = [];
      map[phase.projectId].push(phase);
    }
    return map;
  }, [phases]);

  const phaseIds = useMemo(() => phases.map((p) => p.id), [phases]);

  const equipmentQueries = useQuery({
    queryKey: ["inventory-equipment", projects.map((p) => p.id)],
    queryFn: async () => {
      const results: Record<string, EquipmentLog[]> = {};
      await Promise.all(
        projects.map(async (project) => {
          const res = await getProjectEquipment(project.id);
          results[project.id] = res.ok ? res.data : [];
        }),
      );
      return results;
    },
    enabled: projects.length > 0,
  });

  const materialsQueries = useQuery({
    queryKey: ["inventory-materials", phaseIds],
    queryFn: async () => {
      const results: Record<string, MaterialLog[]> = {};
      await Promise.all(
        phases.map(async (phase) => {
          const res = await getPhaseMaterials(phase.id);
          results[phase.id] = res.ok ? res.data : [];
        }),
      );
      return results;
    },
    enabled: phases.length > 0,
  });

  const pickupsQueries = useQuery({
    queryKey: ["inventory-pickups", projects.map((p) => p.id)],
    queryFn: async () => {
      const results: Record<string, InventoryPickup[]> = {};
      await Promise.all(
        projects.map(async (project) => {
          const res = await getProjectInventoryPickups(project.id);
          results[project.id] = res.ok ? res.data : [];
        }),
      );
      return results;
    },
    enabled: projects.length > 0,
  });

  const auditRequestsQ = useQuery({
    queryKey: ["inventory-audit-requests"],
    queryFn: getOutstandingInventoryAuditRequests,
    enabled: me?.role === "inventory_viewer" || me?.role === "admin",
  });

  const auditRequestTypesByProject = useMemo(() => {
    const map: Record<string, AuditRequestType[]> = {};
    const requests = auditRequestsQ.data?.ok ? auditRequestsQ.data.data : [];
    for (const request of requests) {
      const type = notificationAuditType(request);
      if (!type) continue;
      if (!map[request.projectId]) map[request.projectId] = [];
      if (!map[request.projectId].includes(type)) map[request.projectId].push(type);
    }
    return map;
  }, [auditRequestsQ.data]);

  const isLoading =
    meQ.isLoading ||
    projectsQ.isLoading ||
    phasesQ.isLoading ||
    equipmentQueries.isLoading ||
    materialsQueries.isLoading ||
    pickupsQueries.isLoading ||
    auditRequestsQ.isLoading;

  const inventoryCards = useMemo(() => {
    const equipmentByProject = equipmentQueries.data ?? {};
    const materialsByPhase = materialsQueries.data ?? {};
    const pickupsByProject = pickupsQueries.data ?? {};
    return projects.map((project) => {
      const projectPhases = phasesByProject[project.id] ?? [];
      const equipment = aggregateEquipment(equipmentByProject[project.id] ?? []);
      const materials = aggregateMaterials(projectPhases, materialsByPhase);
      const pickups = aggregatePickups(pickupsByProject[project.id] ?? [], projectPhases);
      const pm = users.find((u) => u.id === project.assignedProjectManagerId);
      const pmName = pm?.fullName ?? "";
      const pmPhone = pm?.phone;
      const hasInventory = equipment.length > 0 || materials.length > 0;
      const hasPickedUp = pickups.length > 0;
      const auditRequestTypes = auditRequestTypesByProject[project.id] ?? [];
      const hasAuditRequest = auditRequestTypes.length > 0;
      return { project, pmName, pmPhone, equipment, materials, pickups, auditRequestTypes, hasInventory, hasPickedUp, hasAuditRequest };
    });
  }, [projects, phasesByProject, equipmentQueries.data, materialsQueries.data, pickupsQueries.data, auditRequestTypesByProject, users]);

  const inventoryStats = useMemo(() => {
    const withInventory = inventoryCards.filter((card) => card.hasInventory).length;
    const pickedUp = inventoryCards.filter((card) => card.hasPickedUp).length;
    const auditRequested = inventoryCards.filter((card) => !card.hasInventory && !card.hasPickedUp && card.hasAuditRequest).length;
    return {
      total: inventoryCards.length,
      withInventory,
      needsAudit: inventoryCards.filter((card) => !card.hasInventory && !card.hasPickedUp && !card.hasAuditRequest).length,
      auditRequested,
      pickedUp,
    };
  }, [inventoryCards]);

  const visibleCards = useMemo(() => {
    return inventoryCards.filter((card) => {
      if (!matchesSearch(search, card.project, card.pmName, card.equipment, card.materials, card.pickups)) return false;
      if (inventoryFilter === "has_inventory") return card.hasInventory;
      if (inventoryFilter === "needs_audit") return !card.hasInventory && !card.hasPickedUp && !card.hasAuditRequest;
      if (inventoryFilter === "audit_requested") return !card.hasInventory && !card.hasPickedUp && card.hasAuditRequest;
      if (inventoryFilter === "picked_up") return card.hasPickedUp;
      return true;
    });
  }, [inventoryCards, inventoryFilter, search]);

  const inventoryStatCards: { value: InventoryFilter; label: string; count: number }[] = [
    { value: "all", label: "Sites", count: inventoryStats.total },
    { value: "has_inventory", label: "Loaded", count: inventoryStats.withInventory },
    { value: "needs_audit", label: "Audit", count: inventoryStats.needsAudit },
    { value: "audit_requested", label: "Requested", count: inventoryStats.auditRequested },
    { value: "picked_up", label: "Picked", count: inventoryStats.pickedUp },
  ];

  useEffect(() => {
    if (me && me.role !== "inventory_viewer" && me.role !== "admin") {
      navigate("/");
    }
  }, [me, navigate]);

  const closeAuditSheet = () => {
    setAuditProject(null);
    setAuditType("");
    setAuditError(null);
  };

  const handleRequestAudit = (project: Project) => {
    setAuditProject(project);
    setAuditType("");
    setAuditError(null);
  };

  const auditRequestMutation = useMutation({
    mutationFn: () => createInventoryAuditRequest({ projectId: auditProject!.id, type: auditType as AuditRequestType }),
    onSuccess: async (res) => {
      if (res.ok === false) {
        setAuditError(res.error.message);
        return;
      }
      await qc.invalidateQueries({ queryKey: ["notifications"] });
      await qc.invalidateQueries({ queryKey: ["inventory-audit-requests"] });
      toast({
        title: "Audit requested",
        description: `${auditRequestLabel(auditType as AuditRequestType)} requested for ${auditProject?.name}.`,
      });
      closeAuditSheet();
    },
  });

  const handleSubmitAuditRequest = () => {
    if (!auditProject || !auditType) return;
    if ((auditRequestTypesByProject[auditProject.id] ?? []).includes(auditType)) {
      setAuditError(`${auditRequestLabel(auditType)} already requested for ${auditProject.name}.`);
      return;
    }
    auditRequestMutation.mutate();
  };

  const closePickupSheet = () => {
    setPickupProject(null);
    setPickupItems([]);
    setPickupDraft({});
    setPickupNote("");
    setPickupError(null);
  };

  const handlePickup = (project: Project, equipment: AggregatedItem[], materials: AggregatedItem[]) => {
    const items: PickupDraftItem[] = [
      ...equipment.map((item) => ({ ...item, kind: "equipment" as const, available: item.quantity })),
      ...materials.map((item) => ({ ...item, kind: "material" as const, available: item.quantity })),
    ];
    setPickupProject(project);
    setPickupItems(items);
    setPickupDraft(Object.fromEntries(items.map((item) => [pickupDraftKey(item), 0])));
    setPickupNote("");
    setPickupError(null);
  };

  const updatePickupDraft = (item: PickupDraftItem, quantity: number) => {
    const normalized = Math.max(0, Math.min(item.available, quantity));
    setPickupDraft((current) => ({ ...current, [pickupDraftKey(item)]: normalized }));
  };

  const selectedPickupItems = pickupItems
    .map((item) => ({
      kind: item.kind,
      itemKey: item.itemKey,
      quantity: pickupDraft[pickupDraftKey(item)] ?? 0,
    }))
    .filter((item) => item.quantity > 0);
  const selectedPickupQuantity = selectedPickupItems.reduce((sum, item) => sum + item.quantity, 0);

  const pickupMutation = useMutation({
    mutationFn: () =>
      createInventoryPickup({
        projectId: pickupProject!.id,
        items: selectedPickupItems,
        note: pickupNote,
      }),
    onSuccess: async (res) => {
      if (res.ok === false) {
        setPickupError(res.error.message);
        return;
      }
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["inventory-equipment"] }),
        qc.invalidateQueries({ queryKey: ["inventory-materials"] }),
        qc.invalidateQueries({ queryKey: ["inventory-pickups"] }),
        qc.invalidateQueries({ queryKey: ["audit-events"] }),
        qc.invalidateQueries({ queryKey: ["notifications"] }),
      ]);
      toast({
        title: "Picked up",
        description: `${selectedPickupItems.length} item${selectedPickupItems.length === 1 ? "" : "s"} picked up from ${pickupProject?.name}.`,
      });
      closePickupSheet();
    },
  });

  const handleSubmitPickup = () => {
    if (!pickupProject || selectedPickupItems.length === 0) return;
    pickupMutation.mutate();
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <AppHeader />

      <main className="container space-y-3 overflow-x-clip py-3 sm:space-y-4 sm:py-4">
        <div>
          <h1 className="text-xl font-bold leading-tight">Inventory Tracker</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Active job sites · materials and hardware on site</p>
        </div>

        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {inventoryStatCards.map((stat) => {
            const isActive = inventoryFilter === stat.value;
            return (
              <button
                key={stat.value}
                type="button"
                aria-label={`Filter inventory by ${stat.label}: ${stat.count} active sites`}
                aria-pressed={isActive}
                onClick={() => setInventoryFilter(stat.value)}
                className={cn(
                  "min-w-0 rounded-lg border bg-muted/20 p-1.5 text-left text-card-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 sm:p-2.5",
                  isActive ? "border-primary/60 bg-primary/10 shadow-glow" : "border-border hover:border-border-emphasis hover:bg-muted/30",
                )}
              >
                <p className={cn("truncate text-[9px] uppercase tracking-[0.12em] sm:text-[10px] sm:tracking-widest", isActive ? "text-primary" : "text-muted-foreground")}>{stat.label}</p>
                <p className="mt-1 text-lg font-bold tabular-nums">{stat.count}</p>
              </button>
            );
          })}
        </div>

        <div className="sticky top-[7.25rem] z-10 -mx-4 max-w-[100vw] space-y-1.5 bg-background/90 px-4 pb-1.5 pt-1 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:grid sm:grid-cols-[minmax(12rem,1fr)_auto] sm:items-center sm:gap-x-3 sm:gap-y-1 sm:space-y-0 sm:pb-2 lg:top-16">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              ref={searchInputRef}
              id="inventory-search"
              name="inventorySearch"
              aria-label="Search inventory sites and items"
              placeholder="Search sites or items…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              autoComplete="off"
            />
          </div>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 scrollbar-hide sm:mx-0 sm:max-w-[28rem] sm:px-0 sm:pb-0">
            {INVENTORY_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                aria-pressed={inventoryFilter === filter.value}
                onClick={() => setInventoryFilter(filter.value)}
                className={cn(
                  "h-8 shrink-0 rounded-full border px-3 text-xs font-semibold transition-colors sm:h-9",
                  inventoryFilter === filter.value
                    ? "border-primary/60 bg-primary text-primary-foreground shadow-glow"
                    : "border-border bg-card text-muted-foreground",
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground sm:col-span-2 sm:text-xs">
            Showing {visibleCards.length} of {inventoryCards.length} active sites
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-32 animate-pulse bg-muted/40" />
            ))}
          </div>
        ) : visibleCards.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              {search ? `No results for "${search}"` : "No active projects"}
            </p>
          </div>
        ) : (
          <div className="grid gap-2.5 pb-8 sm:gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleCards.map(({ project, pmName, pmPhone, equipment, materials, pickups, auditRequestTypes }) => (
              <ProjectCard
                key={project.id}
                project={project}
                pmName={pmName}
                pmPhone={pmPhone}
                equipment={equipment}
                materials={materials}
                pickups={pickups}
                auditRequestTypes={auditRequestTypes}
                query={search}
                onRequestAudit={handleRequestAudit}
                onPickup={handlePickup}
              />
            ))}
          </div>
        )}
      </main>

      <BottomSheet
        open={Boolean(auditProject)}
        onOpenChange={(open) => {
          if (!open) closeAuditSheet();
        }}
        title="Request inventory audit"
        description="Choose what Dale needs audited at this active site."
      >
        {auditProject && (
          <div className="flex min-h-full flex-col">
            <div className="flex-1 space-y-4 pb-4">
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-sm font-semibold leading-tight">{auditProject.name}</p>
              <a
                href={getGoogleMapsSearchUrl(auditProject.siteAddress)}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block text-xs leading-snug text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
                aria-label={`Open ${auditProject.siteAddress} in Google Maps`}
              >
                {auditProject.siteAddress}
              </a>
            </div>

            <div className="space-y-2">
              {AUDIT_REQUEST_OPTIONS.map((option) => {
                const alreadyRequested = (auditRequestTypesByProject[auditProject.id] ?? []).includes(option.value);
                return (
                  <Button
                    key={option.value}
                    type="button"
                    variant={auditType === option.value ? "default" : "outline"}
                    className="h-auto w-full justify-start px-3 py-3 text-left"
                    disabled={alreadyRequested}
                    onClick={() => setAuditType(option.value)}
                  >
                    <span>
                      <span className="block text-sm font-semibold">{option.label}</span>
                      <span className="block text-xs font-normal opacity-80">
                        {alreadyRequested ? "Already requested for this site." : option.description}
                      </span>
                    </span>
                  </Button>
                );
              })}
            </div>

            {auditError && <p className="text-sm text-destructive">{auditError}</p>}
            </div>

            <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-border bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
              <Button type="button" variant="outline" className="h-11 flex-1" onClick={closeAuditSheet}>
                Cancel
              </Button>
              <Button
                type="button"
                className="h-11 flex-1"
                disabled={!auditType || auditRequestMutation.isPending || Boolean(auditProject && (auditRequestTypesByProject[auditProject.id] ?? []).includes(auditType as AuditRequestType))}
                onClick={handleSubmitAuditRequest}
              >
                {auditRequestMutation.isPending ? "Submitting..." : "Submit request"}
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        open={Boolean(pickupProject)}
        onOpenChange={(open) => {
          if (!open) closePickupSheet();
        }}
        title="What did you pick up"
        description="Adjust the quantities Dale picked up from this site."
      >
        {pickupProject && (
          <div className="flex min-h-full flex-col">
            <div className="flex-1 space-y-4 pb-4">
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-sm font-semibold leading-tight">{pickupProject.name}</p>
              <a
                href={getGoogleMapsSearchUrl(pickupProject.siteAddress)}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block text-xs leading-snug text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
                aria-label={`Open ${pickupProject.siteAddress} in Google Maps`}
              >
                {pickupProject.siteAddress}
              </a>
            </div>

            <div className="space-y-2">
              {pickupItems.map((item) => {
                const quantity = pickupDraft[pickupDraftKey(item)] ?? 0;
                return (
                  <div
                    key={pickupDraftKey(item)}
                    className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/20 p-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground">Available ×{item.available}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-11 w-11"
                        aria-label={`Decrease ${item.label}`}
                        disabled={quantity === 0}
                        onClick={() => updatePickupDraft(item, quantity - 1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        min={0}
                        max={item.available}
                        step={1}
                        inputMode="numeric"
                        aria-label={`Quantity for ${item.label}`}
                        value={quantity}
                        onChange={(event) => updatePickupDraft(item, parseQuantityInput(event.target.value))}
                        className="h-11 w-16 px-2 text-center text-base font-semibold tabular-nums"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-11 w-11"
                        aria-label={`Increase ${item.label}`}
                        disabled={quantity >= item.available}
                        onClick={() => updatePickupDraft(item, quantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="pickup-note" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Optional note
              </label>
              <Textarea
                id="pickup-note"
                value={pickupNote}
                onChange={(e) => setPickupNote(e.target.value)}
                placeholder="Add pickup details…"
                maxLength={500}
              />
            </div>

            {pickupError && <p className="text-sm text-destructive">{pickupError}</p>}
            </div>

            <div className="sticky bottom-0 -mx-4 space-y-2 border-t border-border bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Selected</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {selectedPickupItems.length} items · ×{selectedPickupQuantity}
                </span>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="h-11 flex-1" onClick={closePickupSheet}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="h-11 flex-1"
                  disabled={selectedPickupItems.length === 0 || pickupMutation.isPending}
                  onClick={handleSubmitPickup}
                >
                  {pickupMutation.isPending ? "Saving..." : "Picked up"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
};

export default InventoryTrackerPage;
