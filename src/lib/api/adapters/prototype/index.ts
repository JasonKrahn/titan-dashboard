// Prototype API adapter. UI calls these via lib/api/index.ts.
import type {
  ApiResult,
  AuditEvent,
  ClientRecord,
  Deficiency,
  Gate,
  Phase,
  PhaseDetail,
  Project,
  ProjectDetail,
  ProjectFilters,
  SubcontractorContact,
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
    auditEvents: seedAuditEvents.filter((a) => a.entityId === id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
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
    gates: seedGates.filter((g) => g.phaseId === phaseId),
    deficiencies: seedDeficiencies.filter((d) => d.phaseId === phaseId),
    photoEvidence: seedPhotos.filter((ph) => ph.phaseId === phaseId),
    subcontractors: seedSubcontractors,
    auditEvents: seedAuditEvents.filter((a) => a.entityId === phaseId).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
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
    action: "created",
    actorUserId: me.id,
    createdAt: nowIso,
  });

  return delay(ok(project));
}
