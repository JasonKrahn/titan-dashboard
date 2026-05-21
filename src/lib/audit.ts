import type {
  AuditEvent,
  Deficiency,
  Gate,
  Phase,
  PhotoEvidence,
  Project,
  User,
} from "@/lib/types";
import { GATE_LABEL, initials, PHASE_LABEL, relativeTime, STATUS_LABEL } from "@/lib/derived";
import { formatDateWithOptions } from "@/lib/schedule";
import type { BadgeTone } from "@/components/ui/badge";


export const AUDIT_ACTION_LABEL: Record<string, string> = {
  activate_project: "Project activated",
  archive_project: "Project archived",
  attic_gate_updated: "Attic check updated",
  complete_project: "Project completed",
  create_client: "Client created",
  delete_client: "Client deleted",
  create_deficiency: "Deficiency opened",
  create_project: "Project created",
  delete_project: "Project deleted",
  create_subcontractor: "Subcontractor created",
  deleted: "Deleted",
  deficiency_opened: "Deficiency opened",
  fail_gate: "Gate failed",
  hardware_updated: "Hardware updated",
  inspection_completed: "Inspection completed",
  inventory_audit_requested: "Inventory audit requested",
  inventory_picked_up: "Inventory picked up",
  materials_updated: "Materials updated",
  pass_gate: "Gate passed",
  phase_ready_for_inspection: "Ready for inspection",
  photo_uploaded: "Photo uploaded",
  project_notes_updated: "Project notes updated",
  resolve_deficiency: "Deficiency resolved",
  site_check_blocked: "Site check blocked",
  site_check_cleared: "Site check cleared",
  site_check_completed: "Site check completed",
  status_changed: "Status changed",
  subcontractor_assigned: "Subcontractor assigned",
  update_deficiency: "Deficiency updated",
  updated: "Updated",
  upload_photo: "Photo uploaded",
  uploaded: "Uploaded",
};

/**
 * Single source of truth for audit action → semantic tone.
 * Used by ActionBadge and the activity row priority accent.
 */
export const AUDIT_ACTION_TONE: Record<string, BadgeTone> = {
  activate_project: "info",
  archive_project: "neutral",
  attic_gate_updated: "info",
  complete_project: "success",
  create_client: "success",
  delete_client: "neutral",
  create_deficiency: "warning",
  create_phase: "success",
  create_project: "success",
  delete_project: "neutral",
  create_subcontractor: "success",
  created: "success",
  deficiency_opened: "warning",
  deleted: "neutral",
  fail_gate: "danger",
  hardware_updated: "info",
  inspection_completed: "success",
  inventory_audit_requested: "warning",
  inventory_picked_up: "success",
  materials_updated: "info",
  pass_gate: "success",
  phase_ready_for_inspection: "ready",
  photo_uploaded: "accent",
  project_notes_updated: "info",
  resolve_deficiency: "success",
  site_check_blocked: "danger",
  site_check_cleared: "success",
  site_check_completed: "success",
  status_changed: "info",
  subcontractor_assigned: "info",
  update_deficiency: "info",
  updated: "info",
  upload_photo: "accent",
  uploaded: "accent",
};

/** Actions that warrant a left-border accent on the activity row. */
export const AUDIT_ACTION_PRIORITY: Record<string, "danger" | "warning" | undefined> = {
  create_deficiency: "warning",
  deficiency_opened: "warning",
  fail_gate: "danger",
  site_check_blocked: "danger",
};

export const AUDIT_ENTITY_LABEL: Record<string, string> = {
  client_record: "Client",
  deficiency: "Deficiency",
  gate: "Gate",
  phase: "Phase",
  photo_evidence: "Photo",
  project: "Project",
  inventory_pickup: "Inventory pickup",
  subcontractor_contact: "Subcontractor",
  user: "User",
};

export interface AuditLookups {
  projects: Project[];
  phases: Phase[];
  gates: Gate[];
  deficiencies: Deficiency[];
  users?: User[];
  photoEvidence?: PhotoEvidence[];
}

export interface AuditEventDisplay {
  actionLabel: string;
  actorInitials?: string;
  actorName?: string;
  tone: BadgeTone;
  priority?: "danger" | "warning";
  context: string;
  entityLabel: string;
  linkUrl?: string;
  metadataText?: string;
  priorityBorderClass?: string;
  relativeTime: string;
  searchText: string;
  statusText?: string;
  title: string;
}

function fallbackLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function findEventContext(event: AuditEvent, lookups: AuditLookups) {
  const project = event.entityType === "project"
    ? lookups.projects.find((item) => item.id === event.entityId)
    : undefined;
  const phase = event.entityType === "phase"
    ? lookups.phases.find((item) => item.id === event.entityId)
    : undefined;
  const gate = event.entityType === "gate"
    ? lookups.gates.find((item) => item.id === event.entityId)
    : undefined;
  const directDeficiency = event.entityType === "deficiency"
    ? lookups.deficiencies.find((item) => item.id === event.entityId)
    : undefined;
  const photo = event.entityType === "photo_evidence"
    ? lookups.photoEvidence?.find((item) => item.id === event.entityId)
    : undefined;
  const deficiency =
    directDeficiency ??
    (photo?.deficiencyId ? lookups.deficiencies.find((item) => item.id === photo.deficiencyId) : undefined);

  const derivedPhase =
    phase ??
    (deficiency?.phaseId ? lookups.phases.find((item) => item.id === deficiency.phaseId) : undefined) ??
    (gate?.phaseId ? lookups.phases.find((item) => item.id === gate.phaseId) : undefined) ??
    (photo?.phaseId ? lookups.phases.find((item) => item.id === photo.phaseId) : undefined);
  const derivedGate =
    gate ??
    (photo?.gateId ? lookups.gates.find((item) => item.id === photo.gateId) : undefined);
  const derivedProject =
    project ??
    (derivedPhase ? lookups.projects.find((item) => item.id === derivedPhase.projectId) : undefined) ??
    (derivedGate ? lookups.projects.find((item) => item.id === derivedGate.projectId) : undefined) ??
    (deficiency ? lookups.projects.find((item) => item.id === deficiency.projectId) : undefined) ??
    (photo ? lookups.projects.find((item) => item.id === photo.projectId) : undefined);

  return {
    deficiency,
    gate: derivedGate,
    phase: derivedPhase,
    project: derivedProject,
  };
}

function formatStatusText(event: AuditEvent) {
  if (typeof event.nextValue === "string") {
    return STATUS_LABEL[event.nextValue] ?? fallbackLabel(event.nextValue);
  }

  if (
    event.nextValue &&
    typeof event.nextValue === "object" &&
    "status" in event.nextValue &&
    typeof event.nextValue.status === "string"
  ) {
    return STATUS_LABEL[event.nextValue.status] ?? fallbackLabel(event.nextValue.status);
  }

  return undefined;
}

function formatInventoryChanges(value: unknown) {
  if (!Array.isArray(value)) return undefined;

  const parts = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const change = item as { label?: unknown; previousQuantity?: unknown; quantity?: unknown };
      if (
        typeof change.label !== "string" ||
        typeof change.previousQuantity !== "number" ||
        typeof change.quantity !== "number"
      ) {
        return null;
      }
      return `${change.label}: ${change.previousQuantity} → ${change.quantity}`;
    })
    .filter((item): item is string => Boolean(item));

  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function formatMetadataText(metadata?: Record<string, unknown>) {
  if (!metadata) return undefined;

  const inventoryChanges = formatInventoryChanges(metadata.inventoryChanges);
  if (inventoryChanges) return inventoryChanges;

  const parts = Object.entries(metadata)
    .map(([key, value]) => {
      if (!value || key === "phaseId" || key.endsWith("Id")) return null;
      if (key === "inspectorName") return `Inspector: ${value}`;
      if (key === "notes") return `Notes: ${value}`;
      if (key === "note") return `Note: ${value}`;
      if (key === "summary") return `Picked up: ${value}`;
      if (key === "subcontractorName") return `Subcontractor: ${value}`;
      return null;
    })
    .filter((value): value is string => Boolean(value));

  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function formatContext(event: AuditEvent, lookups: AuditLookups) {
  const context = findEventContext(event, lookups);
  const parts: string[] = [];

  if (context.project) parts.push(context.project.name);
  if (context.phase) parts.push(PHASE_LABEL[context.phase.type] ?? context.phase.type);
  if (context.gate) parts.push(GATE_LABEL[context.gate.type] ?? context.gate.type);
  if (context.deficiency) parts.push(context.deficiency.title);

  return parts.length > 0 ? parts.join(" · ") : event.entityId;
}

export function getAuditActionLabel(action: string) {
  return AUDIT_ACTION_LABEL[action] ?? fallbackLabel(action);
}

export function getAuditEntityLabel(entityType: string) {
  return AUDIT_ENTITY_LABEL[entityType] ?? fallbackLabel(entityType);
}

export function resolveProjectId(
  event: AuditEvent,
  phases: { id: string; projectId: string }[],
  gates: { id: string; projectId: string }[],
  deficiencies: { id: string; projectId: string }[],
  photoEvidence: { id: string; projectId: string }[] = [],
) {
  if (event.entityType === "project") return event.entityId;
  if (event.entityType === "phase") return phases.find((item) => item.id === event.entityId)?.projectId;
  if (event.entityType === "gate") return gates.find((item) => item.id === event.entityId)?.projectId;
  if (event.entityType === "deficiency") return deficiencies.find((item) => item.id === event.entityId)?.projectId;
  if (event.entityType === "photo_evidence") return photoEvidence.find((item) => item.id === event.entityId)?.projectId;
  return undefined;
}

export function resolveEventUrl(
  event: AuditEvent,
  lookups: AuditLookups,
): string | undefined {
  if (event.entityType === "project") {
    return `/project/${event.entityId}`;
  }
  if (event.entityType === "phase") {
    const phase = lookups.phases.find((p) => p.id === event.entityId);
    if (!phase) return undefined;
    return `/project/${phase.projectId}/phase/${phase.id}`;
  }
  if (event.entityType === "gate") {
    const gate = lookups.gates.find((g) => g.id === event.entityId);
    const phase = gate?.phaseId
      ? lookups.phases.find((p) => p.id === gate.phaseId)
      : undefined;
    if (phase) return `/project/${phase.projectId}/phase/${phase.id}`;
    if (gate) return `/project/${gate.projectId}`;
    return undefined;
  }
  if (event.entityType === "deficiency") {
    const deficiency = lookups.deficiencies.find((d) => d.id === event.entityId);
    const phase = deficiency
      ? lookups.phases.find((p) => p.id === deficiency.phaseId)
      : undefined;
    if (phase) return `/project/${phase.projectId}/phase/${phase.id}`;
    if (deficiency) return `/project/${deficiency.projectId}`;
    return undefined;
  }
  if (event.entityType === "photo_evidence") {
    const photo = lookups.photoEvidence?.find((p) => p.id === event.entityId);
    const phase = photo?.phaseId
      ? lookups.phases.find((p) => p.id === photo.phaseId)
      : undefined;
    if (phase) return `/project/${phase.projectId}/phase/${phase.id}`;
    if (photo) return `/project/${photo.projectId}`;
    return undefined;
  }
  return undefined;
}

export function formatAuditEvent(event: AuditEvent, lookups: AuditLookups): AuditEventDisplay {
  const actor = lookups.users?.find((item) => item.id === event.actorUserId);
  const actionLabel = getAuditActionLabel(event.action);
  const entityLabel = getAuditEntityLabel(event.entityType);
  const context = formatContext(event, lookups);
  const metadataText = formatMetadataText(event.metadata);
  const statusText = formatStatusText(event);
  const linkUrl = resolveEventUrl(event, lookups);

  // Handle schedule changes from previousValue/nextValue (top-level event properties)
  let scheduleChangeText: string | undefined;
  if (
    event.previousValue &&
    event.nextValue &&
    typeof event.previousValue === "object" &&
    typeof event.nextValue === "object"
  ) {
    const prev = event.previousValue as Record<string, unknown>;
    const next = event.nextValue as Record<string, unknown>;
    
    if (
      typeof prev.scheduledStart === "string" ||
      typeof prev.scheduledEnd === "string" ||
      typeof next.scheduledStart === "string" ||
      typeof next.scheduledEnd === "string"
    ) {
      const parts: string[] = [];
      
      if (
        typeof prev.scheduledStart === "string" &&
        typeof next.scheduledStart === "string" &&
        prev.scheduledStart !== next.scheduledStart
      ) {
        parts.push(`Start: ${formatDateWithOptions(prev.scheduledStart)} → ${formatDateWithOptions(next.scheduledStart)}`);
      }
      
      if (
        typeof prev.scheduledEnd === "string" &&
        typeof next.scheduledEnd === "string" &&
        prev.scheduledEnd !== next.scheduledEnd
      ) {
        parts.push(`End: ${formatDateWithOptions(prev.scheduledEnd)} → ${formatDateWithOptions(next.scheduledEnd)}`);
      }
      
      if (parts.length > 0) scheduleChangeText = parts.join(", ");
    }
  }

  const priority = AUDIT_ACTION_PRIORITY[event.action];
  return {
    actionLabel,
    actorInitials: actor ? initials(actor.fullName) : undefined,
    actorName: actor?.fullName,
    tone: AUDIT_ACTION_TONE[event.action] ?? "info",
    priority,
    context,
    entityLabel,
    linkUrl,
    metadataText: scheduleChangeText ?? metadataText,
    priorityBorderClass:
      priority === "danger"
        ? "border-l-4 border-l-status-blocked"
        : priority === "warning"
          ? "border-l-4 border-l-status-attention"
          : undefined,
    relativeTime: relativeTime(event.createdAt),
    searchText: [actionLabel, entityLabel, context, scheduleChangeText ?? metadataText, statusText].filter(Boolean).join(" ").toLowerCase(),
    statusText,
    title: actionLabel,
  };
}
