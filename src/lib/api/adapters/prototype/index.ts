// Prototype API adapter. UI calls these via lib/api/index.ts.
import type {
  AppNotification,
  ApiResult,
  AuditEvent,
  ClientRecord,
  CompleteInspectionInput,
  CreateDeficiencyInput,
  CreateSubcontractorInput,
  Deficiency,
  DeficiencySeverity,
  EquipmentLog,
  Gate,
  InventoryAuditRequestType,
  InventoryPickup,
  InventoryPickupItem,
  InventoryPickupNotificationKind,
  MaterialLog,
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
  UserRole,
} from "@/lib/types";
import { EQUIPMENT_ITEMS, PHASE_MATERIAL_CATALOGS } from "@/lib/inventoryCatalog";
import { orderedSchedulePhases, parseScheduleDate, toScheduleDate } from "@/lib/schedule";

import imgInsulationSiteCheck from "@/install-photos/jpeg-install-images/insulation/site-check-insulation.jpeg";
import imgDrywallSiteCheck from "@/install-photos/jpeg-install-images/boarding/site-check-drywall.jpeg";
import imgSiteBlockedAccess from "@/install-photos/jpeg-install-images/boarding/camphoto_1296255701.jpg";
import imgFailedInspection from "@/install-photos/jpeg-install-images/insulation/IMG_3372.jpeg";
import imgReworkBefore from "@/install-photos/jpeg-install-images/insulation/IMG_3448.jpeg";
import imgReworkAfter from "@/install-photos/jpeg-install-images/insulation/IMG_3475.jpeg";
import imgFinishingGeneral from "@/install-photos/jpeg-install-images/finishing/IMG_4350.jpeg";
import imgReadyCompleteAttic from "@/install-photos/jpeg-install-images/insulation/IMG_3653.jpeg";
import imgCompletedInspection from "@/install-photos/jpeg-install-images/finishing/IMG_4493.jpeg";
import imgCompletedAttic from "@/install-photos/jpeg-install-images/foam/foam-joist.jpeg";
import imgArchivedAttic from "@/install-photos/jpeg-install-images/foam/foam-skylight.jpeg";
import imgInsulation3480 from "@/install-photos/jpeg-install-images/insulation/IMG_3480.jpeg";
import imgInsulation3487 from "@/install-photos/jpeg-install-images/insulation/IMG_3487.jpeg";
import imgInsulation3570 from "@/install-photos/jpeg-install-images/insulation/IMG_3570.jpeg";
import imgInsulation3700 from "@/install-photos/jpeg-install-images/insulation/IMG_3700.jpeg";
import imgInsulation5020 from "@/install-photos/jpeg-install-images/insulation/IMG_5020.jpeg";
import imgBoarding3659 from "@/install-photos/jpeg-install-images/boarding/IMG_3659.jpeg";
import imgBoarding3908 from "@/install-photos/jpeg-install-images/boarding/IMG_3908.jpeg";
import imgBoardingCamphoto351212254 from "@/install-photos/jpeg-install-images/boarding/camphoto_351212254.jpg";
import imgBoardingPhoto6626 from "@/install-photos/jpeg-install-images/boarding/photo-6626_singular_display_fullPicture.jpeg";
import imgBoardingPhoto9075 from "@/install-photos/jpeg-install-images/boarding/photo-9075_singular_display_fullPicture.jpeg";
import imgFinishing4467 from "@/install-photos/jpeg-install-images/finishing/IMG_4467.jpeg";
import imgFinishing4505 from "@/install-photos/jpeg-install-images/finishing/IMG_4505.jpeg";
import imgFinishing4527 from "@/install-photos/jpeg-install-images/finishing/IMG_4527.jpeg";
import imgFinishing4545 from "@/install-photos/jpeg-install-images/finishing/IMG_4545.jpeg";
import imgFinishingSiteCheck from "@/install-photos/jpeg-install-images/finishing/finishing-site-check.jpeg";
import imgFinishingPhoto9151 from "@/install-photos/jpeg-install-images/finishing/photo-9151_singular_display_fullPicture.jpeg";
import imgFinishingPhoto9172 from "@/install-photos/jpeg-install-images/finishing/photo-9172_singular_display_fullPicture.jpeg";
import imgFinishingPhoto9314 from "@/install-photos/jpeg-install-images/finishing/photo-9314_singular_display_fullPicture.jpeg";
import imgFoamJoist2 from "@/install-photos/jpeg-install-images/foam/foam-joist-2.jpeg";
import imgFraming3007 from "@/install-photos/jpeg-install-images/framing/IMG_3007.jpeg";
import imgFraming3055 from "@/install-photos/jpeg-install-images/framing/IMG_3055.jpeg";
import imgFraming3186 from "@/install-photos/jpeg-install-images/framing/IMG_3186.jpeg";
import imgRoot4458 from "@/install-photos/jpeg-install-images/IMG_4458.jpeg";
import {
  seedAuditEvents,
  seedClients,
  seedDeficiencies,
  seedEquipmentLogs,
  seedGates,
  seedInventoryPickups,
  seedMaterialLogs,
  seedPhases,
  seedPhotos,
  seedProjects,
  seedSubcontractors,
  seedUsers,
} from "./seed";

const SIMULATED_LATENCY_MS = 250;

export const photoBlobUrls = new Map<string, string>([
  ["photo-active-insulation-site-check", imgInsulationSiteCheck],
  ["photo-ready-inspection-drywall-site-check", imgDrywallSiteCheck],
  ["photo-site-blocked-access", imgSiteBlockedAccess],
  ["photo-failed-inspection-before", imgFailedInspection],
  ["photo-rework-before", imgReworkBefore],
  ["photo-rework-after", imgReworkAfter],
  ["photo-finishing-general", imgFinishingGeneral],
  ["photo-ready-complete-attic", imgReadyCompleteAttic],
  ["photo-completed-inspection", imgCompletedInspection],
  ["photo-completed-attic", imgCompletedAttic],
  ["photo-archived-attic", imgArchivedAttic],
  ["photo-active-insulation-3480", imgInsulation3480],
  ["photo-active-insulation-3487", imgInsulation3487],
  ["photo-failed-inspection-3570", imgInsulation3570],
  ["photo-deficiency-rework-3700", imgInsulation3700],
  ["photo-deficiency-rework-5020", imgInsulation5020],
  ["photo-ready-inspection-3659", imgBoarding3659],
  ["photo-ready-inspection-3908", imgBoarding3908],
  ["photo-site-blocked-351212254", imgBoardingCamphoto351212254],
  ["photo-site-blocked-6626", imgBoardingPhoto6626],
  ["photo-site-blocked-9075", imgBoardingPhoto9075],
  ["photo-finishing-active-4467", imgFinishing4467],
  ["photo-finishing-active-4505", imgFinishing4505],
  ["photo-finishing-active-4527", imgFinishing4527],
  ["photo-finishing-active-4545", imgFinishing4545],
  ["photo-archived-finishing-site-check", imgFinishingSiteCheck],
  ["photo-archived-9151", imgFinishingPhoto9151],
  ["photo-archived-9172", imgFinishingPhoto9172],
  ["photo-archived-9314", imgFinishingPhoto9314],
  ["photo-ready-complete-foam-joist-2", imgFoamJoist2],
  ["photo-ready-complete-framing-3007", imgFraming3007],
  ["photo-ready-complete-framing-3055", imgFraming3055],
  ["photo-ready-complete-framing-3186", imgFraming3186],
  ["photo-completed-4458", imgRoot4458],
]);

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

export interface UpdatePhaseMaterialInput {
  phaseId: string;
  projectId: string;
  itemKey: string;
  quantity: number;
}

export interface UpdateProjectEquipmentInput {
  projectId: string;
  itemKey: string;
  quantity: number;
}

export interface UpdatePhaseMaterialsInput {
  phaseId: string;
  projectId: string;
  changes: Array<{
    itemKey: string;
    quantity: number;
  }>;
}

export interface UpdateProjectEquipmentBatchInput {
  projectId: string;
  changes: Array<{
    itemKey: string;
    quantity: number;
  }>;
}

export interface CreateInventoryPickupInput {
  projectId: string;
  items: InventoryPickupItem[];
  note?: string;
}

export interface CreateInventoryAuditRequestInput {
  projectId: string;
  type: InventoryAuditRequestType;
}

const delay = <T,>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), SIMULATED_LATENCY_MS));

const ok = <T,>(data: T): ApiResult<T> => ({ ok: true, data });

const seedNotifications: AppNotification[] = [];

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

export interface CreateUserInput {
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string;
}

export async function updateUser(userId: string, input: UpdateUserInput): Promise<ApiResult<User>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });

  const user = seedUsers.find((u) => u.id === userId);
  if (!user) return delay({ ok: false, error: { code: "NOT_FOUND", message: "User not found" } });

  const isRoleChange = input.role !== undefined && input.role !== user.role;
  if (me.role !== "admin" && (user.id !== me.id || isRoleChange)) {
    return delay({ ok: false, error: { code: "FORBIDDEN", message: "Admins only" } });
  }
  if (isRoleChange && me.role !== "admin") {
    return delay({ ok: false, error: { code: "FORBIDDEN", message: "Admins only" } });
  }

  const fieldErrors: Record<string, string> = {};
  if (input.fullName !== undefined && !input.fullName.trim()) fieldErrors.fullName = "Required";
  if (input.email !== undefined && !input.email.trim()) fieldErrors.email = "Required";
  if (input.email?.trim()) {
    const email = input.email.trim().toLowerCase();
    const duplicate = seedUsers.some((u) => u.id !== userId && u.email.toLowerCase() === email);
    if (duplicate) fieldErrors.email = "Email already exists";
  }
  if (Object.keys(fieldErrors).length) {
    return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid user details", fieldErrors } });
  }

  const nowIso = new Date().toISOString();
  const previousRole = user.role;
  const previousValue = { fullName: user.fullName, email: user.email, phone: user.phone, role: user.role };
  if (user.role === "admin" && user.active && input.role !== undefined && input.role !== "admin") {
    const activeAdmins = seedUsers.filter((u) => u.role === "admin" && u.active);
    if (activeAdmins.length <= 1) {
      return delay({ ok: false, error: { code: "STATE_VIOLATION", message: "At least one active admin is required" } });
    }
  }
  if (input.fullName !== undefined) user.fullName = input.fullName.trim();
  if (input.phone !== undefined) user.phone = input.phone?.trim() || undefined;
  if (input.email !== undefined) user.email = input.email.trim();
  if (me.role === "admin" && input.role !== undefined) user.role = input.role;
  user.updatedAt = nowIso;

  seedAuditEvents.unshift({
    id: `audit-${Date.now()}`,
    entityType: "user",
    entityId: user.id,
    action: previousRole !== user.role ? "role_changed" : "updated",
    actorUserId: me.id,
    previousValue,
    nextValue: { fullName: user.fullName, email: user.email, phone: user.phone, role: user.role },
    createdAt: nowIso,
  });

  return delay(ok(user));
}

export async function createUser(input: CreateUserInput): Promise<ApiResult<User>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });
  if (me.role !== "admin") return delay({ ok: false, error: { code: "FORBIDDEN", message: "Admins only" } });

  const fieldErrors: Record<string, string> = {};
  if (!input.fullName?.trim()) fieldErrors.fullName = "Required";
  if (!input.email?.trim()) fieldErrors.email = "Required";
  if (!input.role) fieldErrors.role = "Required";
  if (input.email?.trim()) {
    const email = input.email.trim().toLowerCase();
    if (seedUsers.some((u) => u.email.toLowerCase() === email)) fieldErrors.email = "Email already exists";
  }
  if (Object.keys(fieldErrors).length) {
    return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid user details", fieldErrors } });
  }

  const nowIso = new Date().toISOString();
  const user: User = {
    id: `user-${Date.now()}`,
    role: input.role,
    fullName: input.fullName.trim(),
    email: input.email.trim(),
    phone: input.phone?.trim() || undefined,
    active: true,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  seedUsers.push(user);

  seedAuditEvents.unshift({
    id: `audit-${Date.now()}`,
    entityType: "user",
    entityId: user.id,
    action: "create_user",
    actorUserId: me.id,
    nextValue: { fullName: user.fullName, email: user.email, phone: user.phone, role: user.role },
    createdAt: nowIso,
  });

  return delay(ok(user));
}

export async function deactivateUser(userId: string): Promise<ApiResult<User>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });
  if (me.role !== "admin") return delay({ ok: false, error: { code: "FORBIDDEN", message: "Admins only" } });

  const user = seedUsers.find((u) => u.id === userId);
  if (!user) return delay({ ok: false, error: { code: "NOT_FOUND", message: "User not found" } });
  if (user.id === me.id) {
    return delay({ ok: false, error: { code: "STATE_VIOLATION", message: "You cannot remove your own admin account" } });
  }
  if (user.role === "admin" && user.active) {
    const activeAdmins = seedUsers.filter((u) => u.role === "admin" && u.active);
    if (activeAdmins.length <= 1) {
      return delay({ ok: false, error: { code: "STATE_VIOLATION", message: "At least one active admin is required" } });
    }
  }
  if (user.role === "project_manager") {
    const activeAssignments = seedProjects.filter(
      (project) => project.assignedProjectManagerId === user.id && project.status !== "completed" && project.status !== "archived",
    );
    if (activeAssignments.length > 0) {
      return delay({
        ok: false,
        error: {
          code: "STATE_VIOLATION",
          message: "Project managers with active assigned projects must be reassigned before removal",
        },
      });
    }
  }

  const nowIso = new Date().toISOString();
  const previousValue = { active: user.active };
  user.active = false;
  user.updatedAt = nowIso;

  seedAuditEvents.unshift({
    id: `audit-${Date.now()}`,
    entityType: "user",
    entityId: user.id,
    action: "deactivated",
    actorUserId: me.id,
    previousValue,
    nextValue: { active: user.active },
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
    return delay(ok(seedClients.filter((client) => !client.archived && visibleClientIds.has(client.id))));
  }

  return delay(ok(seedClients.filter((client) => !client.archived)));
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

function syncProjectCompletion(projectId: string, actorUserId: string, nowIso: string) {
  const project = seedProjects.find((p) => p.id === projectId);
  if (!project || project.status === "completed" || project.status === "archived") return;

  const projectPhases = seedPhases.filter((phase) => phase.projectId === projectId);
  const atticGate = seedGates.find((gate) => gate.projectId === projectId && gate.type === "attic_check");
  const allPhasesClosed = projectPhases.length > 0 && projectPhases.every((phase) => phase.status === "closed");
  const atticPassed = atticGate?.status === "passed";

  if (!allPhasesClosed || !atticPassed) return;

  project.status = "completed";
  project.completedAt = nowIso;
  project.updatedAt = nowIso;

  seedAuditEvents.unshift({
    id: `audit-${Date.now()}`,
    entityType: "project",
    entityId: projectId,
    action: "complete_project",
    actorUserId,
    previousValue: "active",
    nextValue: "completed",
    createdAt: nowIso,
  });
}

export async function getProjects(filters?: ProjectFilters): Promise<ApiResult<Project[]>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });

  let result = [...seedProjects];

  // inventory_viewer: cross-PM access, active projects only.
  if (me.role === "inventory_viewer") {
    return delay(ok(result.filter((p) => p.status === "active").sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))));
  }

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

function auditRequestText(type: InventoryAuditRequestType) {
  if (type === "materials") return "materials audit";
  if (type === "hardware") return "hardware audit";
  return "materials and hardware audit";
}

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

function isOutstandingInventoryAuditRequest(notification: AppNotification) {
  return notification.type === "inventory_audit_request" && !notification.readAt;
}

function notificationScheduleDate(value: string) {
  return value.slice(0, 10);
}

function phaseTypeLabel(type: Phase["type"]) {
  if (type === "insulation") return "Insulation";
  if (type === "drywall") return "Drywall";
  return "Finishing";
}

function ensurePhaseEndNotificationsForPm(pm: User) {
  const today = toScheduleDate(Date.now());
  for (const phase of seedPhases) {
    if (!phase.scheduledEnd || notificationScheduleDate(phase.scheduledEnd) !== today || phase.status === "closed") continue;

    const project = seedProjects.find((item) => item.id === phase.projectId);
    if (!project || project.status !== "active" || project.assignedProjectManagerId !== pm.id) continue;

    const exists = seedNotifications.some(
      (notification) =>
        notification.type === "phase_end_due" &&
        notification.recipientUserId === pm.id &&
        notification.metadata?.phaseId === phase.id &&
        notification.metadata?.phaseEndDate === notificationScheduleDate(phase.scheduledEnd),
    );
    if (exists) continue;

    seedNotifications.unshift({
      id: `notification-phase-end-${phase.id}-${today}`,
      recipientUserId: pm.id,
      type: "phase_end_due",
      projectId: project.id,
      message: `${phaseTypeLabel(phase.type)} phase ends today for ${project.name}`,
      metadata: {
        phaseId: phase.id,
        phaseType: phase.type,
        phaseEndDate: today,
      },
      createdAt: new Date().toISOString(),
    });
  }
}

export async function getNotifications(): Promise<ApiResult<AppNotification[]>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });
  if (me.role !== "project_manager") {
    return delay(ok([]));
  }

  ensurePhaseEndNotificationsForPm(me);

  return delay(ok(seedNotifications
    .filter((notification) => notification.recipientUserId === me.id && !notification.readAt)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))));
}

export async function getOutstandingInventoryAuditRequests(): Promise<ApiResult<AppNotification[]>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });
  if (me.role !== "inventory_viewer" && me.role !== "admin") {
    return delay({ ok: false, error: { code: "FORBIDDEN", message: "Inventory access required" } });
  }

  return delay(ok(seedNotifications
    .filter(isOutstandingInventoryAuditRequest)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))));
}

export async function markNotificationRead(notificationId: string): Promise<ApiResult<AppNotification>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });

  const notification = seedNotifications.find((item) => item.id === notificationId);
  if (!notification) return delay({ ok: false, error: { code: "NOT_FOUND", message: "Notification not found" } });
  if (notification.recipientUserId !== me.id) {
    return delay({ ok: false, error: { code: "FORBIDDEN", message: "Notification access denied" } });
  }

  notification.readAt = new Date().toISOString();
  return delay(ok(notification));
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

function validateLogInput(itemKey: string, quantity: number): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  if (!itemKey.trim()) fieldErrors.itemKey = "Required";
  if (typeof quantity !== "number" || !Number.isFinite(quantity) || quantity < 0) {
    fieldErrors.quantity = "Must be a non-negative finite number";
  }
  return fieldErrors;
}

function formatInventoryLabel(itemKey: string, labels: Map<string, string>) {
  return labels.get(itemKey) ?? itemKey.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function updateMaterialLog(input: UpdatePhaseMaterialInput, nowIso: string) {
  const itemKey = input.itemKey.trim();
  const previousLog = seedMaterialLogs.find((item) => item.phaseId === input.phaseId && item.itemKey === itemKey);
  const previousQuantity = previousLog?.quantity ?? 0;
  let log = previousLog;

  if (!log) {
    log = {
      id: `material-${input.phaseId}-${itemKey}`,
      projectId: input.projectId,
      phaseId: input.phaseId,
      itemKey,
      quantity: input.quantity,
      updatedAt: nowIso,
    };
    seedMaterialLogs.push(log);
  } else {
    log.quantity = input.quantity;
    log.updatedAt = nowIso;
  }

  return { log, previousQuantity };
}

function updateEquipmentLog(input: UpdateProjectEquipmentInput, nowIso: string) {
  const itemKey = input.itemKey.trim();
  const previousLog = seedEquipmentLogs.find((item) => item.projectId === input.projectId && item.itemKey === itemKey);
  const previousQuantity = previousLog?.quantity ?? 0;
  let log = previousLog;

  if (!log) {
    log = {
      id: `equipment-${input.projectId}-${itemKey}`,
      projectId: input.projectId,
      itemKey,
      quantity: input.quantity,
      updatedAt: nowIso,
    };
    seedEquipmentLogs.push(log);
  } else {
    log.quantity = input.quantity;
    log.updatedAt = nowIso;
  }

  return { log, previousQuantity };
}

function inventoryItemLabel(item: InventoryPickupItem, projectPhases: Phase[]) {
  if (item.kind === "equipment") {
    return EQUIPMENT_ITEMS.find((catalogItem) => catalogItem.itemKey === item.itemKey)?.label ?? item.itemKey;
  }

  for (const phase of projectPhases) {
    const label = PHASE_MATERIAL_CATALOGS[phase.type].find((catalogItem) => catalogItem.itemKey === item.itemKey)?.label;
    if (label) return label;
  }

  return item.itemKey;
}

function pickupSummary(items: InventoryPickupItem[], projectPhases: Phase[]) {
  return items.map((item) => `${inventoryItemLabel(item, projectPhases)} ×${item.quantity}`).join(", ");
}

function pickupKinds(items: InventoryPickupItem[]): InventoryPickupNotificationKind[] {
  const kinds: InventoryPickupNotificationKind[] = [];
  if (items.some((item) => item.kind === "material")) kinds.push("materials");
  if (items.some((item) => item.kind === "equipment")) kinds.push("hardware");
  return kinds;
}

function pickupKindText(kinds: InventoryPickupNotificationKind[]) {
  if (kinds.includes("materials") && kinds.includes("hardware")) return "materials and hardware";
  if (kinds.includes("materials")) return "materials";
  return "hardware";
}

export async function getPhaseMaterials(phaseId: string): Promise<ApiResult<MaterialLog[]>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });

  const phase = seedPhases.find((p) => p.id === phaseId);
  if (!phase) return delay({ ok: false, error: { code: "NOT_FOUND", message: "Phase not found" } });

  const project = seedProjects.find((p) => p.id === phase.projectId);
  if (!project) return delay({ ok: false, error: { code: "NOT_FOUND", message: "Project not found" } });

  if (me.role === "project_manager" && project.assignedProjectManagerId !== me.id) {
    return delay({ ok: false, error: { code: "FORBIDDEN", message: "Access denied" } });
  }
  // inventory_viewer: allowed to read materials for any phase

  return delay(ok(seedMaterialLogs.filter((log) => log.phaseId === phaseId)));
}

export async function updatePhaseMaterial(input: UpdatePhaseMaterialInput): Promise<ApiResult<MaterialLog>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });

  const phase = seedPhases.find((p) => p.id === input.phaseId);
  if (!phase) return delay({ ok: false, error: { code: "NOT_FOUND", message: "Phase not found" } });

  const project = seedProjects.find((p) => p.id === input.projectId);
  if (!project) return delay({ ok: false, error: { code: "NOT_FOUND", message: "Project not found" } });

  if (phase.projectId !== input.projectId) {
    return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "Phase does not belong to project", fieldErrors: { projectId: "Project does not match phase" } } });
  }

  if (me.role === "project_manager" && project.assignedProjectManagerId !== me.id) {
    return delay({ ok: false, error: { code: "FORBIDDEN", message: "Access denied" } });
  }

  const fieldErrors = validateLogInput(input.itemKey, input.quantity);
  if (Object.keys(fieldErrors).length) {
    return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid material log", fieldErrors } });
  }

  const itemKey = input.itemKey.trim();
  const nowIso = new Date().toISOString();
  const { log } = updateMaterialLog({ ...input, itemKey }, nowIso);

  return delay(ok(log));
}

export async function updatePhaseMaterials(input: UpdatePhaseMaterialsInput): Promise<ApiResult<MaterialLog[]>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });

  const phase = seedPhases.find((p) => p.id === input.phaseId);
  if (!phase) return delay({ ok: false, error: { code: "NOT_FOUND", message: "Phase not found" } });

  const project = seedProjects.find((p) => p.id === input.projectId);
  if (!project) return delay({ ok: false, error: { code: "NOT_FOUND", message: "Project not found" } });

  if (phase.projectId !== input.projectId) {
    return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "Phase does not belong to project", fieldErrors: { projectId: "Project does not match phase" } } });
  }

  if (me.role === "project_manager" && project.assignedProjectManagerId !== me.id) {
    return delay({ ok: false, error: { code: "FORBIDDEN", message: "Access denied" } });
  }

  const fieldErrors: Record<string, string> = {};
  input.changes.forEach((change, index) => {
    const errors = validateLogInput(change.itemKey, change.quantity);
    Object.entries(errors).forEach(([key, value]) => {
      fieldErrors[`changes.${index}.${key}`] = value;
    });
  });
  if (Object.keys(fieldErrors).length) {
    return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid material log", fieldErrors } });
  }

  const nowIso = new Date().toISOString();
  const labels = new Map(PHASE_MATERIAL_CATALOGS[phase.type].map((item) => [item.itemKey, item.label]));
  const changedLogs = input.changes.map((change) => {
    const itemKey = change.itemKey.trim();
    const updated = updateMaterialLog({ phaseId: input.phaseId, projectId: input.projectId, itemKey, quantity: change.quantity }, nowIso);
    return {
      ...updated,
      label: formatInventoryLabel(itemKey, labels),
    };
  });

  if (changedLogs.length > 0) {
    seedAuditEvents.unshift({
      id: `audit-${Date.now()}`,
      entityType: "phase",
      entityId: input.phaseId,
      action: "materials_updated",
      actorUserId: me.id,
      metadata: {
        inventoryChanges: changedLogs.map(({ log, previousQuantity, label }) => ({
          itemKey: log.itemKey,
          label,
          previousQuantity,
          quantity: log.quantity,
        })),
      },
      createdAt: nowIso,
    });
  }

  return delay(ok(changedLogs.map(({ log }) => log)));
}

export async function getProjectEquipment(projectId: string): Promise<ApiResult<EquipmentLog[]>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });

  const project = seedProjects.find((p) => p.id === projectId);
  if (!project) return delay({ ok: false, error: { code: "NOT_FOUND", message: "Project not found" } });

  if (me.role === "project_manager" && project.assignedProjectManagerId !== me.id) {
    return delay({ ok: false, error: { code: "FORBIDDEN", message: "Access denied" } });
  }
  // inventory_viewer: allowed to read equipment for any project

  return delay(ok(seedEquipmentLogs.filter((log) => log.projectId === projectId)));
}

export async function updateProjectEquipment(input: UpdateProjectEquipmentInput): Promise<ApiResult<EquipmentLog>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });

  const project = seedProjects.find((p) => p.id === input.projectId);
  if (!project) return delay({ ok: false, error: { code: "NOT_FOUND", message: "Project not found" } });

  if (me.role === "project_manager" && project.assignedProjectManagerId !== me.id) {
    return delay({ ok: false, error: { code: "FORBIDDEN", message: "Access denied" } });
  }

  const fieldErrors = validateLogInput(input.itemKey, input.quantity);
  if (Object.keys(fieldErrors).length) {
    return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid equipment log", fieldErrors } });
  }

  const itemKey = input.itemKey.trim();
  const nowIso = new Date().toISOString();
  const { log } = updateEquipmentLog({ ...input, itemKey }, nowIso);

  return delay(ok(log));
}

export async function updateProjectEquipmentBatch(input: UpdateProjectEquipmentBatchInput): Promise<ApiResult<EquipmentLog[]>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });

  const project = seedProjects.find((p) => p.id === input.projectId);
  if (!project) return delay({ ok: false, error: { code: "NOT_FOUND", message: "Project not found" } });

  if (me.role === "project_manager" && project.assignedProjectManagerId !== me.id) {
    return delay({ ok: false, error: { code: "FORBIDDEN", message: "Access denied" } });
  }

  const fieldErrors: Record<string, string> = {};
  input.changes.forEach((change, index) => {
    const errors = validateLogInput(change.itemKey, change.quantity);
    Object.entries(errors).forEach(([key, value]) => {
      fieldErrors[`changes.${index}.${key}`] = value;
    });
  });
  if (Object.keys(fieldErrors).length) {
    return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid equipment log", fieldErrors } });
  }

  const nowIso = new Date().toISOString();
  const labels = new Map(EQUIPMENT_ITEMS.map((item) => [item.itemKey, item.label]));
  const changedLogs = input.changes.map((change) => {
    const itemKey = change.itemKey.trim();
    const updated = updateEquipmentLog({ projectId: input.projectId, itemKey, quantity: change.quantity }, nowIso);
    return {
      ...updated,
      label: formatInventoryLabel(itemKey, labels),
    };
  });

  if (changedLogs.length > 0) {
    seedAuditEvents.unshift({
      id: `audit-${Date.now()}`,
      entityType: "project",
      entityId: input.projectId,
      action: "hardware_updated",
      actorUserId: me.id,
      metadata: {
        inventoryChanges: changedLogs.map(({ log, previousQuantity, label }) => ({
          itemKey: log.itemKey,
          label,
          previousQuantity,
          quantity: log.quantity,
        })),
      },
      createdAt: nowIso,
    });
  }

  return delay(ok(changedLogs.map(({ log }) => log)));
}

export async function getProjectInventoryPickups(projectId: string): Promise<ApiResult<InventoryPickup[]>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });

  const project = seedProjects.find((p) => p.id === projectId);
  if (!project) return delay({ ok: false, error: { code: "NOT_FOUND", message: "Project not found" } });

  if (me.role === "project_manager" && project.assignedProjectManagerId !== me.id) {
    return delay({ ok: false, error: { code: "FORBIDDEN", message: "Access denied" } });
  }

  return delay(ok(seedInventoryPickups.filter((pickup) => pickup.projectId === projectId)));
}

export async function createInventoryAuditRequest(input: CreateInventoryAuditRequestInput): Promise<ApiResult<AppNotification>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });
  if (me.role !== "inventory_viewer" && me.role !== "admin") {
    return delay({ ok: false, error: { code: "FORBIDDEN", message: "Inventory access required" } });
  }

  const project = seedProjects.find((p) => p.id === input.projectId);
  if (!project) return delay({ ok: false, error: { code: "NOT_FOUND", message: "Project not found" } });
  if (project.status !== "active") {
    return delay({ ok: false, error: { code: "STATE_VIOLATION", message: "Audit requests are only available for active projects" } });
  }
  if (!project.assignedProjectManagerId) {
    return delay({ ok: false, error: { code: "STATE_VIOLATION", message: "Project has no assigned project manager" } });
  }
  if (input.type !== "materials" && input.type !== "hardware" && input.type !== "both") {
    return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid audit request type" } });
  }
  const duplicate = seedNotifications.find(
    (notification) =>
      isOutstandingInventoryAuditRequest(notification) &&
      notification.projectId === project.id &&
      notification.recipientUserId === project.assignedProjectManagerId &&
      notification.metadata?.auditRequestType === input.type,
  );
  if (duplicate) {
    return delay({ ok: false, error: { code: "CONFLICT", message: `${auditRequestText(input.type)} already requested for ${project.name}` } });
  }

  const nowIso = new Date().toISOString();
  const notification: AppNotification = {
    id: `notification-${Date.now()}`,
    recipientUserId: project.assignedProjectManagerId,
    type: "inventory_audit_request",
    projectId: project.id,
    message: `${firstName(me.fullName)} requested ${auditRequestText(input.type)} for ${project.name}`,
    metadata: {
      auditRequestType: input.type,
      requesterUserId: me.id,
    },
    createdAt: nowIso,
  };
  seedNotifications.unshift(notification);

  seedAuditEvents.unshift({
    id: `audit-${Date.now()}`,
    entityType: "project",
    entityId: project.id,
    action: "inventory_audit_requested",
    actorUserId: me.id,
    metadata: {
      auditRequestType: input.type,
      recipientUserId: project.assignedProjectManagerId,
      notificationId: notification.id,
    },
    createdAt: nowIso,
  });

  return delay(ok(notification));
}

export async function createInventoryPickup(input: CreateInventoryPickupInput): Promise<ApiResult<InventoryPickup>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });
  if (me.role !== "inventory_viewer" && me.role !== "admin") {
    return delay({ ok: false, error: { code: "FORBIDDEN", message: "Inventory access required" } });
  }

  const project = seedProjects.find((p) => p.id === input.projectId);
  if (!project) return delay({ ok: false, error: { code: "NOT_FOUND", message: "Project not found" } });
  if (project.status !== "active") {
    return delay({ ok: false, error: { code: "STATE_VIOLATION", message: "Pickups are only available for active projects" } });
  }

  const note = input.note?.trim();
  if (note && note.length > 500) {
    return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "Pickup note is too long", fieldErrors: { note: "Must be 500 characters or less" } } });
  }

  const items = input.items
    .map((item) => ({ ...item, itemKey: item.itemKey.trim() }))
    .filter((item) => item.quantity > 0);
  if (items.length === 0) {
    return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "Select at least one item to pick up", fieldErrors: { items: "Required" } } });
  }

  const projectPhases = seedPhases.filter((phase) => phase.projectId === input.projectId);
  const fieldErrors: Record<string, string> = {};

  for (const item of items) {
    if (item.kind !== "material" && item.kind !== "equipment") {
      fieldErrors.items = "Invalid item type";
    }
    if (!item.itemKey) {
      fieldErrors.items = "Item is required";
    }
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      fieldErrors.items = "Quantities must be greater than zero";
    }
    if (item.kind === "equipment") {
      const available = seedEquipmentLogs
        .filter((log) => log.projectId === input.projectId && log.itemKey === item.itemKey)
        .reduce((total, log) => total + log.quantity, 0);
      if (item.quantity > available) {
        fieldErrors[item.itemKey] = "Cannot pick up more than is on site";
      }
    } else {
      const phaseIds = new Set(projectPhases.map((phase) => phase.id));
      const available = seedMaterialLogs
        .filter((log) => phaseIds.has(log.phaseId) && log.itemKey === item.itemKey)
        .reduce((total, log) => total + log.quantity, 0);
      if (item.quantity > available) {
        fieldErrors[item.itemKey] = "Cannot pick up more than is on site";
      }
    }
  }

  if (Object.keys(fieldErrors).length) {
    return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid pickup", fieldErrors } });
  }

  const nowIso = new Date().toISOString();

  for (const item of items) {
    let remaining = item.quantity;
    if (item.kind === "equipment") {
      for (const log of seedEquipmentLogs.filter((entry) => entry.projectId === input.projectId && entry.itemKey === item.itemKey)) {
        const picked = Math.min(log.quantity, remaining);
        log.quantity -= picked;
        log.updatedAt = nowIso;
        remaining -= picked;
        if (remaining === 0) break;
      }
    } else {
      const phaseOrder = new Map(projectPhases.map((phase, index) => [phase.id, index]));
      const logs = seedMaterialLogs
        .filter((entry) => entry.projectId === input.projectId && entry.itemKey === item.itemKey)
        .sort((a, b) => (phaseOrder.get(a.phaseId) ?? 0) - (phaseOrder.get(b.phaseId) ?? 0));
      for (const log of logs) {
        const picked = Math.min(log.quantity, remaining);
        log.quantity -= picked;
        log.updatedAt = nowIso;
        remaining -= picked;
        if (remaining === 0) break;
      }
    }
  }

  const pickup: InventoryPickup = {
    id: `pickup-${Date.now()}`,
    projectId: input.projectId,
    pickedUpByUserId: me.id,
    items,
    note: note || undefined,
    createdAt: nowIso,
  };
  seedInventoryPickups.unshift(pickup);

  const summary = pickupSummary(items, projectPhases);
  const kinds = pickupKinds(items);
  const notification: AppNotification | undefined = project.assignedProjectManagerId
    ? {
        id: `notification-${Date.now()}`,
        recipientUserId: project.assignedProjectManagerId,
        type: "inventory_pickup",
        projectId: project.id,
        message: `${firstName(me.fullName)} picked up ${pickupKindText(kinds)} from ${project.name}`,
        metadata: {
          pickupId: pickup.id,
          pickupKinds: kinds,
          requesterUserId: me.id,
          summary,
        },
        createdAt: nowIso,
      }
    : undefined;
  if (notification) seedNotifications.unshift(notification);

  seedAuditEvents.unshift({
    id: `audit-${Date.now()}`,
    entityType: "project",
    entityId: project.id,
    action: "inventory_picked_up",
    actorUserId: me.id,
    metadata: {
      pickupId: pickup.id,
      notificationId: notification?.id,
      summary,
      note: note || undefined,
    },
    createdAt: nowIso,
  });

  return delay(ok(pickup));
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
  role?: UserRole;
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

export async function deleteClient(id: string): Promise<ApiResult<ClientRecord>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });
  if (me.role !== "admin" && me.role !== "project_manager") {
    return delay({ ok: false, error: { code: "FORBIDDEN", message: "Admins or project managers only" } });
  }

  const client = seedClients.find((c) => c.id === id);
  if (!client) return delay({ ok: false, error: { code: "NOT_FOUND", message: "Client not found" } });
  if (client.archived) return delay({ ok: false, error: { code: "STATE_VIOLATION", message: "Client already deleted" } });

  const clientProjects = seedProjects.filter((project) => project.clientId === id);
  if (me.role === "project_manager") {
    const isVisible = clientProjects.some((project) => project.assignedProjectManagerId === me.id);
    if (!isVisible) return delay({ ok: false, error: { code: "FORBIDDEN", message: "Access denied" } });
    const openProjects = clientProjects.filter((project) => project.status !== "archived");
    if (openProjects.length > 0) {
      return delay({ ok: false, error: { code: "STATE_VIOLATION", message: "Delete this client's projects before deleting the client" } });
    }
  }

  const nowIso = new Date().toISOString();
  client.archived = true;
  client.updatedAt = nowIso;

  if (me.role === "admin") {
    clientProjects.forEach((project) => {
      if (project.status !== "archived") {
        project.status = "archived";
        project.updatedAt = nowIso;
      }
    });
  }

  seedAuditEvents.unshift({
    id: `audit-${Date.now()}`,
    entityType: "client_record",
    entityId: client.id,
    action: "delete_client",
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

  syncProjectCompletion(input.projectId, me.id, nowIso);

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

export interface UpdatePhaseSchedulesInput {
  projectId: string;
  changes: {
    phaseId: string;
    scheduledStart: string;
    scheduledEnd: string;
  }[];
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

export async function updatePhaseSchedules(input: UpdatePhaseSchedulesInput): Promise<ApiResult<Phase[]>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });

  const project = seedProjects.find((p) => p.id === input.projectId);
  if (!project) return delay({ ok: false, error: { code: "NOT_FOUND", message: "Project not found" } });

  if (me.role === "project_manager" && project.assignedProjectManagerId !== me.id) {
    return delay({ ok: false, error: { code: "FORBIDDEN", message: "Access denied" } });
  }

  if (project.status === "completed" || project.status === "archived") {
    return delay({ ok: false, error: { code: "STATE_VIOLATION", message: "Cannot edit completed or archived projects" } });
  }

  if (!input.changes.length) {
    return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "At least one schedule change is required" } });
  }

  const projectPhases = seedPhases.filter((phase) => phase.projectId === input.projectId);
  const finalSchedules = new Map(
    projectPhases.map((phase) => [
      phase.id,
      {
        scheduledStart: phase.scheduledStart,
        scheduledEnd: phase.scheduledEnd,
      },
    ]),
  );

  for (const change of input.changes) {
    const phase = projectPhases.find((item) => item.id === change.phaseId);
    if (!phase) {
      return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "Schedule change includes a phase outside this project" } });
    }
    finalSchedules.set(change.phaseId, {
      scheduledStart: toScheduleDate(parseScheduleDate(change.scheduledStart)),
      scheduledEnd: toScheduleDate(parseScheduleDate(change.scheduledEnd)),
    });
  }

  const projectStartMs = project.scheduledStart ? parseScheduleDate(project.scheduledStart) : undefined;
  const projectEndMs = project.scheduledEnd ? parseScheduleDate(project.scheduledEnd) : undefined;
  const ordered = orderedSchedulePhases(projectPhases);

  for (const phase of ordered) {
    const schedule = finalSchedules.get(phase.id);
    if (!schedule?.scheduledStart || !schedule.scheduledEnd) {
      return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "Every phase requires scheduled start and end dates" } });
    }

    const startMs = parseScheduleDate(schedule.scheduledStart);
    const endMs = parseScheduleDate(schedule.scheduledEnd);
    if (endMs <= startMs) {
      return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "Phase end dates must be after phase start dates" } });
    }
    if ((projectStartMs !== undefined && startMs < projectStartMs) || (projectEndMs !== undefined && endMs > projectEndMs)) {
      return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "Phase schedules must stay inside the project schedule" } });
    }
  }

  const nowIso = new Date().toISOString();
  const updatedPhases: Phase[] = [];
  for (const change of input.changes) {
    const phase = seedPhases.find((item) => item.id === change.phaseId)!;
    const schedule = finalSchedules.get(change.phaseId)!;
    const previousValue = {
      scheduledStart: phase.scheduledStart,
      scheduledEnd: phase.scheduledEnd,
    };
    phase.scheduledStart = schedule.scheduledStart;
    phase.scheduledEnd = schedule.scheduledEnd;
    phase.updatedAt = nowIso;
    updatedPhases.push(phase);

    seedAuditEvents.unshift({
      id: `audit-${Date.now()}-${phase.id}`,
      entityType: "phase",
      entityId: phase.id,
      action: "updated",
      actorUserId: me.id,
      previousValue,
      nextValue: {
        scheduledStart: phase.scheduledStart,
        scheduledEnd: phase.scheduledEnd,
      },
      createdAt: nowIso,
    });
  }

  project.updatedAt = nowIso;

  return delay(ok(updatedPhases));
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

  syncProjectCompletion(input.projectId, me.id, nowIso);

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

function seedSequentialPhaseSchedules(projectStart: string, projectEnd: string, phaseCount: number) {
  const startMs = parseScheduleDate(projectStart);
  const endMs = parseScheduleDate(projectEnd);
  const totalMs = endMs - startMs;
  if (phaseCount <= 0 || totalMs < phaseCount * 24 * 60 * 60 * 1000) return [];

  const phaseDurationMs = Math.floor(totalMs / phaseCount);
  return Array.from({ length: phaseCount }, (_, index) => {
    const scheduledStartMs = startMs + phaseDurationMs * index;
    const scheduledEndMs = index === phaseCount - 1 ? endMs : scheduledStartMs + phaseDurationMs;
    return {
      scheduledStart: toScheduleDate(scheduledStartMs),
      scheduledEnd: toScheduleDate(scheduledEndMs),
    };
  });
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
  const phaseSchedules =
    input.scheduledStart && input.scheduledEnd
      ? seedSequentialPhaseSchedules(input.scheduledStart, input.scheduledEnd, phaseTypes.length)
      : [];
  phaseTypes.forEach((type, index) => {
    const phaseId = `${id}-phase-${type}`;
    const phase: Phase = {
      id: phaseId,
      projectId: id,
      type,
      status: "not_started",
      scheduledStart: phaseSchedules[index]?.scheduledStart,
      scheduledEnd: phaseSchedules[index]?.scheduledEnd,
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

export async function deleteProject(projectId: string): Promise<ApiResult<Project>> {
  const me = seedUsers.find((u) => u.id === currentUserId);
  if (!me) return delay({ ok: false, error: { code: "UNAUTHORIZED", message: "No active session" } });
  if (me.role !== "admin" && me.role !== "project_manager") {
    return delay({ ok: false, error: { code: "FORBIDDEN", message: "Admins or project managers only" } });
  }

  const project = seedProjects.find((p) => p.id === projectId);
  if (!project) return delay({ ok: false, error: { code: "NOT_FOUND", message: "Project not found" } });

  if (me.role === "project_manager" && project.assignedProjectManagerId !== me.id) {
    return delay({ ok: false, error: { code: "FORBIDDEN", message: "Access denied" } });
  }
  if (project.status === "archived") {
    return delay({ ok: false, error: { code: "STATE_VIOLATION", message: "Project already deleted" } });
  }

  const nowIso = new Date().toISOString();
  const previousValue = project.status;
  project.status = "archived";
  project.updatedAt = nowIso;

  seedAuditEvents.unshift({
    id: `audit-${Date.now()}`,
    entityType: "project",
    entityId: projectId,
    action: "delete_project",
    actorUserId: me.id,
    previousValue,
    nextValue: "archived",
    createdAt: nowIso,
  });

  return delay(ok(project));
}
