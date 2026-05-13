# API Contract

Source of truth: frontend-facing interfaces for the seeded prototype and future backend.

## Contract Rule

UI components must not import fixture files directly. They must call functions from this contract. During prototype development these functions use seeded data. During backend integration the implementation changes, but component call sites should remain stable.

Contract functions live under `lib/api/`. Prototype implementations live under `lib/api/adapters/prototype/`; later Supabase-backed implementations live under `lib/api/adapters/supabase/`.

## Common Result Shape

```ts
type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "STATE_VIOLATION"
  | "UPLOAD_FAILED"
  | "CONFLICT"
  | "INTERNAL_ERROR";

interface ApiError {
  code: ApiErrorCode;
  message: string;
  fieldErrors?: Record<string, string>;
}

type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };
```

## Read Functions

```ts
interface ProjectFilters {
  search?: string;
  clientId?: string;
  status?: ProjectStatus[];
  phaseStatus?: PhaseStatus[];
  assignedProjectManagerId?: string;
  hasBlockedWork?: boolean;
  missingAtticEvidence?: boolean;
}

async function getCurrentUser(): Promise<ApiResult<User>>;
async function getUsers(): Promise<ApiResult<User[]>>;
async function getClients(): Promise<ApiResult<ClientRecord[]>>;
async function getClient(id: string): Promise<ApiResult<ClientRecord>>;
async function getProjects(filters?: ProjectFilters): Promise<ApiResult<Project[]>>;
async function getProject(id: string): Promise<ApiResult<ProjectDetail>>;
async function getPhase(id: string): Promise<ApiResult<PhaseDetail>>;
async function getPhaseMaterials(phaseId: string): Promise<ApiResult<MaterialLog[]>>;
async function getProjectEquipment(projectId: string): Promise<ApiResult<EquipmentLog[]>>;
async function getAuditEvents(input: { entityType?: AuditEntityType; entityId?: string; projectId?: string }): Promise<ApiResult<AuditEvent[]>>;
async function getSubcontractorContacts(): Promise<ApiResult<SubcontractorContact[]>>;
async function getPhotoViewUrl(photoId: string): Promise<ApiResult<{ url: string; expiresAt: string }>>;
```

`assignedProjectManagerId` is a filter field only. It is not a permission override. Admin can filter by any assigned PM; Project Manager results must still be constrained to projects where `assignedProjectManagerId` matches the current user.

`getClients()` returns all client records for Admin. For Project Manager, results are pre-filtered by the adapter or RLS to include only clients referenced by at least one project assigned to the current PM.

`getPhotoViewUrl()` returns a time-limited signed R2 URL for viewing a specific photo. URLs expire after a short window (15-30 minutes). The backend or adapter must verify the caller has access to the parent project.

**Pagination**: MVP list functions return full result arrays. Pagination is a known limitation and a backlog item. If result sets grow beyond usable sizes during UAT, add cursor-based pagination to affected functions.

## Write Functions

```ts
async function createClient(input: CreateClientInput): Promise<ApiResult<ClientRecord>>;
async function updateClient(id: string, input: UpdateClientInput): Promise<ApiResult<ClientRecord>>;
async function createProject(input: CreateProjectInput): Promise<ApiResult<Project>>;
async function updateProject(id: string, input: UpdateProjectInput): Promise<ApiResult<Project>>;
async function updatePhase(id: string, input: UpdatePhaseInput): Promise<ApiResult<Phase>>;
async function updatePhaseMaterial(input: { phaseId: string; projectId: string; itemKey: string; quantity: number }): Promise<ApiResult<MaterialLog>>;
async function updateProjectEquipment(input: { projectId: string; itemKey: string; quantity: number }): Promise<ApiResult<EquipmentLog>>;
async function updatePhaseGate(input: UpdateGateInput): Promise<ApiResult<Gate>>;
async function completeInspection(input: CompleteInspectionInput): Promise<ApiResult<Gate>>;
async function completeAtticCheck(input: CompleteAtticCheckInput): Promise<ApiResult<Project>>;
async function createDeficiency(input: CreateDeficiencyInput): Promise<ApiResult<Deficiency>>;
async function updateDeficiency(id: string, input: UpdateDeficiencyInput): Promise<ApiResult<Deficiency>>;
async function createSubcontractorContact(input: CreateSubcontractorInput): Promise<ApiResult<SubcontractorContact>>;
async function updateSubcontractorContact(id: string, input: UpdateSubcontractorInput): Promise<ApiResult<SubcontractorContact>>;
async function deactivateSubcontractorContact(id: string): Promise<ApiResult<SubcontractorContact>>;
async function uploadPhotoEvidence(input: UploadPhotoEvidenceInput): Promise<ApiResult<PhotoEvidence>>;
async function deletePhotoEvidence(id: string): Promise<ApiResult<void>>;
async function createUser(input: CreateUserInput): Promise<ApiResult<User>>;
async function updateUser(id: string, input: UpdateUserInput): Promise<ApiResult<User>>;
async function deactivateUser(id: string): Promise<ApiResult<User>>;
async function reassignProject(projectId: string, newProjectManagerId: string): Promise<ApiResult<Project>>;
```

## Detail Shapes

```ts
interface ProjectDetail {
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

interface PhaseDetail {
  phase: Phase;
  project: Project;
  gates: Gate[];
  deficiencies: Deficiency[];
  photoEvidence: PhotoEvidence[];
  subcontractors: SubcontractorContact[];
  auditEvents: AuditEvent[];
}
```

The `photoEvidence` arrays in detail shapes are derived response data. The canonical relationship is the `PhotoEvidence` record itself, including `projectId`, optional `phaseId`, optional `gateId`, optional `deficiencyId`, and `purpose`.

## User And Subcontractor Management Inputs

```ts
interface CreateUserInput {
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string;
}

interface UpdateUserInput {
  fullName?: string;
  phone?: string;
  role?: UserRole;
}

interface UpdateSubcontractorInput {
  displayName?: string;
  companyName?: string;
  trade?: TradeType;
  phone?: string;
  email?: string;
  notes?: string;
}
```

## Critical Inputs

```ts
interface CompleteAtticCheckInput {
  projectId: string;
  photoEvidenceIds: string[];
  notes?: string;
}

interface CompleteInspectionInput {
  phaseId: string;
  passed: boolean;
  inspectorName: string;
  inspectionDate: string;
  notes?: string;
  photoEvidenceIds?: string[];
}

interface UpdateGateInput {
  gateId: string;
  status: GateStatus;
  notes?: string;
  photoEvidenceIds?: string[];
}

interface UploadPhotoEvidenceInput {
  projectId: string;
  phaseId?: string;
  gateId?: string;
  deficiencyId?: string;
  purpose: PhotoEvidencePurpose;
  file: File;
  contentHash?: string;
}
```

## State Rules

- `completeAtticCheck()` must fail with `STATE_VIOLATION` if `photoEvidenceIds` is empty.
- `completeAtticCheck()` must fail unless every attic evidence ID points to a `confirmed` PhotoEvidence record for the same project with `purpose: "attic_check"`.
- `completeInspection()` must create or update an audit event.
- `uploadPhotoEvidence()` must return only metadata and object keys, not public URLs.
- PM calls must fail with `FORBIDDEN` for Admin-only mutations.
- PM calls must fail with `FORBIDDEN` when the target project is not assigned to the current Project Manager.
- `inventory_viewer` calls to `getProjects()` always return only `status: "active"` projects regardless of filters, with cross-PM visibility. All write functions must fail with `FORBIDDEN` for `inventory_viewer` role.
- `deletePhotoEvidence()` must write an audit event and fail with `STATE_VIOLATION` if the photo is the sole evidence for a passed gate or completed attic check.
- `deactivateUser()` must fail with `STATE_VIOLATION` if the user has active assigned projects, unless projects are reassigned first.
- `reassignProject()` must write an audit event recording the previous and new PM.
- `createUser()` and `updateUser()` with role changes are Admin-only and must write audit events.
- All write functions must return validation errors in a field-addressable shape.

Allowed transitions match `DATA_MODEL.md`. Reopen, archive, and project-completion actions must write audit events.

## Prototype Implementation Rule

The prototype implementation may keep in-memory or local fixture state, but it must preserve these function names, input shapes, result shapes, and failure modes.

## Backend Implementation Rule

The backend implementation should map these calls to Next.js server actions or route handlers first. Supabase tables and RLS policies must enforce permission boundaries.

## Definition Of Done

The API contract is ready when every MVP screen in `../DESIGN.md` can be implemented by calling only the functions in this document.
