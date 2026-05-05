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

export const __internal = {
  projectHasBlockedWork,
  projectMissingAtticEvidence,
};
