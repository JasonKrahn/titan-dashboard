import type {
  AuditEvent,
  Deficiency,
  Gate,
  Phase,
  Project,
  User,
} from "@/lib/types";
import { GATE_LABEL, initials, PHASE_LABEL, relativeTime, STATUS_LABEL } from "@/lib/derived";
import type { BadgeTone } from "@/components/ui/badge";


export const AUDIT_ACTION_LABEL: Record<string, string> = {
  activate_project: "Project activated",
  archive_project: "Project archived",
  attic_gate_updated: "Attic gate updated",
  complete_project: "Project completed",
  create_client: "Client created",
  create_deficiency: "Deficiency opened",
  create_project: "Project created",
  create_subcontractor: "Subcontractor created",
  deleted: "Deleted",
  deficiency_opened: "Deficiency opened",
  fail_gate: "Gate failed",
  inspection_completed: "Inspection completed",
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
  create_deficiency: "warning",
  create_phase: "success",
  create_project: "success",
  create_subcontractor: "success",
  created: "success",
  deficiency_opened: "warning",
  deleted: "neutral",
  fail_gate: "danger",
  inspection_completed: "success",
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
  subcontractor_contact: "Subcontractor",
  user: "User",
};

export interface AuditLookups {
  projects: Project[];
  phases: Phase[];
  gates: Gate[];
  deficiencies: Deficiency[];
  users?: User[];
}

export interface AuditEventDisplay {
  actionLabel: string;
  actorInitials?: string;
  actorName?: string;
  tone: BadgeTone;
  priority?: "danger" | "warning";
  context: string;
  entityLabel: string;
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
  const deficiency = event.entityType === "deficiency"
    ? lookups.deficiencies.find((item) => item.id === event.entityId)
    : undefined;

  const derivedPhase =
    phase ??
    (deficiency?.phaseId ? lookups.phases.find((item) => item.id === deficiency.phaseId) : undefined) ??
    (gate?.phaseId ? lookups.phases.find((item) => item.id === gate.phaseId) : undefined);
  const derivedProject =
    project ??
    (derivedPhase ? lookups.projects.find((item) => item.id === derivedPhase.projectId) : undefined) ??
    (gate ? lookups.projects.find((item) => item.id === gate.projectId) : undefined) ??
    (deficiency ? lookups.projects.find((item) => item.id === deficiency.projectId) : undefined);

  return {
    deficiency,
    gate,
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

function formatMetadataText(metadata?: Record<string, unknown>) {
  if (!metadata) return undefined;

  const parts = Object.entries(metadata)
    .map(([key, value]) => {
      if (!value || key === "phaseId" || key.endsWith("Id")) return null;
      if (key === "inspectorName") return `Inspector: ${value}`;
      if (key === "notes") return `Notes: ${value}`;
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
) {
  if (event.entityType === "project") return event.entityId;
  if (event.entityType === "phase") return phases.find((item) => item.id === event.entityId)?.projectId;
  if (event.entityType === "gate") return gates.find((item) => item.id === event.entityId)?.projectId;
  if (event.entityType === "deficiency") return deficiencies.find((item) => item.id === event.entityId)?.projectId;
  return undefined;
}

export function formatAuditEvent(event: AuditEvent, lookups: AuditLookups): AuditEventDisplay {
  const actor = lookups.users?.find((item) => item.id === event.actorUserId);
  const actionLabel = getAuditActionLabel(event.action);
  const entityLabel = getAuditEntityLabel(event.entityType);
  const context = formatContext(event, lookups);
  const metadataText = formatMetadataText(event.metadata);
  const statusText = formatStatusText(event);

  const priority = AUDIT_ACTION_PRIORITY[event.action];
  return {
    actionLabel,
    actorInitials: actor ? initials(actor.fullName) : undefined,
    actorName: actor?.fullName,
    tone: AUDIT_ACTION_TONE[event.action] ?? "info",
    priority,
    context,
    entityLabel,
    metadataText,
    priorityBorderClass:
      priority === "danger"
        ? "border-l-4 border-l-status-blocked"
        : priority === "warning"
          ? "border-l-4 border-l-status-attention"
          : undefined,
    relativeTime: relativeTime(event.createdAt),
    searchText: [actionLabel, entityLabel, context, metadataText, statusText].filter(Boolean).join(" ").toLowerCase(),
    statusText,
    title: actionLabel,
  };
}
