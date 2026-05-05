# Data Model

Source of truth: backend-shaped entity model for prototype fixtures and future Supabase schema.

## Modeling Rules

- Use stable string IDs for every entity.
- Use ISO timestamps for `createdAt` and `updatedAt` in TypeScript contracts.
- Keep prototype field names close to future API names.
- Do not include authenticated Client users.
- Do not include client-safe portal fields in MVP.
- Do not encode strict phase sequence requirements.
- Use one assigned Project Manager per project for MVP authorization. PM reassignment is supported with audit trail (DEC-019).
- MVP is single-tenant for Titan (DEC-016). No `orgId` or Organization entity.

## Core Entities

### User

```ts
type UserRole = "admin" | "project_manager";

interface User {
  id: string;
  role: UserRole;
  fullName: string;
  email: string;
  phone?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### ClientRecord

```ts
interface ClientRecord {
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
```

### Project

```ts
type ProjectStatus = "draft" | "active" | "completed" | "archived";

interface Project {
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
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

MVP Project Manager access derives from `assignedProjectManagerId`. Admin can access all project data. A Project Manager can read and mutate only projects where `assignedProjectManagerId` matches the current user. Multi-PM membership tables are backlog unless a later decision changes MVP scope.

### Phase

```ts
type PhaseType = "insulation" | "drywall" | "finishing";
type PhaseStatus = "not_started" | "in_progress" | "ready_for_inspection" | "closed" | "blocked";

interface Phase {
  id: string;
  projectId: string;
  type: PhaseType;
  status: PhaseStatus;
  scheduledStart?: string;
  scheduledEnd?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Gate

```ts
type GateType = "site_check" | "inspection" | "attic_check";
type GateStatus = "not_started" | "in_progress" | "passed" | "failed" | "blocked";

interface Gate {
  id: string;
  projectId: string;
  phaseId?: string;
  type: GateType;
  status: GateStatus;
  completedByUserId?: string;
  completedAt?: string;
  requiredPhotoEvidence: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Deficiency

```ts
type DeficiencyStatus = "open" | "in_progress" | "resolved" | "closed";
type DeficiencySeverity = "low" | "medium" | "high" | "critical";

interface Deficiency {
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
```

### SubcontractorContact

```ts
type TradeType = "insulation" | "drywall" | "finishing";

interface SubcontractorContact {
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
```

### PhotoEvidence

```ts
type PhotoEvidenceStatus = "pending_upload" | "uploaded" | "confirmed" | "failed";
type PhotoEvidencePurpose = "site_check" | "inspection" | "attic_check" | "deficiency_before" | "deficiency_after" | "general";

interface PhotoEvidence {
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
```

`PhotoEvidence` is the canonical owner of media relationships. Deficiency before/after photos are derived from `PhotoEvidence` records where `deficiencyId` matches and `purpose` is `deficiency_before` or `deficiency_after`. Attic evidence is valid only when the record is `confirmed`, linked to the project, and has `purpose: "attic_check"`.

Photo deletion is allowed via `deletePhotoEvidence()` and must write an audit event. Deletion is blocked if the photo is the sole evidence for a passed gate or completed attic check.

### AuditEvent

```ts
type AuditEntityType = "project" | "phase" | "gate" | "deficiency" | "photo_evidence" | "client_record" | "subcontractor_contact" | "user";

interface AuditEvent {
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
```

## Relationships

- ClientRecord has many Projects.
- Project has three Phases.
- Project has one Attic Check Gate.
- Phase has one Site Check Gate.
- Phase has one Inspection Gate.
- Phase has many Deficiencies.
- Project and Phase can have many PhotoEvidence records.
- Gate and Deficiency photo relationships are represented by PhotoEvidence records.
- AuditEvent can point to any security-sensitive entity.

## State Transition Rules

Project transitions:

- `draft -> active`
- `active -> completed`
- `active -> archived`
- `completed -> archived`
- `archived` is terminal for MVP.

Project completion requires confirmed attic photo evidence.

Phase transitions:

- `not_started -> in_progress`
- `in_progress -> ready_for_inspection`
- `in_progress -> blocked`
- `blocked -> in_progress`
- `ready_for_inspection -> closed`
- `ready_for_inspection -> blocked`
- `closed -> in_progress` only as an audited reopen.

Gate transitions:

- `not_started -> in_progress`
- `in_progress -> passed`
- `in_progress -> failed`
- `in_progress -> blocked`
- `blocked -> in_progress`
- `passed -> in_progress` only as an audited reopen.
- `failed -> in_progress` only as an audited retry.

Deficiency transitions:

- `open -> in_progress`
- `open -> resolved`
- `in_progress -> resolved`
- `resolved -> closed`
- `closed -> open` only as an audited reopen.

All reopen, archive, and project-completion actions must write audit events.

Photo evidence transitions:

- `pending_upload -> uploaded`
- `pending_upload -> failed`
- `uploaded -> confirmed`
- `uploaded -> failed`
- `failed -> pending_upload` (retry)

`confirmed` is terminal for status. Confirmed photos can only be removed via `deletePhotoEvidence()`.

## Seed Data Requirements

Prototype seed data must include:

- At least 4 client records.
- At least 10 projects across draft, active, completed, and archived.
- Projects with all three phase types.
- At least one blocked phase.
- At least one failed inspection.
- At least one project blocked by missing Attic Check photo evidence.
- At least one project ready to complete.
- At least one project assigned to a Project Manager.
- At least one PM-restricted view where Admin-only controls are hidden.
- At least 20 audit events.

## Old-Project Fields To Avoid In MVP

- Authenticated Client role fields.
- `client_safe` visibility flags.
- Client timeline view fields.
- Strict predecessor phase dependency fields.
- Offline sync queue fields.
- WatermelonDB-only local state fields.
- Multi-PM membership tables such as `project_members`.

## Definition Of Done

The data model is ready when prototype fixtures, API contract responses, and future Supabase tables can all map to these entities without renaming core concepts.
