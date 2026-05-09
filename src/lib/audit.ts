import type {
  AuditEvent,
  Deficiency,
  Gate,
  Phase,
  Project,
  User,
} from "@/lib/types";
import { GATE_LABEL, initials, PHASE_LABEL, relativeTime, STATUS_LABEL } from "@/lib/derived";

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

export const AUDIT_ACTION_COLOR: Record<string, string> = {
  activate_project: "bg-blue-100 text-blue-700 border-blue-200",
  archive_project: "bg-slate-100 text-slate-600 border-slate-200",
  attic_gate_updated: "bg-blue-100 text-blue-700 border-blue-200",
  complete_project: "bg-emerald-100 text-emerald-700 border-emerald-200",
  create_client: "bg-emerald-100 text-emerald-700 border-emerald-200",
  create_deficiency: "bg-amber-100 text-amber-700 border-amber-200",
  create_project: "bg-emerald-100 text-emerald-700 border-emerald-200",
  create_subcontractor: "bg-emerald-100 text-emerald-700 border-emerald-200",
  deleted: "bg-slate-100 text-slate-600 border-slate-200",
  deficiency_opened: "bg-amber-100 text-amber-700 border-amber-200",
  fail_gate: "bg-red-100 text-red-700 border-red-200",
  inspection_completed: "bg-teal-100 text-teal-700 border-teal-200",
  pass_gate: "bg-teal-100 text-teal-700 border-teal-200",
  phase_ready_for_inspection: "bg-blue-100 text-blue-700 border-blue-200",
  photo_uploaded: "bg-purple-100 text-purple-700 border-purple-200",
  project_notes_updated: "bg-blue-100 text-blue-700 border-blue-200",
  resolve_deficiency: "bg-teal-100 text-teal-700 border-teal-200",
  site_check_blocked: "bg-red-100 text-red-700 border-red-200",
  site_check_cleared: "bg-teal-100 text-teal-700 border-teal-200",
  site_check_completed: "bg-teal-100 text-teal-700 border-teal-200",
  status_changed: "bg-blue-100 text-blue-700 border-blue-200",
  subcontractor_assigned: "bg-blue-100 text-blue-700 border-blue-200",
  update_deficiency: "bg-blue-100 text-blue-700 border-blue-200",
  updated: "bg-blue-100 text-blue-700 border-blue-200",
  upload_photo: "bg-purple-100 text-purple-700 border-purple-200",
  uploaded: "bg-purple-100 text-purple-700 border-purple-200",
};

export const AUDIT_PRIORITY_BORDER: Record<string, string> = {
  create_deficiency: "border-l-4 border-l-amber-400",
  deficiency_opened: "border-l-4 border-l-amber-400",
  fail_gate: "border-l-4 border-l-red-400",
  site_check_blocked: "border-l-4 border-l-red-400",
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
  colorClass: string;
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

  return {
    actionLabel,
    actorInitials: actor ? initials(actor.fullName) : undefined,
    actorName: actor?.fullName,
    colorClass: AUDIT_ACTION_COLOR[event.action] ?? "",
    context,
    entityLabel,
    metadataText,
    priorityBorderClass: AUDIT_PRIORITY_BORDER[event.action],
    relativeTime: relativeTime(event.createdAt),
    searchText: [actionLabel, entityLabel, context, metadataText, statusText].filter(Boolean).join(" ").toLowerCase(),
    statusText,
    title: actionLabel,
  };
}
