// Prototype API adapter. UI calls these via lib/api/index.ts.
import type {
  ApiResult,
  AuditEvent,
  ClientRecord,
  CompleteInspectionInput,
  CreateDeficiencyInput,
  CreateSubcontractorInput,
  Deficiency,
  DeficiencySeverity,
  Gate,
  Phase,
  PhaseDetail,
  PhotoEvidence,
  Project,
  ProjectDetail,
  ProjectFilters,
  SubcontractorContact,
  TradeType,
  UpdateDeficiencyInput,
  UpdateSubcontractorInput,
  User,
} from "@/lib/types";
import {
  seedAuditEvents,
  seedClients,
  seedDeficiencies,
  seedGates,
  seedPhases,
  seedPhotos,
  seedProjects,
  seedSubcontractors,
  seedUsers,
} from "./seed";

const SIMULATED_LATENCY_MS = 250;

export const photoBlobUrls = new Map<string, string>();

export interface UploadPhotoEvidenceInput {
  projectId: string;
  phaseId?: string;
  gateId?: string;
  deficiencyId?: string;
  purpose: PhotoEvidence["purpose"];
  file: File;
  contentHash?: string;
}

export interface MarkPhaseReadyForInspectionInput {
  phaseId: string;
  projectId: string;
}

const delay = <T,>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), SIMULATED_LATENCY_MS));

const ok = <T,>(data: T): ApiResult<T> => ({ ok: true, data });

// Mutable "current user" for prototype role switching.
let currentUserId = "user-admin";

export function setCurrentUser(userId: string) {
  currentUserId = userId;
}

export async function getCurrentUser(): Promise<ApiResult<User>> {
  const u = seedUsers.find((x) => x.id === currentUserId);
  if (!u) {
    return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });
  }
  return delay(ok(u));
}

export async function getUsers(): Promise<ApiResult<User[]>> {
  return delay(ok(seedUsers));
}

export async function updateUser(userId: string, input: UpdateUserInput): Promise<ApiResult<User>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });

  const user = seedUsers.find((u) => u.id === userId);
  if (!user) return delay({ ok: false, error: { code: "NOT_FOUND", message: "User not found" } });

  if (!input.fullName?.trim()) {
    return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "Name is required", fieldErrors: { fullName: "Required" } } });
  }

  const nowIso = new Date().toISOString();
  user.fullName = input.fullName.trim();
  user.phone = input.phone?.trim() || undefined;
  user.email = input.email?.trim() || undefined;
  user.updatedAt = nowIso;

  seedAuditEvents.unshift({
    id: `audit-${Date.now()}`,
    entityType: "user",
    entityId: user.id,
    action: "updated",
    actorUserId: me.id,
    createdAt: nowIso,
  });

  return delay(ok(user));
}

export async function getClients(): Promise<ApiResult<ClientRecord[]>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });

  if (me.role === "project_manager") {
    const visibleClientIds = new Set(
      seedProjects
        .filter((p) => p.assignedProjectManagerId === me.id)
        .map((p) => p.clientId),
    );
    return delay(ok(seedClients.filter((client) => visibleClientIds.has(client.id))));
  }

  return delay(ok(seedClients));
}

function projectHasBlockedWork(projectId: string): boolean {
  const phaseBlocked = seedPhases.some((p) => p.projectId === projectId && p.status === "blocked");
  const gateBlockedOrFailed = seedGates.some(
    (g) => g.projectId === projectId && (g.status === "blocked" || g.status === "failed"),
  );
  return phaseBlocked || gateBlockedOrFailed;
}

function projectMissingAtticEvidence(p: Project): boolean {
  // "Missing" = needs attic check but no confirmed attic photo evidence yet.
  if (p.status === "draft" || p.status === "archived") return false;
  const confirmed = seedPhotos.some(
    (ph) => ph.projectId === p.id && ph.purpose === "attic_check" && ph.status === "confirmed",
  );
  return !confirmed && p.atticCheckStatus !== "passed";
}

export async function getProjects(filters?: ProjectFilters): Promise<ApiResult<Project[]>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });

  let result = [...seedProjects];

  // PM permission boundary: enforced inside adapter, not UI.
  if (me.role === "project_manager") {
    result = result.filter((p) => p.assignedProjectManagerId === me.id);
  }

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.projectNumber.toLowerCase().includes(q) ||
        p.siteAddress.toLowerCase().includes(q),
    );
  }
  if (filters?.clientId) {
    result = result.filter((p) => p.clientId === filters.clientId);
  }
  if (filters?.status?.length) {
    result = result.filter((p) => filters.status!.includes(p.status));
  }
  if (filters?.assignedProjectManagerId) {
    result = result.filter((p) => p.assignedProjectManagerId === filters.assignedProjectManagerId);
  }
  if (filters?.hasBlockedWork) {
    result = result.filter((p) => projectHasBlockedWork(p.id));
  }
  if (filters?.missingAtticEvidence) {
    result = result.filter((p) => projectMissingAtticEvidence(p));
  }

  // Sort by most recently updated.
  result.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return delay(ok(result));
}

export async function getProject(id: string): Promise<ApiResult<ProjectDetail>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });

  const project = seedProjects.find((p) => p.id === id);
  if (!project) {
    return delay({ ok: false, error: { code: "NOT_FOUND", message: "Project not found" } });
  }

  // PM permission boundary
  if (me.role === "project_manager" && project.assignedProjectManagerId !== me.id) {
    return delay({ ok: false, error: { code: "FORBIDDEN", message: "Access denied" } });
  }

  const client = seedClients.find((c) => c.id === project.clientId);
  if (!client) {
    return delay({ ok: false, error: { code: "NOT_FOUND", message: "Client not found" } });
  }

  const detail: ProjectDetail = {
    project,
    client,
    assignedProjectManager: seedUsers.find((u) => u.id === project.assignedProjectManagerId),
    phases: seedPhases.filter((p) => p.projectId === id),
    gates: seedGates.filter((g) => g.projectId === id),
    deficiencies: seedDeficiencies.filter((d) => d.projectId === id),
    photoEvidence: seedPhotos.filter((ph) => ph.projectId === id),
    subcontractors: seedSubcontractors,
    auditEvents: seedAuditEvents
      .filter((a) => {
        if (a.entityId === id) return true;
        if (a.entityType === "phase") {
          const phase = seedPhases.find((p) => p.id === a.entityId);
          return phase?.projectId === id;
        }
        if (a.entityType === "gate") {
          const gate = seedGates.find((g) => g.id === a.entityId);
          return gate?.projectId === id;
        }
        if (a.entityType === "deficiency") {
          const deficiency = seedDeficiencies.find((d) => d.id === a.entityId);
          return deficiency?.projectId === id;
        }
        return false;
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
  };

  return delay(ok(detail));
}

export async function getAllPhases() { return delay(ok(seedPhases)); }
export async function getAllGates() { return delay(ok(seedGates)); }
export async function getAllDeficiencies() { return delay(ok(seedDeficiencies)); }
export async function getAllPhotos() { return delay(ok(seedPhotos)); }

export async function getSubcontractorContacts(): Promise<ApiResult<SubcontractorContact[]>> {
  return delay(ok(seedSubcontractors));
}

export async function getAuditEvents(): Promise<ApiResult<AuditEvent[]>> {
  return delay(ok(seedAuditEvents));
}

export async function getPhase(phaseId: string): Promise<ApiResult<PhaseDetail>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });

  const phase = seedPhases.find((p) => p.id === phaseId);
  if (!phase) return delay({ ok: false, error: { code: "NOT_FOUND", message: "Phase not found" } });

  const project = seedProjects.find((p) => p.id === phase.projectId);
  if (!project) return delay({ ok: false, error: { code: "NOT_FOUND", message: "Project not found" } });

  if (me.role === "project_manager" && project.assignedProjectManagerId !== me.id) {
    return delay({ ok: false, error: { code: "FORBIDDEN", message: "Access denied" } });
  }

  const detail: PhaseDetail = {
    phase,
    project,
    assignedProjectManager: seedUsers.find((u) => u.id === project.assignedProjectManagerId),
    gates: seedGates.filter((g) => g.phaseId === phaseId),
    deficiencies: seedDeficiencies.filter((d) => d.phaseId === phaseId),
    photoEvidence: seedPhotos.filter((ph) => ph.phaseId === phaseId),
    subcontractors: seedSubcontractors,
    auditEvents: seedAuditEvents
      .filter((a) => {
        if (a.entityId === phaseId) return true;
        if (a.entityType === "gate") {
          const gate = seedGates.find((g) => g.id === a.entityId);
          return gate?.phaseId === phaseId;
        }
        if (a.entityType === "deficiency") {
          const deficiency = seedDeficiencies.find((d) => d.id === a.entityId);
          return deficiency?.phaseId === phaseId;
        }
        return false;
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
  };
  return delay(ok(detail));
}

export interface CreateClientInput {
  name: string;
  primaryContactName?: string;
  phone?: string;
  email?: string;
  billingAddress?: string;
  notes?: string;
}

export interface UpdateUserInput {
  fullName?: string;
  phone?: string;
  email?: string;
}

export async function createClient(input: CreateClientInput): Promise<ApiResult<ClientRecord>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });
  if (me.role !== "admin") return delay({ ok: false, error: { code: "FORBIDDEN", message: "Admins only" } });
  if (!input.name?.trim()) {
    return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "Name is required", fieldErrors: { name: "Required" } } });
  }
  const nowIso = new Date().toISOString();
  const client: ClientRecord = {
    id: `client-${Date.now()}`,
    name: input.name.trim(),
    primaryContactName: input.primaryContactName?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    email: input.email?.trim() || undefined,
    billingAddress: input.billingAddress?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    archived: false,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  seedClients.push(client);
  seedAuditEvents.unshift({
    id: `audit-${Date.now()}`,
    entityType: "client_record",
    entityId: client.id,
    action: "create_client",
    actorUserId: me.id,
    createdAt: nowIso,
  });
  return delay(ok(client));
}

export async function updateClient(id: string, input: CreateClientInput): Promise<ApiResult<ClientRecord>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });
  if (me.role !== "admin") return delay({ ok: false, error: { code: "FORBIDDEN", message: "Admins only" } });
  if (!input.name?.trim()) {
    return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "Name is required", fieldErrors: { name: "Required" } } });
  }

  const client = seedClients.find((c) => c.id === id);
  if (!client) return delay({ ok: false, error: { code: "NOT_FOUND", message: "Client not found" } });

  const nowIso = new Date().toISOString();
  client.name = input.name.trim();
  client.primaryContactName = input.primaryContactName?.trim() || undefined;
  client.phone = input.phone?.trim() || undefined;
  client.email = input.email?.trim() || undefined;
  client.billingAddress = input.billingAddress?.trim() || undefined;
  client.notes = input.notes?.trim() || undefined;
  client.updatedAt = nowIso;

  seedAuditEvents.unshift({
    id: `audit-${Date.now()}`,
    entityType: "client_record",
    entityId: client.id,
    action: "updated",
    actorUserId: me.id,
    createdAt: nowIso,
  });

  return delay(ok(client));
}

export interface CreateProjectInput {
  clientId: string;
  projectNumber: string;
  name: string;
  siteAddress: string;
  assignedProjectManagerId?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  finishLevel?: 1 | 2 | 3 | 4 | 5;
}

export interface UpdateProjectInput {
  name: string;
  siteAddress: string;
  assignedProjectManagerId?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  finishLevel?: 1 | 2 | 3 | 4 | 5;
}

export interface CompleteSiteCheckInput {
  gateId: string;
  phaseId: string;
  projectId: string;
  notes?: string;
  photo?: File;
}

export interface BlockSiteCheckInput {
  gateId: string;
  phaseId: string;
  projectId: string;
  notes: string;
  photo: File;
}

export interface UnblockSiteCheckInput {
  gateId: string;
  phaseId: string;
  projectId: string;
}

export interface UpdateProjectNotesInput {
  projectId: string;
  notes: string;
}

export interface UpdateAtticGateInput {
  gateId: string;
  projectId: string;
  callInDate?: string;
  callInSubcontractorId?: string;
  installDate?: string;
  photo?: File;
}

export async function completeSiteCheck(input: CompleteSiteCheckInput): Promise<ApiResult<Gate>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });

  const gate = seedGates.find((g) => g.id === input.gateId);
  if (!gate) return delay({ ok: false, error: { code: "NOT_FOUND", message: "Gate not found" } });

  if (gate.type !== "site_check") {
    return delay({ ok: false, error: { code: "STATE_VIOLATION", message: "Gate is not a site_check gate" } });
  }
  if (gate.status !== "not_started") {
    return delay({ ok: false, error: { code: "STATE_VIOLATION", message: "Gate already completed" } });
  }

  const nowIso = new Date().toISOString();

  // Update gate to passed
  gate.status = "passed";
  gate.completedByUserId = me.id;
  gate.completedAt = nowIso;
  gate.notes = input.notes || undefined;
  gate.updatedAt = nowIso;

  // Update phase to in_progress
  const phase = seedPhases.find((p) => p.id === input.phaseId);
  if (phase && phase.status === "not_started") {
    phase.status = "in_progress";
    phase.updatedAt = nowIso;
  }

  // If insulation phase, set project to active
  const project = seedProjects.find((p) => p.id === input.projectId);
  if (project && phase?.type === "insulation" && project.status === "draft") {
    project.status = "active";
    project.updatedAt = nowIso;
  }

  // Store photo evidence if provided
  if (input.photo) {
    const photoId = `photo-${Date.now()}`;
    seedPhotos.push({
      id: photoId,
      projectId: input.projectId,
      phaseId: input.phaseId,
      gateId: input.gateId,
      purpose: "site_check",
      objectKey: `site-checks/${photoId}.jpg`,
      mimeType: input.photo.type || "image/jpeg",
      fileSizeBytes: input.photo.size,
      status: "confirmed",
      uploadedByUserId: me.id,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    photoBlobUrls.set(photoId, URL.createObjectURL(input.photo));
  }

  // Audit event
  seedAuditEvents.unshift({
    id: `audit-${Date.now()}`,
    entityType: "gate",
    entityId: gate.id,
    action: "site_check_completed",
    actorUserId: me.id,
    metadata: { phaseId: input.phaseId, notes: input.notes },
    createdAt: nowIso,
  });

  return delay(ok(gate));
}

export async function blockSiteCheck(input: BlockSiteCheckInput): Promise<ApiResult<Gate>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });

  const gate = seedGates.find((g) => g.id === input.gateId);
  if (!gate) return delay({ ok: false, error: { code: "NOT_FOUND", message: "Gate not found" } });

  if (gate.type !== "site_check") {
    return delay({ ok: false, error: { code: "STATE_VIOLATION", message: "Gate is not a site_check gate" } });
  }
  if (gate.status !== "not_started") {
    return delay({ ok: false, error: { code: "STATE_VIOLATION", message: "Gate already completed" } });
  }

  if (!input.notes?.trim()) {
    return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "Notes are required to block a site check" } });
  }
  if (!input.photo) {
    return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "Photo evidence is required to block a site check" } });
  }

  const nowIso = new Date().toISOString();

  // Update gate to blocked
  gate.status = "blocked";
  gate.notes = input.notes.trim();
  gate.updatedAt = nowIso;

  // Update phase to blocked
  const phase = seedPhases.find((p) => p.id === input.phaseId);
  if (phase && phase.status === "not_started") {
    phase.status = "blocked";
    phase.updatedAt = nowIso;
  }

  // Store photo evidence
  const photoId = `photo-${Date.now()}`;
  seedPhotos.push({
    id: photoId,
    projectId: input.projectId,
    phaseId: input.phaseId,
    gateId: input.gateId,
    purpose: "site_check",
    objectKey: `site-checks/${photoId}.jpg`,
    mimeType: input.photo.type || "image/jpeg",
    fileSizeBytes: input.photo.size,
    status: "confirmed",
    uploadedByUserId: me.id,
    createdAt: nowIso,
    updatedAt: nowIso,
  });
  photoBlobUrls.set(photoId, URL.createObjectURL(input.photo));

  // Audit event
  seedAuditEvents.unshift({
    id: `audit-${Date.now()}`,
    entityType: "gate",
    entityId: gate.id,
    action: "site_check_blocked",
    actorUserId: me.id,
    metadata: { phaseId: input.phaseId, notes: input.notes },
    createdAt: nowIso,
  });

  return delay(ok(gate));
}

export async function unblockSiteCheck(input: UnblockSiteCheckInput): Promise<ApiResult<Gate>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });

  const gate = seedGates.find((g) => g.id === input.gateId);
  if (!gate) return delay({ ok: false, error: { code: "NOT_FOUND", message: "Gate not found" } });

  if (gate.type !== "site_check") {
    return delay({ ok: false, error: { code: "STATE_VIOLATION", message: "Gate is not a site_check gate" } });
  }
  if (gate.status !== "blocked") {
    return delay({ ok: false, error: { code: "STATE_VIOLATION", message: "Gate is not blocked" } });
  }

  const nowIso = new Date().toISOString();

  // Update gate to passed
  gate.status = "passed";
  gate.completedByUserId = me.id;
  gate.completedAt = nowIso;
  gate.updatedAt = nowIso;

  // Update phase to in_progress
  const phase = seedPhases.find((p) => p.id === input.phaseId);
  if (phase && phase.status === "blocked") {
    phase.status = "in_progress";
    phase.updatedAt = nowIso;
  }

  // Audit event
  seedAuditEvents.unshift({
    id: `audit-${Date.now()}`,
    entityType: "gate",
    entityId: gate.id,
    action: "site_check_cleared",
    actorUserId: me.id,
    metadata: { phaseId: input.phaseId },
    createdAt: nowIso,
  });

  return delay(ok(gate));
}

export async function updateProjectNotes(input: UpdateProjectNotesInput): Promise<ApiResult<Project>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });

  const project = seedProjects.find((p) => p.id === input.projectId);
  if (!project) return delay({ ok: false, error: { code: "NOT_FOUND", message: "Project not found" } });

  const nowIso = new Date().toISOString();

  project.notes = input.notes.trim() || undefined;
  project.notesLastEditedBy = me.id;
  project.notesLastEditedAt = nowIso;
  project.updatedAt = nowIso;

  // Audit event
  seedAuditEvents.unshift({
    id: `audit-${Date.now()}`,
    entityType: "project",
    entityId: project.id,
    action: "project_notes_updated",
    actorUserId: me.id,
    createdAt: nowIso,
  });

  return delay(ok(project));
}

export async function completeInspection(input: CompleteInspectionInput): Promise<ApiResult<Gate>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });

  const gate = seedGates.find((g) => g.id === input.gateId);
  if (!gate) return delay({ ok: false, error: { code: "NOT_FOUND", message: "Gate not found" } });

  if (gate.type !== "inspection") {
    return delay({ ok: false, error: { code: "STATE_VIOLATION", message: "Gate is not an inspection gate" } });
  }
  if (gate.status !== "not_started" && gate.status !== "failed" && gate.status !== "in_progress") {
    return delay({ ok: false, error: { code: "STATE_VIOLATION", message: "Gate already completed" } });
  }

  if (!input.inspectorName?.trim()) {
    return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "Inspector name is required" } });
  }
  if (!input.inspectionDate) {
    return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "Inspection date is required" } });
  }
  if (!input.passed && (!input.notes?.trim() || !input.photo)) {
    return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "Notes and photo are required for failed inspection" } });
  }
  if (!input.passed && (!input.deficiencyTitle?.trim() || !input.deficiencyDescription?.trim() || !input.deficiencySeverity)) {
    return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "Deficiency details are required for failed inspection" } });
  }

  // Block inspection if there are open or in-progress deficiencies
  if (input.passed) {
    const phaseDeficiencies = seedDeficiencies.filter((d) => d.phaseId === input.phaseId);
    const unresolvedDeficiencies = phaseDeficiencies.filter(
      (d) => d.status === "open" || d.status === "in_progress"
    );
    if (unresolvedDeficiencies.length > 0) {
      return delay({
        ok: false,
        error: {
          code: "STATE_VIOLATION",
          message: `Cannot pass inspection with ${unresolvedDeficiencies.length} unresolved ${unresolvedDeficiencies.length === 1 ? "deficiency" : "deficiencies"}`,
        },
      });
    }
  }

  const nowIso = new Date().toISOString();

  // Update gate status
  gate.status = input.passed ? "passed" : "failed";
  gate.completedByUserId = me.id;
  gate.completedAt = nowIso;
  gate.notes = input.notes || undefined;
  gate.updatedAt = nowIso;

  // Update phase status
  const phase = seedPhases.find((p) => p.id === input.phaseId);
  if (phase) {
    phase.status = input.passed ? "closed" : "blocked";
    if (input.passed) {
      phase.closedAt = nowIso;
    }
    phase.updatedAt = nowIso;
  }

  // Store photo evidence if provided
  if (input.photo) {
    const photoId = `photo-${Date.now()}`;
    seedPhotos.push({
      id: photoId,
      projectId: input.projectId,
      phaseId: input.phaseId,
      gateId: input.gateId,
      purpose: "inspection",
      objectKey: `inspections/${photoId}.jpg`,
      mimeType: input.photo.type || "image/jpeg",
      fileSizeBytes: input.photo.size,
      status: "confirmed",
      uploadedByUserId: me.id,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    photoBlobUrls.set(photoId, URL.createObjectURL(input.photo));
  }

  // Create deficiency if failed
  if (!input.passed && input.deficiencyTitle && input.deficiencyDescription && input.deficiencySeverity) {
    const deficiencyId = `def-${Date.now()}`;
    seedDeficiencies.push({
      id: deficiencyId,
      projectId: input.projectId,
      phaseId: input.phaseId,
      title: input.deficiencyTitle,
      description: input.deficiencyDescription,
      severity: input.deficiencySeverity,
      status: "open",
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    // Link photo to deficiency if provided
    if (input.photo) {
      const photo = seedPhotos[seedPhotos.length - 1];
      if (photo) {
        photo.deficiencyId = deficiencyId;
        photo.purpose = "deficiency_before";
        photo.updatedAt = nowIso;
      }
    }
  }

  // Audit event
  seedAuditEvents.unshift({
    id: `audit-${Date.now()}`,
    entityType: "gate",
    entityId: gate.id,
    action: input.passed ? "inspection_passed" : "inspection_failed",
    actorUserId: me.id,
    metadata: {
      phaseId: input.phaseId,
      inspectorName: input.inspectorName,
      inspectionDate: input.inspectionDate,
      notes: input.notes,
    },
    createdAt: nowIso,
  });

  return delay(ok(gate));
}

export async function createDeficiency(input: CreateDeficiencyInput): Promise<ApiResult<Deficiency>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });

  if (!input.title?.trim()) {
    return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "Title is required" } });
  }

  const nowIso = new Date().toISOString();
  const deficiencyId = `def-${Date.now()}`;

  const deficiency: Deficiency = {
    id: deficiencyId,
    projectId: input.projectId,
    phaseId: input.phaseId,
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    severity: input.severity,
    status: "open",
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  seedDeficiencies.push(deficiency);

  // Store photo evidence if provided
  if (input.photo) {
    const photoId = `photo-${Date.now()}`;
    seedPhotos.push({
      id: photoId,
      projectId: input.projectId,
      phaseId: input.phaseId,
      deficiencyId,
      purpose: "deficiency_before",
      objectKey: `deficiencies/${photoId}.jpg`,
      mimeType: input.photo.type || "image/jpeg",
      fileSizeBytes: input.photo.size,
      status: "confirmed",
      uploadedByUserId: me.id,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    photoBlobUrls.set(photoId, URL.createObjectURL(input.photo));
  }

  // Audit event
  seedAuditEvents.unshift({
    id: `audit-${Date.now()}`,
    entityType: "deficiency",
    entityId: deficiencyId,
    action: "create_deficiency",
    actorUserId: me.id,
    createdAt: nowIso,
  });

  return delay(ok(deficiency));
}

export async function updateDeficiency(id: string, input: UpdateDeficiencyInput): Promise<ApiResult<Deficiency>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });

  const deficiency = seedDeficiencies.find((d) => d.id === id);
  if (!deficiency) return delay({ ok: false, error: { code: "NOT_FOUND", message: "Deficiency not found" } });

  const nowIso = new Date().toISOString();

  if (input.title !== undefined) deficiency.title = input.title.trim();
  if (input.description !== undefined) deficiency.description = input.description?.trim() || undefined;
  if (input.severity !== undefined) deficiency.severity = input.severity;
  if (input.status !== undefined) {
    deficiency.status = input.status;
    if (input.status === "resolved") {
      deficiency.resolvedAt = nowIso;
      deficiency.resolvedByUserId = me.id;
    }
  }
  deficiency.updatedAt = nowIso;

  // Store photo evidence if provided (for resolve action)
  if (input.photo && input.status === "resolved") {
    const photoId = `photo-${Date.now()}`;
    seedPhotos.push({
      id: photoId,
      projectId: deficiency.projectId,
      phaseId: deficiency.phaseId,
      deficiencyId: id,
      purpose: "deficiency_after",
      objectKey: `deficiencies/${photoId}.jpg`,
      mimeType: input.photo.type || "image/jpeg",
      fileSizeBytes: input.photo.size,
      status: "confirmed",
      uploadedByUserId: me.id,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    photoBlobUrls.set(photoId, URL.createObjectURL(input.photo));
  }

  // When resolving a deficiency, check if all phase deficiencies are now resolved/closed.
  // If so, transition the failed inspection gate to in_progress and unblock the phase.
  if (input.status === "resolved" || input.status === "closed") {
    const phaseId = deficiency.phaseId;
    const phaseDeficiencies = seedDeficiencies.filter((d) => d.phaseId === phaseId);
    const allResolved = phaseDeficiencies.every(
      (d) => d.status === "resolved" || d.status === "closed",
    );
    if (allResolved) {
      const inspectionGate = seedGates.find(
        (g) => g.phaseId === phaseId && g.type === "inspection" && g.status === "failed",
      );
      if (inspectionGate) {
        inspectionGate.status = "in_progress";
        inspectionGate.updatedAt = nowIso;
      }
      const phase = seedPhases.find((p) => p.id === phaseId);
      if (phase && phase.status === "blocked") {
        phase.status = "in_progress";
        phase.updatedAt = nowIso;
      }
    }
  }

  // Audit event
  seedAuditEvents.unshift({
    id: `audit-${Date.now()}`,
    entityType: "deficiency",
    entityId: id,
    action: "updated",
    actorUserId: me.id,
    previousValue: input.status ? { status: deficiency.status } : undefined,
    nextValue: input.status ? { status: input.status } : undefined,
    createdAt: nowIso,
  });

  return delay(ok(deficiency));
}

export async function assignSubcontractorToPhase(phaseId: string, subcontractorId: string): Promise<ApiResult<Phase>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });

  const phase = seedPhases.find((p) => p.id === phaseId);
  if (!phase) return delay({ ok: false, error: { code: "NOT_FOUND", message: "Phase not found" } });

  const subcontractor = seedSubcontractors.find((s) => s.id === subcontractorId);
  if (!subcontractor) return delay({ ok: false, error: { code: "NOT_FOUND", message: "Subcontractor not found" } });

  const nowIso = new Date().toISOString();
  phase.assignedSubcontractorId = subcontractorId;
  phase.updatedAt = nowIso;

  // Audit event
  seedAuditEvents.unshift({
    id: `audit-${Date.now()}`,
    entityType: "phase",
    entityId: phaseId,
    action: "subcontractor_assigned",
    actorUserId: me.id,
    metadata: { subcontractorId, subcontractorName: subcontractor.displayName },
    createdAt: nowIso,
  });

  return delay(ok(phase));
}

export async function markPhaseReadyForInspection(input: MarkPhaseReadyForInspectionInput): Promise<ApiResult<Phase>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });

  const phase = seedPhases.find((p) => p.id === input.phaseId);
  if (!phase) return delay({ ok: false, error: { code: "NOT_FOUND", message: "Phase not found" } });

  if (phase.status !== "in_progress" && phase.status !== "blocked") {
    return delay({ ok: false, error: { code: "STATE_VIOLATION", message: "Phase must be in_progress or blocked to mark ready for inspection" } });
  }

  const nowIso = new Date().toISOString();
  phase.status = "ready_for_inspection";
  phase.updatedAt = nowIso;

  // Audit event
  seedAuditEvents.unshift({
    id: `audit-${Date.now()}`,
    entityType: "phase",
    entityId: input.phaseId,
    action: "phase_ready_for_inspection",
    actorUserId: me.id,
    createdAt: nowIso,
  });

  return delay(ok(phase));
}

export interface UpdatePhaseInput {
  phaseId: string;
  scheduledStart?: string;
  scheduledEnd?: string;
}

export async function updatePhase(input: UpdatePhaseInput): Promise<ApiResult<Phase>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });

  const phase = seedPhases.find((p) => p.id === input.phaseId);
  if (!phase) return delay({ ok: false, error: { code: "NOT_FOUND", message: "Phase not found" } });

  const project = seedProjects.find((p) => p.id === phase.projectId);
  if (!project) return delay({ ok: false, error: { code: "NOT_FOUND", message: "Project not found" } });

  if (me.role === "project_manager" && project.assignedProjectManagerId !== me.id) {
    return delay({ ok: false, error: { code: "FORBIDDEN", message: "Access denied" } });
  }

  const newStart = input.scheduledStart ? new Date(input.scheduledStart) : (phase.scheduledStart ? new Date(phase.scheduledStart) : undefined);
  const newEnd = input.scheduledEnd ? new Date(input.scheduledEnd) : (phase.scheduledEnd ? new Date(phase.scheduledEnd) : undefined);

  // Validate: start must be before end
  if (newStart && newEnd && newStart > newEnd) {
    return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "Scheduled start must be before scheduled end" } });
  }

  // Validate: must fit within project dates
  if (project.scheduledStart && newStart && newStart < new Date(project.scheduledStart)) {
    return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "Phase start must be on or after project start date" } });
  }
  if (project.scheduledEnd && newEnd && newEnd > new Date(project.scheduledEnd)) {
    return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "Phase end must be on or before project end date" } });
  }

  // Validate: must not overlap with other phases
  const otherPhases = seedPhases.filter((p) => p.projectId === phase.projectId && p.id !== phase.id);
  for (const other of otherPhases) {
    const otherStart = other.scheduledStart ? new Date(other.scheduledStart) : undefined;
    const otherEnd = other.scheduledEnd ? new Date(other.scheduledEnd) : undefined;

    if (!otherStart || !otherEnd) continue; // Skip phases without dates

    // Check for overlap: (newStart < otherEnd) && (newEnd > otherStart)
    if (newStart && newEnd && newStart < otherEnd && newEnd > otherStart) {
      return delay({
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Phase dates overlap with another phase in this project",
        },
      });
    }
  }

  const nowIso = new Date().toISOString();
  if (input.scheduledStart !== undefined) phase.scheduledStart = input.scheduledStart;
  if (input.scheduledEnd !== undefined) phase.scheduledEnd = input.scheduledEnd;
  phase.updatedAt = nowIso;

  // Audit event
  seedAuditEvents.unshift({
    id: `audit-${Date.now()}`,
    entityType: "phase",
    entityId: phase.id,
    action: "updated",
    actorUserId: me.id,
    previousValue: {
      scheduledStart: phase.scheduledStart,
      scheduledEnd: phase.scheduledEnd,
    },
    nextValue: {
      scheduledStart: input.scheduledStart,
      scheduledEnd: input.scheduledEnd,
    },
    createdAt: nowIso,
  });

  return delay(ok(phase));
}

export async function createSubcontractorContact(input: CreateSubcontractorInput): Promise<ApiResult<SubcontractorContact>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });
  if (me.role !== "admin") return delay({ ok: false, error: { code: "FORBIDDEN", message: "Admins only" } });

  if (!input.displayName?.trim()) {
    return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "Display name is required", fieldErrors: { displayName: "Required" } } });
  }
  if (!input.trade) {
    return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "Trade is required", fieldErrors: { trade: "Required" } } });
  }
  if (!input.companyName?.trim()) {
    return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "Company name is required", fieldErrors: { companyName: "Required" } } });
  }
  if (!input.phone?.trim()) {
    return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "Phone is required", fieldErrors: { phone: "Required" } } });
  }
  if (!input.email?.trim()) {
    return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "Email is required", fieldErrors: { email: "Required" } } });
  }

  const nowIso = new Date().toISOString();
  const subcontractor: SubcontractorContact = {
    id: `sub-${Date.now()}`,
    displayName: input.displayName.trim(),
    trade: input.trade,
    companyName: input.companyName.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    notes: input.notes?.trim() || undefined,
    active: true,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  seedSubcontractors.push(subcontractor);

  seedAuditEvents.unshift({
    id: `audit-${Date.now()}`,
    entityType: "subcontractor_contact",
    entityId: subcontractor.id,
    action: "create_subcontractor",
    actorUserId: me.id,
    createdAt: nowIso,
  });

  return delay(ok(subcontractor));
}

export async function updateSubcontractorContact(id: string, input: UpdateSubcontractorInput): Promise<ApiResult<SubcontractorContact>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });
  if (me.role !== "admin") return delay({ ok: false, error: { code: "FORBIDDEN", message: "Admins only" } });

  const subcontractor = seedSubcontractors.find((s) => s.id === id);
  if (!subcontractor) return delay({ ok: false, error: { code: "NOT_FOUND", message: "Subcontractor not found" } });

  const nowIso = new Date().toISOString();

  if (input.displayName !== undefined) subcontractor.displayName = input.displayName.trim();
  if (input.trade !== undefined) subcontractor.trade = input.trade;
  if (input.companyName !== undefined) subcontractor.companyName = input.companyName.trim();
  if (input.phone !== undefined) subcontractor.phone = input.phone.trim();
  if (input.email !== undefined) subcontractor.email = input.email.trim();
  if (input.notes !== undefined) subcontractor.notes = input.notes?.trim() || undefined;
  if (input.active !== undefined) subcontractor.active = input.active;
  subcontractor.updatedAt = nowIso;

  seedAuditEvents.unshift({
    id: `audit-${Date.now()}`,
    entityType: "subcontractor_contact",
    entityId: subcontractor.id,
    action: "updated",
    actorUserId: me.id,
    createdAt: nowIso,
  });

  return delay(ok(subcontractor));
}

export async function deleteSubcontractorContact(id: string): Promise<ApiResult<void>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });
  if (me.role !== "admin") return delay({ ok: false, error: { code: "FORBIDDEN", message: "Admins only" } });

  const subcontractor = seedSubcontractors.find((s) => s.id === id);
  if (!subcontractor) return delay({ ok: false, error: { code: "NOT_FOUND", message: "Subcontractor not found" } });

  const nowIso = new Date().toISOString();

  // Clear phase assignments
  seedPhases.forEach((phase) => {
    if (phase.assignedSubcontractorId === id) {
      phase.assignedSubcontractorId = undefined;
      phase.updatedAt = nowIso;
    }
  });

  // Remove subcontractor
  const index = seedSubcontractors.indexOf(subcontractor);
  if (index > -1) {
    seedSubcontractors.splice(index, 1);
  }

  seedAuditEvents.unshift({
    id: `audit-${Date.now()}`,
    entityType: "subcontractor_contact",
    entityId: id,
    action: "deleted",
    actorUserId: me.id,
    createdAt: nowIso,
  });

  return delay(ok(undefined));
}

export async function updateAtticGate(input: UpdateAtticGateInput): Promise<ApiResult<Gate>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });

  const gate = seedGates.find((g) => g.id === input.gateId);
  if (!gate) return delay({ ok: false, error: { code: "NOT_FOUND", message: "Gate not found" } });

  if (gate.type !== "attic_check") {
    return delay({ ok: false, error: { code: "STATE_VIOLATION", message: "Gate is not an attic_check gate" } });
  }

  // Guard: drywall phase must have begun (in_progress or further)
  const drywallPhase = seedPhases.find((p) => p.projectId === input.projectId && p.type === "drywall");
  const drywallStarted =
    drywallPhase?.status === "in_progress" ||
    drywallPhase?.status === "ready_for_inspection" ||
    drywallPhase?.status === "closed";
  if (!drywallStarted) {
    return delay({
      ok: false,
      error: { code: "STATE_VIOLATION", message: "Attic gate cannot be modified until the drywall phase has begun" },
    });
  }

  // Guard: installDate requires a photo
  if (input.installDate && !input.photo) {
    return delay({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "A photo is required when setting the install date" },
    });
  }

  const nowIso = new Date().toISOString();

  if (input.callInDate !== undefined) gate.callInDate = input.callInDate;
  if (input.callInSubcontractorId !== undefined) gate.callInSubcontractorId = input.callInSubcontractorId;
  if (input.installDate !== undefined) gate.installDate = input.installDate;
  gate.updatedAt = nowIso;

  // Store photo evidence if provided
  if (input.photo) {
    const photoId = `photo-${Date.now()}`;
    seedPhotos.push({
      id: photoId,
      projectId: input.projectId,
      gateId: input.gateId,
      purpose: "attic_check",
      objectKey: `attic-checks/${photoId}.jpg`,
      mimeType: input.photo.type || "image/jpeg",
      fileSizeBytes: input.photo.size,
      status: "confirmed",
      uploadedByUserId: me.id,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    photoBlobUrls.set(photoId, URL.createObjectURL(input.photo));
  }

  // Status progression
  const hasInstall = !!gate.installDate;
  const hasPhoto = seedPhotos.some(
    (ph) => ph.gateId === gate.id && ph.purpose === "attic_check" && ph.status === "confirmed",
  );
  if (hasInstall && hasPhoto) {
    gate.status = "passed";
    gate.completedByUserId = me.id;
    gate.completedAt = nowIso;
    // Sync project-level atticCheckStatus
    const project = seedProjects.find((p) => p.id === input.projectId);
    if (project) {
      project.atticCheckStatus = "passed";
      project.updatedAt = nowIso;
    }
  } else if (gate.callInDate) {
    gate.status = "in_progress";
    const project = seedProjects.find((p) => p.id === input.projectId);
    if (project && project.atticCheckStatus === "not_started") {
      project.atticCheckStatus = "in_progress";
      project.updatedAt = nowIso;
    }
  }

  // Audit event
  seedAuditEvents.unshift({
    id: `audit-${Date.now()}`,
    entityType: "gate",
    entityId: gate.id,
    action: "attic_gate_updated",
    actorUserId: me.id,
    metadata: {
      callInDate: input.callInDate,
      installDate: input.installDate,
      callInSubcontractorId: input.callInSubcontractorId,
    },
    createdAt: nowIso,
  });

  return delay(ok(gate));
}

export async function uploadPhotoEvidence(input: UploadPhotoEvidenceInput): Promise<ApiResult<PhotoEvidence>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });

  if (!input.file) {
    return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "File is required" } });
  }

  const nowIso = new Date().toISOString();
  const photoId = `photo-${Date.now()}`;

  const photo: PhotoEvidence = {
    id: photoId,
    projectId: input.projectId,
    phaseId: input.phaseId,
    gateId: input.gateId,
    deficiencyId: input.deficiencyId,
    purpose: input.purpose,
    objectKey: `uploads/${photoId}.jpg`,
    contentHash: input.contentHash,
    mimeType: input.file.type || "image/jpeg",
    fileSizeBytes: input.file.size,
    status: "confirmed",
    uploadedByUserId: me.id,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  seedPhotos.push(photo);
  photoBlobUrls.set(photoId, URL.createObjectURL(input.file));

  seedAuditEvents.unshift({
    id: `audit-${Date.now()}`,
    entityType: "photo_evidence",
    entityId: photoId,
    action: "uploaded",
    actorUserId: me.id,
    metadata: { purpose: input.purpose, phaseId: input.phaseId },
    createdAt: nowIso,
  });

  return delay(ok(photo));
}

export async function getPhotoViewUrl(photoId: string): Promise<ApiResult<{ url: string; expiresAt: string }>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });

  const photo = seedPhotos.find((p) => p.id === photoId);
  if (!photo) return delay({ ok: false, error: { code: "NOT_FOUND", message: "Photo not found" } });

  const url = photoBlobUrls.get(photoId) ?? "";
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  return delay(ok({ url, expiresAt }));
}

export async function createProject(input: CreateProjectInput): Promise<ApiResult<Project>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });

  const fieldErrors: Record<string, string> = {};
  if (!input.clientId) fieldErrors.clientId = "Required";
  if (!input.projectNumber?.trim()) fieldErrors.projectNumber = "Required";
  if (!input.name?.trim()) fieldErrors.name = "Required";
  if (!input.siteAddress?.trim()) fieldErrors.siteAddress = "Required";
  if (Object.keys(fieldErrors).length) {
    return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "Missing required fields", fieldErrors } });
  }

  const pmId = me.role === "project_manager" ? me.id : input.assignedProjectManagerId;
  const nowIso = new Date().toISOString();
  const id = `proj-${Date.now()}`;

  const project: Project = {
    id,
    clientId: input.clientId,
    projectNumber: input.projectNumber.trim(),
    name: input.name.trim(),
    siteAddress: input.siteAddress.trim(),
    status: "draft",
    assignedProjectManagerId: pmId,
    scheduledStart: input.scheduledStart,
    scheduledEnd: input.scheduledEnd,
    atticCheckStatus: "not_started",
    finishLevel: input.finishLevel,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  seedProjects.push(project);

  // Auto-create the three default phases + standard gates per spec.
  const phaseTypes: Phase["type"][] = ["insulation", "drywall", "finishing"];
  phaseTypes.forEach((type) => {
    const phaseId = `${id}-phase-${type}`;
    const phase: Phase = {
      id: phaseId,
      projectId: id,
      type,
      status: "not_started",
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    seedPhases.push(phase);

    (["site_check", "inspection"] as const).forEach((gType, i) => {
      const gate: Gate = {
        id: `${id}-gate-${type}-${gType}-${i}`,
        projectId: id,
        phaseId,
        type: gType,
        status: "not_started",
        requiredPhotoEvidence: gType === "site_check",
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      seedGates.push(gate);
    });
  });

  // Project-level attic gate
  seedGates.push({
    id: `${id}-gate-attic`,
    projectId: id,
    type: "attic_check",
    status: "not_started",
    requiredPhotoEvidence: true,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  seedAuditEvents.unshift({
    id: `audit-${Date.now()}`,
    entityType: "project",
    entityId: id,
    action: "create_project",
    actorUserId: me.id,
    createdAt: nowIso,
  });

  return delay(ok(project));
}

export async function updateProject(projectId: string, input: UpdateProjectInput): Promise<ApiResult<Project>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });

  const project = seedProjects.find((p) => p.id === projectId);
  if (!project) return delay({ ok: false, error: { code: "NOT_FOUND", message: "Project not found" } });

  if (me.role === "project_manager" && project.assignedProjectManagerId !== me.id) {
    return delay({ ok: false, error: { code: "FORBIDDEN", message: "Access denied" } });
  }

  if (project.status === "completed" || project.status === "archived") {
    return delay({ ok: false, error: { code: "STATE_VIOLATION", message: "Cannot edit completed or archived projects" } });
  }

  if (!input.name?.trim()) {
    return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "Name is required", fieldErrors: { name: "Required" } } });
  }
  if (!input.siteAddress?.trim()) {
    return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "Site address is required", fieldErrors: { siteAddress: "Required" } } });
  }

  // Validate: project end date must encompass all phase end dates
  if (input.scheduledEnd !== undefined) {
    const newProjectEnd = new Date(input.scheduledEnd);
    const phases = seedPhases.filter((p) => p.projectId === projectId);
    for (const phase of phases) {
      if (phase.scheduledEnd) {
        const phaseEnd = new Date(phase.scheduledEnd);
        if (newProjectEnd < phaseEnd) {
          const phaseLabel = phase.type.charAt(0).toUpperCase() + phase.type.slice(1);
          const formattedPhaseEnd = phaseEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
          const formattedProjectEnd = newProjectEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
          return delay({
            ok: false,
            error: {
              code: "VALIDATION_ERROR",
              message: `Cannot update project: new end date (${formattedProjectEnd}) is before the ${phaseLabel} phase end date (${formattedPhaseEnd})`,
            },
          });
        }
      }
    }
  }

  const nowIso = new Date().toISOString();
  project.name = input.name.trim();
  project.siteAddress = input.siteAddress.trim();
  project.scheduledStart = input.scheduledStart;
  project.scheduledEnd = input.scheduledEnd;
  if (input.finishLevel !== undefined) {
    project.finishLevel = input.finishLevel;
  }
  if (me.role === "admin" && input.assignedProjectManagerId !== undefined) {
    project.assignedProjectManagerId = input.assignedProjectManagerId;
  }
  project.updatedAt = nowIso;

  seedAuditEvents.unshift({
    id: `audit-${Date.now()}`,
    entityType: "project",
    entityId: project.id,
    action: "updated",
    actorUserId: me.id,
    createdAt: nowIso,
  });

  return delay(ok(project));
}

export async function archiveProject(projectId: string): Promise<ApiResult<Project>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });

  const project = seedProjects.find((p) => p.id === projectId);
  if (!project) return delay({ ok: false, error: { code: "NOT_FOUND", message: "Project not found" } });

  if (me.role === "project_manager" && project.assignedProjectManagerId !== me.id) {
    return delay({ ok: false, error: { code: "FORBIDDEN", message: "Access denied" } });
  }

  if (project.status !== "completed") {
    return delay({ ok: false, error: { code: "STATE_VIOLATION", message: "Only completed projects can be archived" } });
  }

  const nowIso = new Date().toISOString();
  project.status = "archived";
  project.updatedAt = nowIso;

  seedAuditEvents.unshift({
    id: `audit-${Date.now()}`,
    entityType: "project",
    entityId: projectId,
    action: "archive_project",
    actorUserId: me.id,
    previousValue: "completed",
    nextValue: "archived",
    createdAt: nowIso,
  });

  return delay(ok(project));
}
