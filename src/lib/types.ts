// Entity types — mirrors architecture/DATA_MODEL.md.

export type UserRole = "admin" | "project_manager" | "inventory_viewer";

export interface User {
  id: string;
  role: UserRole;
  fullName: string;
  email: string;
  phone?: string;
  adminOverviewEnabled?: boolean;
  inventoryEnabled?: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClientRecord {
  id: string;
  name: string;
  primaryContactName?: string;
  phone?: string;
  email?: string;
  billingAddress?: string;
  notes?: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ProjectStatus = "draft" | "active" | "completed" | "archived";

export type GateStatus = "not_started" | "in_progress" | "passed" | "failed" | "blocked";

export interface Project {
  id: string;
  clientId: string;
  projectNumber: string;
  name: string;
  siteAddress: string;
  status: ProjectStatus;
  assignedProjectManagerId?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  atticCheckStatus: GateStatus;
  finishLevel?: 1 | 2 | 3 | 4 | 5;
  completedAt?: string;
  notes?: string;
  notesLastEditedBy?: string;
  notesLastEditedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type PhaseType = "insulation" | "drywall" | "finishing";
export type PhaseStatus =
  | "not_started"
  | "in_progress"
  | "ready_for_inspection"
  | "closed"
  | "blocked";

export interface Phase {
  id: string;
  projectId: string;
  type: PhaseType;
  status: PhaseStatus;
  scheduledStart?: string;
  scheduledEnd?: string;
  closedAt?: string;
  assignedSubcontractorId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialLog {
  id: string;
  projectId: string;
  phaseId: string;
  itemKey: string;
  quantity: number;
  updatedAt: string;
}

export interface PhaseChecklistItem {
  id: string;
  projectId: string;
  phaseId: string;
  text: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EquipmentLog {
  id: string;
  projectId: string;
  itemKey: string;
  quantity: number;
  updatedAt: string;
}

export type InventoryPickupItemKind = "material" | "equipment";

export interface InventoryPickupItem {
  kind: InventoryPickupItemKind;
  itemKey: string;
  quantity: number;
}

export interface InventoryPickup {
  id: string;
  projectId: string;
  pickedUpByUserId: string;
  items: InventoryPickupItem[];
  note?: string;
  createdAt: string;
}

export type GateType = "site_check" | "inspection" | "attic_check";

export interface Gate {
  id: string;
  projectId: string;
  phaseId?: string;
  type: GateType;
  status: GateStatus;
  completedByUserId?: string;
  completedAt?: string;
  requiredPhotoEvidence: boolean;
  notes?: string;
  callInDate?: string;
  installDate?: string;
  callInSubcontractorId?: string;
  createdAt: string;
  updatedAt: string;
}

export type DeficiencyStatus = "open" | "in_progress" | "resolved" | "closed";
export type DeficiencySeverity = "low" | "medium" | "high" | "critical";

export interface Deficiency {
  id: string;
  projectId: string;
  phaseId: string;
  title: string;
  description?: string;
  severity: DeficiencySeverity;
  status: DeficiencyStatus;
  assignedSubcontractorId?: string;
  resolvedAt?: string;
  resolvedByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export type TradeType = "insulation" | "drywall" | "finishing";

export interface SubcontractorContact {
  id: string;
  displayName: string;
  companyName?: string;
  trade: TradeType;
  phone?: string;
  email?: string;
  active: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PhotoEvidenceStatus = "pending_upload" | "uploaded" | "confirmed" | "failed";
export type PhotoEvidencePurpose =
  | "site_check"
  | "inspection"
  | "attic_check"
  | "deficiency_before"
  | "deficiency_after"
  | "general";

export interface PhotoEvidence {
  id: string;
  projectId: string;
  phaseId?: string;
  gateId?: string;
  deficiencyId?: string;
  purpose: PhotoEvidencePurpose;
  objectKey: string;
  contentHash?: string;
  mimeType: string;
  fileSizeBytes?: number;
  status: PhotoEvidenceStatus;
  uploadedByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export type AuditEntityType =
  | "project"
  | "phase"
  | "gate"
  | "deficiency"
  | "photo_evidence"
  | "client_record"
  | "subcontractor_contact"
  | "inventory_pickup"
  | "user";

export interface AuditEvent {
  id: string;
  entityType: AuditEntityType;
  entityId: string;
  action: string;
  actorUserId: string;
  previousValue?: unknown;
  nextValue?: unknown;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type InventoryAuditRequestType = "materials" | "hardware" | "both";
export type InventoryPickupNotificationKind = "materials" | "hardware";

export interface AppNotification {
  id: string;
  recipientUserId: string;
  type: "inventory_audit_request" | "inventory_pickup" | "phase_end_due";
  projectId: string;
  message: string;
  readAt?: string;
  metadata?: {
    auditRequestType?: InventoryAuditRequestType;
    pickupId?: string;
    pickupKinds?: InventoryPickupNotificationKind[];
    phaseId?: string;
    phaseType?: PhaseType;
    phaseEndDate?: string;
    requesterUserId?: string;
    summary?: string;
  };
  createdAt: string;
}

// API result envelope
export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "STATE_VIOLATION"
  | "UPLOAD_FAILED"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  fieldErrors?: Record<string, string>;
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

export interface ProjectDetail {
  project: Project;
  client: ClientRecord;
  assignedProjectManager?: User;
  phases: Phase[];
  gates: Gate[];
  deficiencies: Deficiency[];
  photoEvidence: PhotoEvidence[];
  subcontractors: SubcontractorContact[];
  auditEvents: AuditEvent[];
}

export interface PhaseDetail {
  phase: Phase;
  project: Project;
  assignedProjectManager?: User;
  gates: Gate[];
  deficiencies: Deficiency[];
  photoEvidence: PhotoEvidence[];
  subcontractors: SubcontractorContact[];
  auditEvents: AuditEvent[];
  checklistItems: PhaseChecklistItem[];
}

export interface ProjectFilters {
  search?: string;
  clientId?: string;
  status?: ProjectStatus[];
  phaseStatus?: PhaseStatus[];
  assignedProjectManagerId?: string;
  hasBlockedWork?: boolean;
  missingAtticEvidence?: boolean;
}

export interface CompleteInspectionInput {
  gateId: string;
  phaseId: string;
  projectId: string;
  passed: boolean;
  inspectorName: string;
  inspectionDate: string;
  notes?: string;
  photo?: File;
  photos?: File[];
  deficiencyTitle?: string;
  deficiencyDescription?: string;
  deficiencySeverity?: DeficiencySeverity;
}

export interface CreateDeficiencyInput {
  projectId: string;
  phaseId: string;
  title: string;
  description?: string;
  severity: DeficiencySeverity;
  photo?: File;
}

export interface UpdateDeficiencyInput {
  title?: string;
  description?: string;
  severity?: DeficiencySeverity;
  status?: DeficiencyStatus;
  photo?: File;
}

export interface CreateSubcontractorInput {
  displayName: string;
  trade: TradeType;
  companyName: string;
  phone: string;
  email: string;
  notes?: string;
}

export interface UpdateSubcontractorInput {
  displayName?: string;
  trade?: TradeType;
  companyName?: string;
  phone?: string;
  email?: string;
  notes?: string;
  active?: boolean;
}
