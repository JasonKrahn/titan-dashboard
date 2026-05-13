# Supabase Mapping Document

This document maps the Titan Dashboard prototype fixture model and adapter rules to a production-ready Supabase Postgres schema with RLS as the authorization boundary.

## 1. Schema Mapping Table

### Core identity and access

| Prototype entity / field | Supabase table / column | Postgres type | Notes |
| --- | --- | --- | --- |
| `User.id` | `profiles.id` | `uuid` | Primary key and FK to `auth.users(id)`. Use a legacy ID crosswalk during seed import. |
| `User.role` | `profiles.role` | `user_role` enum | Values: `admin`, `project_manager`, `inventory_viewer`. Store in database state, not user-editable metadata. |
| `User.fullName` | `profiles.full_name` | `text` | Required. |
| `User.email` | `profiles.email` | `citext` | Required, unique. Mirror from auth user email for app queries. |
| `User.phone` | `profiles.phone` | `text` | Nullable. |
| `User.adminOverviewEnabled` | `profiles.admin_overview_enabled` | `boolean` | Default `false`; only meaningful for `admin`. |
| `User.active` | `profiles.active` | `boolean` | Default `true`; deactivate instead of deleting. |
| `User.createdAt` | `profiles.created_at` | `timestamptz` | Default `now()`, but preserve seed timestamps. |
| `User.updatedAt` | `profiles.updated_at` | `timestamptz` | Maintained by trigger. |

### Clients and projects

| Prototype entity / field | Supabase table / column | Postgres type | Notes |
| --- | --- | --- | --- |
| `ClientRecord.id` | `clients.id` | `uuid` | Primary key. |
| `ClientRecord.name` | `clients.name` | `text` | Required. |
| `ClientRecord.primaryContactName` | `clients.primary_contact_name` | `text` | Nullable. |
| `ClientRecord.phone` | `clients.phone` | `text` | Nullable. |
| `ClientRecord.email` | `clients.email` | `citext` | Nullable. |
| `ClientRecord.billingAddress` | `clients.billing_address` | `text` | Nullable. |
| `ClientRecord.notes` | `clients.notes` | `text` | Nullable. |
| `ClientRecord.archived` | `clients.archived` | `boolean` | Default `false`; client delete is soft archive. |
| `ClientRecord.createdAt` | `clients.created_at` | `timestamptz` | Required. |
| `ClientRecord.updatedAt` | `clients.updated_at` | `timestamptz` | Maintained by trigger. |
| `Project.id` | `projects.id` | `uuid` | Primary key. |
| `Project.clientId` | `projects.client_id` | `uuid` | FK to `clients(id)`. |
| `Project.projectNumber` | `projects.project_number` | `text` | Required, recommended unique. |
| `Project.name` | `projects.name` | `text` | Required. |
| `Project.siteAddress` | `projects.site_address` | `text` | Required. |
| `Project.status` | `projects.status` | `project_status` enum | `draft`, `active`, `completed`, `archived`. |
| `Project.assignedProjectManagerId` | `projects.assigned_project_manager_id` | `uuid` | Nullable FK to `profiles(id)`. PM authorization derives from this. |
| `Project.scheduledStart` | `projects.scheduled_start` | `date` | Prototype stores ISO strings; production should store schedule-only dates as `date`. |
| `Project.scheduledEnd` | `projects.scheduled_end` | `date` | Nullable. Add check `scheduled_end >= scheduled_start` when both present. |
| `Project.atticCheckStatus` | `projects.attic_check_status` | `gate_status` enum | Denormalized project-level status synced from attic gate. |
| `Project.finishLevel` | `projects.finish_level` | `smallint` | Nullable, check between 1 and 5. |
| `Project.completedAt` | `projects.completed_at` | `timestamptz` | Set when all phases are closed and attic gate passed. |
| `Project.notes` | `projects.notes` | `text` | Nullable. |
| `Project.notesLastEditedBy` | `projects.notes_last_edited_by` | `uuid` | Nullable FK to `profiles(id)`. |
| `Project.notesLastEditedAt` | `projects.notes_last_edited_at` | `timestamptz` | Nullable. |
| `Project.createdAt` | `projects.created_at` | `timestamptz` | Required. |
| `Project.updatedAt` | `projects.updated_at` | `timestamptz` | Maintained by trigger. |

### Work execution

| Prototype entity / field | Supabase table / column | Postgres type | Notes |
| --- | --- | --- | --- |
| `Phase.id` | `phases.id` | `uuid` | Primary key. |
| `Phase.projectId` | `phases.project_id` | `uuid` | FK to `projects(id)`. |
| `Phase.type` | `phases.type` | `phase_type` enum | `insulation`, `drywall`, `finishing`. |
| `Phase.status` | `phases.status` | `phase_status` enum | `not_started`, `in_progress`, `ready_for_inspection`, `closed`, `blocked`. |
| `Phase.scheduledStart` | `phases.scheduled_start` | `date` | Nullable. |
| `Phase.scheduledEnd` | `phases.scheduled_end` | `date` | Nullable. Should be inside project date boundaries. |
| `Phase.closedAt` | `phases.closed_at` | `timestamptz` | Nullable. |
| `Phase.assignedSubcontractorId` | `phases.assigned_subcontractor_id` | `uuid` | Nullable FK to `subcontractors(id)`. |
| `Phase.createdAt` | `phases.created_at` | `timestamptz` | Required. |
| `Phase.updatedAt` | `phases.updated_at` | `timestamptz` | Maintained by trigger. |
| `Gate.id` | `gates.id` | `uuid` | Primary key. |
| `Gate.projectId` | `gates.project_id` | `uuid` | FK to `projects(id)`. |
| `Gate.phaseId` | `gates.phase_id` | `uuid` | Nullable FK to `phases(id)`; null for project attic gate. |
| `Gate.type` | `gates.type` | `gate_type` enum | `site_check`, `inspection`, `attic_check`. |
| `Gate.status` | `gates.status` | `gate_status` enum | Shared gate/project attic status enum. |
| `Gate.completedByUserId` | `gates.completed_by_user_id` | `uuid` | Nullable FK to `profiles(id)`. |
| `Gate.completedAt` | `gates.completed_at` | `timestamptz` | Nullable. |
| `Gate.requiredPhotoEvidence` | `gates.required_photo_evidence` | `boolean` | Required, default `false`. |
| `Gate.notes` | `gates.notes` | `text` | Nullable. |
| `Gate.callInDate` | `gates.call_in_date` | `date` | Attic/check scheduling field. |
| `Gate.installDate` | `gates.install_date` | `date` | Attic/check scheduling field. |
| `Gate.callInSubcontractorId` | `gates.call_in_subcontractor_id` | `uuid` | Nullable FK to `subcontractors(id)`. |
| `Gate.createdAt` | `gates.created_at` | `timestamptz` | Required. |
| `Gate.updatedAt` | `gates.updated_at` | `timestamptz` | Maintained by trigger. |

### Deficiencies, subcontractors, and media

| Prototype entity / field | Supabase table / column | Postgres type | Notes |
| --- | --- | --- | --- |
| `Deficiency.id` | `deficiencies.id` | `uuid` | Primary key. |
| `Deficiency.projectId` | `deficiencies.project_id` | `uuid` | FK to `projects(id)`. |
| `Deficiency.phaseId` | `deficiencies.phase_id` | `uuid` | FK to `phases(id)`. |
| `Deficiency.title` | `deficiencies.title` | `text` | Required. |
| `Deficiency.description` | `deficiencies.description` | `text` | Nullable. |
| `Deficiency.severity` | `deficiencies.severity` | `deficiency_severity` enum | `low`, `medium`, `high`, `critical`. |
| `Deficiency.status` | `deficiencies.status` | `deficiency_status` enum | `open`, `in_progress`, `resolved`, `closed`. |
| `Deficiency.assignedSubcontractorId` | `deficiencies.assigned_subcontractor_id` | `uuid` | Nullable FK to `subcontractors(id)`. |
| `Deficiency.resolvedAt` | `deficiencies.resolved_at` | `timestamptz` | Nullable. |
| `Deficiency.resolvedByUserId` | `deficiencies.resolved_by_user_id` | `uuid` | Nullable FK to `profiles(id)`. |
| `Deficiency.createdAt` | `deficiencies.created_at` | `timestamptz` | Required. |
| `Deficiency.updatedAt` | `deficiencies.updated_at` | `timestamptz` | Maintained by trigger. |
| `SubcontractorContact.id` | `subcontractors.id` | `uuid` | Primary key. |
| `SubcontractorContact.displayName` | `subcontractors.display_name` | `text` | Required. |
| `SubcontractorContact.companyName` | `subcontractors.company_name` | `text` | Nullable. |
| `SubcontractorContact.trade` | `subcontractors.trade` | `trade_type` enum | `insulation`, `drywall`, `finishing`. |
| `SubcontractorContact.phone` | `subcontractors.phone` | `text` | Nullable. |
| `SubcontractorContact.email` | `subcontractors.email` | `citext` | Nullable. |
| `SubcontractorContact.active` | `subcontractors.active` | `boolean` | Default `true`; deactivate instead of delete. |
| `SubcontractorContact.notes` | `subcontractors.notes` | `text` | Nullable. |
| `SubcontractorContact.createdAt` | `subcontractors.created_at` | `timestamptz` | Required. |
| `SubcontractorContact.updatedAt` | `subcontractors.updated_at` | `timestamptz` | Maintained by trigger. |
| `PhotoEvidence.id` | `photo_evidence.id` | `uuid` | Primary key. |
| `PhotoEvidence.projectId` | `photo_evidence.project_id` | `uuid` | FK to `projects(id)`. |
| `PhotoEvidence.phaseId` | `photo_evidence.phase_id` | `uuid` | Nullable FK to `phases(id)`. |
| `PhotoEvidence.gateId` | `photo_evidence.gate_id` | `uuid` | Nullable FK to `gates(id)`. |
| `PhotoEvidence.deficiencyId` | `photo_evidence.deficiency_id` | `uuid` | Nullable FK to `deficiencies(id)`. |
| `PhotoEvidence.purpose` | `photo_evidence.purpose` | `photo_evidence_purpose` enum | `site_check`, `inspection`, `attic_check`, `deficiency_before`, `deficiency_after`, `general`. |
| `PhotoEvidence.objectKey` | `photo_evidence.object_key` | `text` | Private R2/Supabase Storage key; never public URL. |
| `PhotoEvidence.contentHash` | `photo_evidence.content_hash` | `text` | Nullable; useful for dedupe/idempotency. |
| `PhotoEvidence.mimeType` | `photo_evidence.mime_type` | `text` | Required. |
| `PhotoEvidence.fileSizeBytes` | `photo_evidence.file_size_bytes` | `bigint` | Nullable, check `>= 0`. |
| `PhotoEvidence.status` | `photo_evidence.status` | `photo_evidence_status` enum | `pending_upload`, `uploaded`, `confirmed`, `failed`. |
| `PhotoEvidence.uploadedByUserId` | `photo_evidence.uploaded_by_user_id` | `uuid` | FK to `profiles(id)`. |
| `PhotoEvidence.createdAt` | `photo_evidence.created_at` | `timestamptz` | Required. |
| `PhotoEvidence.updatedAt` | `photo_evidence.updated_at` | `timestamptz` | Maintained by trigger. |

### Inventory and notifications

| Prototype entity / field | Supabase table / column | Postgres type | Notes |
| --- | --- | --- | --- |
| Inventory catalog item | `inventory_catalog_items.item_key` | `text` | Primary key. Seed from `PHASE_MATERIAL_CATALOGS` and `EQUIPMENT_ITEMS`. |
| Catalog label | `inventory_catalog_items.label` | `text` | Required. |
| Catalog kind | `inventory_catalog_items.kind` | `inventory_item_kind` enum | `material` or `equipment`. |
| Catalog phase type | `inventory_catalog_items.phase_type` | `phase_type` enum | Nullable for equipment; required for phase materials. |
| `MaterialLog.id` | `material_logs.id` | `uuid` | Primary key. |
| `MaterialLog.projectId` | `material_logs.project_id` | `uuid` | FK to `projects(id)`. Denormalized for query/RLS performance. |
| `MaterialLog.phaseId` | `material_logs.phase_id` | `uuid` | FK to `phases(id)`. |
| `MaterialLog.itemKey` | `material_logs.item_key` | `text` | FK to `inventory_catalog_items(item_key)`. |
| `MaterialLog.quantity` | `material_logs.quantity` | `integer` | Check `quantity >= 0`. |
| `MaterialLog.updatedAt` | `material_logs.updated_at` | `timestamptz` | Maintained by trigger. |
| `EquipmentLog.id` | `equipment_logs.id` | `uuid` | Primary key. |
| `EquipmentLog.projectId` | `equipment_logs.project_id` | `uuid` | FK to `projects(id)`. |
| `EquipmentLog.itemKey` | `equipment_logs.item_key` | `text` | FK to `inventory_catalog_items(item_key)`. |
| `EquipmentLog.quantity` | `equipment_logs.quantity` | `integer` | Check `quantity >= 0`. |
| `EquipmentLog.updatedAt` | `equipment_logs.updated_at` | `timestamptz` | Maintained by trigger. |
| `InventoryPickup.id` | `inventory_pickups.id` | `uuid` | Primary key. |
| `InventoryPickup.projectId` | `inventory_pickups.project_id` | `uuid` | FK to `projects(id)`. |
| `InventoryPickup.pickedUpByUserId` | `inventory_pickups.picked_up_by_user_id` | `uuid` | FK to `profiles(id)`. |
| `InventoryPickup.note` | `inventory_pickups.note` | `text` | Nullable, check `char_length(note) <= 500`. |
| `InventoryPickup.createdAt` | `inventory_pickups.created_at` | `timestamptz` | Required. |
| `InventoryPickup.items[]` | `inventory_pickup_items` | child table | Normalize instead of storing only JSON. |
| `InventoryPickupItem.kind` | `inventory_pickup_items.kind` | `inventory_pickup_item_kind` enum | `material`, `equipment`. |
| `InventoryPickupItem.itemKey` | `inventory_pickup_items.item_key` | `text` | FK to catalog. |
| `InventoryPickupItem.quantity` | `inventory_pickup_items.quantity` | `integer` | Check `quantity > 0`. |
| `AppNotification.id` | `notifications.id` | `uuid` | Primary key. |
| `AppNotification.recipientUserId` | `notifications.recipient_user_id` | `uuid` | FK to `profiles(id)`. |
| `AppNotification.type` | `notifications.type` | `notification_type` enum | `inventory_audit_request`, `inventory_pickup`, `phase_end_due`. |
| `AppNotification.projectId` | `notifications.project_id` | `uuid` | FK to `projects(id)`. |
| `AppNotification.message` | `notifications.message` | `text` | Required display text. |
| `AppNotification.readAt` | `notifications.read_at` | `timestamptz` | Nullable. |
| `AppNotification.metadata` | `notifications.metadata` | `jsonb` | Keep flexible typed metadata. |
| `AppNotification.createdAt` | `notifications.created_at` | `timestamptz` | Required. |

### Audit events

| Prototype entity / field | Supabase table / column | Postgres type | Notes |
| --- | --- | --- | --- |
| `AuditEvent.id` | `audit_events.id` | `uuid` | Primary key. |
| `AuditEvent.entityType` | `audit_events.entity_type` | `audit_entity_type` enum | `project`, `phase`, `gate`, `deficiency`, `photo_evidence`, `client_record`, `subcontractor_contact`, `inventory_pickup`, `user`. |
| `AuditEvent.entityId` | `audit_events.entity_id` | `uuid` | Polymorphic target. Cannot use a single FK. |
| `AuditEvent.action` | `audit_events.action` | `text` | Keep as text to support new audited actions without enum churn. |
| `AuditEvent.actorUserId` | `audit_events.actor_user_id` | `uuid` | FK to `profiles(id)`. |
| `AuditEvent.previousValue` | `audit_events.previous_value` | `jsonb` | Nullable. |
| `AuditEvent.nextValue` | `audit_events.next_value` | `jsonb` | Nullable. |
| `AuditEvent.metadata` | `audit_events.metadata` | `jsonb` | Nullable. |
| `AuditEvent.createdAt` | `audit_events.created_at` | `timestamptz` | Append-only. No `updated_at`. |

## 2. Relational Architecture

### Recommended enum definitions

```sql
create type user_role as enum ('admin', 'project_manager', 'inventory_viewer');
create type project_status as enum ('draft', 'active', 'completed', 'archived');
create type phase_type as enum ('insulation', 'drywall', 'finishing');
create type phase_status as enum ('not_started', 'in_progress', 'ready_for_inspection', 'closed', 'blocked');
create type gate_type as enum ('site_check', 'inspection', 'attic_check');
create type gate_status as enum ('not_started', 'in_progress', 'passed', 'failed', 'blocked');
create type deficiency_status as enum ('open', 'in_progress', 'resolved', 'closed');
create type deficiency_severity as enum ('low', 'medium', 'high', 'critical');
create type trade_type as enum ('insulation', 'drywall', 'finishing');
create type photo_evidence_status as enum ('pending_upload', 'uploaded', 'confirmed', 'failed');
create type photo_evidence_purpose as enum ('site_check', 'inspection', 'attic_check', 'deficiency_before', 'deficiency_after', 'general');
create type inventory_item_kind as enum ('material', 'equipment');
create type inventory_pickup_item_kind as enum ('material', 'equipment');
create type notification_type as enum ('inventory_audit_request', 'inventory_pickup', 'phase_end_due');
create type audit_entity_type as enum ('project', 'phase', 'gate', 'deficiency', 'photo_evidence', 'client_record', 'subcontractor_contact', 'inventory_pickup', 'user');
```

### Primary relationships and cascading rules

- **`auth.users -> profiles`:** `profiles.id references auth.users(id) on delete restrict`. App users should be deactivated, not physically removed, if historical audit data exists.
- **`clients -> projects`:** `projects.client_id references clients(id) on delete restrict`. Client deletion is soft archive; admin client archive may also mark related projects `archived`.
- **`profiles -> projects`:** `projects.assigned_project_manager_id references profiles(id) on delete set null`. Deactivation should be blocked while active assigned projects exist.
- **`projects -> phases`:** `phases.project_id references projects(id) on delete cascade`. Physical project deletes are not an MVP workflow; cascade exists for admin maintenance only.
- **`projects -> gates`:** `gates.project_id references projects(id) on delete cascade`.
- **`phases -> gates`:** `gates.phase_id references phases(id) on delete cascade` for phase gates; attic gate has `phase_id is null`.
- **`projects -> deficiencies`:** `deficiencies.project_id references projects(id) on delete cascade`.
- **`phases -> deficiencies`:** `deficiencies.phase_id references phases(id) on delete cascade`.
- **`subcontractors -> phases/deficiencies/gates`:** use `on delete set null` for `assigned_subcontractor_id` and `call_in_subcontractor_id` so historical work remains readable.
- **`projects/phases/gates/deficiencies -> photo_evidence`:** use `on delete cascade` for project-owned records, and `on delete set null` for optional gate/deficiency links only if preserving unlinked photos is desired. MVP can use cascade because photo evidence is project-owned.
- **`projects -> material_logs/equipment_logs`:** `on delete cascade`.
- **`phases -> material_logs`:** `on delete cascade`.
- **`inventory_pickups -> inventory_pickup_items`:** `inventory_pickup_items.pickup_id references inventory_pickups(id) on delete cascade`.
- **`profiles -> audit_events`:** `audit_events.actor_user_id references profiles(id) on delete restrict`.
- **`profiles -> notifications`:** `notifications.recipient_user_id references profiles(id) on delete cascade` is acceptable if deleting auth users is allowed; otherwise use restrict and deactivate users.

### Junction and child tables

- **No MVP project membership junction:** The prototype intentionally uses one assigned PM per project. Do not add `project_members` until multi-PM access becomes product scope.
- **`inventory_pickup_items`:** Required child table because pickup items are currently an array. Columns: `id uuid primary key`, `pickup_id uuid`, `kind`, `item_key`, `quantity`, `created_at`.
- **`inventory_catalog_items`:** Recommended reference table for material/equipment labels and valid keys. This replaces hard-coded UI-only catalogs as the production source of truth.
- **Photo relationships:** Do not create separate photo junctions for gates or deficiencies. The canonical relationship is `photo_evidence` with nullable `phase_id`, `gate_id`, and `deficiency_id` plus `purpose`.

### Uniqueness and check constraints

- **Projects:** `unique(project_number)`; check schedule date ordering.
- **Phases:** `unique(project_id, type)` to enforce one `insulation`, `drywall`, and `finishing` phase per project.
- **Gates:** partial uniqueness for one attic gate per project and one site/inspection gate per phase/type:
  - `unique(project_id) where type = 'attic_check'`
  - `unique(phase_id, type) where type in ('site_check', 'inspection')`
- **Material logs:** `unique(phase_id, item_key)` and check `quantity >= 0`.
- **Equipment logs:** `unique(project_id, item_key)` and check `quantity >= 0`.
- **Inventory pickup items:** check `quantity > 0`.
- **Notifications:** partial unique index to block duplicate outstanding inventory audit requests:

```sql
create unique index notifications_open_inventory_audit_unique
  on notifications (project_id, recipient_user_id, ((metadata->>'auditRequestType')))
  where type = 'inventory_audit_request' and read_at is null;
```

- **Phase end notifications:** unique index to dedupe generated due-today notifications even after read:

```sql
create unique index notifications_phase_end_due_unique
  on notifications (recipient_user_id, ((metadata->>'phaseId')), ((metadata->>'phaseEndDate')))
  where type = 'phase_end_due';
```

### Recommended indexes

- **Project access:** `projects(assigned_project_manager_id, status)`, `projects(client_id)`, `projects(updated_at desc)`.
- **Child lookup:** `phases(project_id)`, `gates(project_id, phase_id)`, `deficiencies(project_id, phase_id, status)`, `photo_evidence(project_id, phase_id, gate_id, deficiency_id)`.
- **Inventory:** `material_logs(project_id, phase_id)`, `equipment_logs(project_id)`, `inventory_pickups(project_id, created_at desc)`.
- **Notifications:** `notifications(recipient_user_id, read_at, created_at desc)`.
- **Audit:** `audit_events(entity_type, entity_id, created_at desc)`, `audit_events(actor_user_id, created_at desc)`.

## 3. Data Porting Strategy

1. **Create schema primitives**
   - Enable `pgcrypto` for `gen_random_uuid()` and `citext` for case-insensitive emails.
   - Create enums, tables, indexes, RLS helper functions, and `updated_at` triggers.
   - Enable RLS on every table in the exposed `public` schema.

2. **Build a legacy ID crosswalk**
   - The prototype uses stable strings such as `user-admin`, `proj-active-insulation`, and `sub-9`.
   - Create a temporary import table:

   ```sql
   create table import_id_map (
     entity_type text not null,
     legacy_id text not null,
     new_id uuid not null default gen_random_uuid(),
     primary key (entity_type, legacy_id),
     unique (new_id)
   );
   ```

   - Insert every seed ID before loading relational rows.
   - For users, prefer mapping each prototype user to a Supabase Auth user ID; if Auth users are created first, store those IDs in `new_id`.

3. **Load reference and identity data**
   - Seed `inventory_catalog_items` from `INSULATION_MATERIALS`, `DRYWALL_MATERIALS`, `FINISHING_MATERIALS`, and `EQUIPMENT_ITEMS`.
   - Create Supabase Auth users for active and inactive prototype users or create only production users and import inactive fixtures into `profiles` if allowed by the auth strategy.
   - Insert `profiles`, preserving `role`, `active`, `admin_overview_enabled`, `created_at`, and `updated_at`.

4. **Load clients and projects**
   - Convert camelCase to snake_case.
   - Convert schedule-only ISO strings to `date` using the first 10 characters (`YYYY-MM-DD`) to avoid timezone drift.
   - Insert clients before projects.
   - Insert projects with `client_id`, `assigned_project_manager_id`, note metadata, completion status, and attic status mapped through `import_id_map`.

5. **Load project-owned children**
   - Insert phases, then gates, then deficiencies.
   - Validate each phase `project_id` matches the parent project and each deficiency `phase_id` belongs to the same project.
   - Insert material/equipment logs after phases and projects exist.
   - Insert photo evidence after all optional targets exist; validate `project_id` consistency across `phase_id`, `gate_id`, and `deficiency_id`.

6. **Load inventory pickups and pickup items**
   - Insert one row into `inventory_pickups` for each prototype `InventoryPickup`.
   - Expand each `items[]` array into `inventory_pickup_items` rows.
   - Preserve the original pickup `created_at`, note, and picker.

7. **Load notifications and audit events**
   - Insert notifications with metadata as `jsonb`, translating nested IDs inside metadata if they point to imported entities.
   - Insert audit events last. Translate `actor_user_id` and `entity_id` where entity type is known.
   - Preserve `previous_value`, `next_value`, and `metadata` as `jsonb`; translate embedded IDs where practical but keep original text if it is display-only.

8. **Run integrity checks**
   - Confirm every active project has three phases and one attic gate.
   - Confirm every phase has one site check and one inspection gate.
   - Confirm all `material_logs.item_key` and `equipment_logs.item_key` exist in catalog.
   - Confirm all quantities are non-negative after seeded pickups.
   - Confirm outstanding audit-request notifications obey the partial unique index.
   - Confirm completed projects have closed phases and passed attic gates, including archive-ready fixtures.

9. **Cut over application logic**
   - Replace prototype adapter calls with server actions or route handlers that use Supabase.
   - Keep complex mutations transactional in server-side RPC functions or route handlers.
   - Keep R2/Supabase Storage signed URL generation out of public client code and never expose service-role secrets.

## 4. Supabase Row Level Security (RLS) Rules

### RLS principles for this app

- **Enable RLS everywhere:** Every table in `public` must have RLS enabled before production use.
- **Use trusted database state for roles:** Policies should read `profiles.role`, not user-editable metadata.
- **Put security-definer helpers in a private schema:** Do not create security-definer functions in an exposed schema.
- **Keep mutation orchestration server-side:** RLS enforces boundaries; server actions/RPCs enforce multi-row state transitions and audit writes.

### Helper functions

```sql
create schema if not exists private;

create or replace function private.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from profiles p
  where p.id = (select auth.uid())
    and p.active = true
$$;

create or replace function private.current_app_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from profiles p
  where p.id = (select auth.uid())
    and p.active = true
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(private.current_app_role() = 'admin', false)
$$;

create or replace function private.is_project_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(private.current_app_role() = 'project_manager', false)
$$;

create or replace function private.is_inventory_viewer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(private.current_app_role() = 'inventory_viewer', false)
$$;

create or replace function private.can_access_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from projects p
    where p.id = target_project_id
      and (
        private.is_admin()
        or (private.is_project_manager() and p.assigned_project_manager_id = private.current_app_user_id())
        or (private.is_inventory_viewer() and p.status = 'active')
      )
  )
$$;

create or replace function private.can_mutate_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from projects p
    where p.id = target_project_id
      and p.status not in ('completed', 'archived')
      and (
        private.is_admin()
        or (private.is_project_manager() and p.assigned_project_manager_id = private.current_app_user_id())
      )
  )
$$;
```

### Enable RLS

```sql
alter table profiles enable row level security;
alter table clients enable row level security;
alter table projects enable row level security;
alter table phases enable row level security;
alter table gates enable row level security;
alter table deficiencies enable row level security;
alter table subcontractors enable row level security;
alter table photo_evidence enable row level security;
alter table inventory_catalog_items enable row level security;
alter table material_logs enable row level security;
alter table equipment_logs enable row level security;
alter table inventory_pickups enable row level security;
alter table inventory_pickup_items enable row level security;
alter table notifications enable row level security;
alter table audit_events enable row level security;
```

### Profiles policies

```sql
create policy "profiles_select_self_or_admin"
on profiles for select
to authenticated
using (id = (select auth.uid()) or private.is_admin());

create policy "profiles_update_self_limited"
on profiles for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()) and role = (select role from profiles where id = (select auth.uid())));

create policy "profiles_admin_all"
on profiles for all
to authenticated
using (private.is_admin())
with check (private.is_admin());
```

**Implementation note:** role changes, deactivation, and last-active-admin checks should be handled by an admin-only RPC or server action so normal users cannot modify role/security fields through broad table updates.

### Client policies

```sql
create policy "clients_select_visible"
on clients for select
to authenticated
using (
  archived = false
  and (
    private.is_admin()
    or exists (
      select 1 from projects p
      where p.client_id = clients.id
        and p.assigned_project_manager_id = private.current_app_user_id()
    )
  )
);

create policy "clients_admin_insert"
on clients for insert
to authenticated
with check (private.is_admin());

create policy "clients_admin_update"
on clients for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "clients_pm_archive_after_projects_archived"
on clients for update
to authenticated
using (
  private.is_project_manager()
  and exists (
    select 1 from projects p
    where p.client_id = clients.id
      and p.assigned_project_manager_id = private.current_app_user_id()
  )
  and not exists (
    select 1 from projects p
    where p.client_id = clients.id
      and p.status <> 'archived'
  )
)
with check (archived = true);
```

### Project policies

```sql
create policy "projects_select_by_role"
on projects for select
to authenticated
using (
  private.is_admin()
  or (private.is_project_manager() and assigned_project_manager_id = private.current_app_user_id())
  or (private.is_inventory_viewer() and status = 'active')
);

create policy "projects_insert_admin_or_pm"
on projects for insert
to authenticated
with check (
  private.is_admin()
  or (private.is_project_manager() and assigned_project_manager_id = private.current_app_user_id())
);

create policy "projects_update_admin_or_assigned_pm"
on projects for update
to authenticated
using (
  private.is_admin()
  or (private.is_project_manager() and assigned_project_manager_id = private.current_app_user_id())
)
with check (
  private.is_admin()
  or (private.is_project_manager() and assigned_project_manager_id = private.current_app_user_id())
);
```

**Recommended server-side restrictions:** block edits to completed/archived projects except archive-like delete transitions; require completed status before `archive_project`; block inventory viewers from all project writes by omitting insert/update policies for them.

### Project child table policies

Use `private.can_access_project(project_id)` for SELECT and `private.can_mutate_project(project_id)` for PM/admin writes.

```sql
create policy "phases_select_project_visible"
on phases for select
to authenticated
using (private.can_access_project(project_id));

create policy "phases_write_project_mutable"
on phases for all
to authenticated
using (private.can_mutate_project(project_id))
with check (private.can_mutate_project(project_id));

create policy "gates_select_project_visible"
on gates for select
to authenticated
using (private.can_access_project(project_id));

create policy "gates_write_project_mutable"
on gates for all
to authenticated
using (private.can_mutate_project(project_id))
with check (private.can_mutate_project(project_id));

create policy "deficiencies_select_project_visible"
on deficiencies for select
to authenticated
using (private.can_access_project(project_id));

create policy "deficiencies_write_project_mutable"
on deficiencies for all
to authenticated
using (private.can_mutate_project(project_id))
with check (private.can_mutate_project(project_id));

create policy "photo_evidence_select_project_visible"
on photo_evidence for select
to authenticated
using (private.can_access_project(project_id));

create policy "photo_evidence_write_project_mutable"
on photo_evidence for all
to authenticated
using (private.can_mutate_project(project_id))
with check (private.can_mutate_project(project_id));
```

### Subcontractor policies

```sql
create policy "subcontractors_select_admin_pm"
on subcontractors for select
to authenticated
using (private.is_admin() or private.is_project_manager());

create policy "subcontractors_admin_all"
on subcontractors for all
to authenticated
using (private.is_admin())
with check (private.is_admin());
```

### Inventory policies

Inventory viewers can read active project inventory and create audit/pickup requests through server-side functions. PMs can read/write inventory only for assigned projects. Admins can read/write all.

```sql
create policy "inventory_catalog_select_authenticated"
on inventory_catalog_items for select
to authenticated
using (true);

create policy "inventory_catalog_admin_all"
on inventory_catalog_items for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "material_logs_select_project_visible"
on material_logs for select
to authenticated
using (private.can_access_project(project_id));

create policy "material_logs_write_admin_or_assigned_pm"
on material_logs for all
to authenticated
using (
  private.is_admin()
  or exists (
    select 1 from projects p
    where p.id = material_logs.project_id
      and p.assigned_project_manager_id = private.current_app_user_id()
      and p.status not in ('completed', 'archived')
  )
)
with check (
  private.is_admin()
  or exists (
    select 1 from projects p
    where p.id = material_logs.project_id
      and p.assigned_project_manager_id = private.current_app_user_id()
      and p.status not in ('completed', 'archived')
  )
);

create policy "equipment_logs_select_project_visible"
on equipment_logs for select
to authenticated
using (private.can_access_project(project_id));

create policy "equipment_logs_write_admin_or_assigned_pm"
on equipment_logs for all
to authenticated
using (
  private.is_admin()
  or exists (
    select 1 from projects p
    where p.id = equipment_logs.project_id
      and p.assigned_project_manager_id = private.current_app_user_id()
      and p.status not in ('completed', 'archived')
  )
)
with check (
  private.is_admin()
  or exists (
    select 1 from projects p
    where p.id = equipment_logs.project_id
      and p.assigned_project_manager_id = private.current_app_user_id()
      and p.status not in ('completed', 'archived')
  )
);

create policy "inventory_pickups_select_project_visible"
on inventory_pickups for select
to authenticated
using (private.can_access_project(project_id));

create policy "inventory_pickups_insert_inventory_or_admin_active_project"
on inventory_pickups for insert
to authenticated
with check (
  (private.is_inventory_viewer() or private.is_admin())
  and exists (select 1 from projects p where p.id = project_id and p.status = 'active')
  and picked_up_by_user_id = private.current_app_user_id()
);

create policy "inventory_pickup_items_select_parent_visible"
on inventory_pickup_items for select
to authenticated
using (
  exists (
    select 1 from inventory_pickups ip
    where ip.id = inventory_pickup_items.pickup_id
      and private.can_access_project(ip.project_id)
  )
);

create policy "inventory_pickup_items_insert_parent_allowed"
on inventory_pickup_items for insert
to authenticated
with check (
  exists (
    select 1 from inventory_pickups ip
    where ip.id = inventory_pickup_items.pickup_id
      and ip.picked_up_by_user_id = private.current_app_user_id()
      and (private.is_inventory_viewer() or private.is_admin())
  )
);
```

**Recommended server-side function:** `create_inventory_pickup(project_id, items, note)` should validate available quantities, decrement logs transactionally, insert pickup rows, create PM notification, and write an audit event. Do not rely on direct table inserts for this workflow.

### Notification policies

```sql
create policy "notifications_select_own_or_inventory_auditors"
on notifications for select
to authenticated
using (
  recipient_user_id = private.current_app_user_id()
  or (
    type = 'inventory_audit_request'
    and read_at is null
    and (private.is_inventory_viewer() or private.is_admin())
  )
);

create policy "notifications_update_own_read_status"
on notifications for update
to authenticated
using (recipient_user_id = private.current_app_user_id())
with check (recipient_user_id = private.current_app_user_id());

create policy "notifications_insert_inventory_or_system"
on notifications for insert
to authenticated
with check (
  private.is_admin()
  or (
    private.is_inventory_viewer()
    and type in ('inventory_audit_request', 'inventory_pickup')
  )
);
```

**Implementation note:** PM notification creation should usually happen inside trusted RPCs/server actions so messages and metadata cannot be spoofed.

### Audit policies

```sql
create policy "audit_events_select_admin_or_project_visible"
on audit_events for select
to authenticated
using (
  private.is_admin()
  or (
    entity_type = 'project'
    and private.can_access_project(entity_id)
  )
  or (
    entity_type = 'phase'
    and exists (select 1 from phases ph where ph.id = entity_id and private.can_access_project(ph.project_id))
  )
  or (
    entity_type = 'gate'
    and exists (select 1 from gates g where g.id = entity_id and private.can_access_project(g.project_id))
  )
  or (
    entity_type = 'deficiency'
    and exists (select 1 from deficiencies d where d.id = entity_id and private.can_access_project(d.project_id))
  )
  or (
    entity_type = 'photo_evidence'
    and exists (select 1 from photo_evidence pe where pe.id = entity_id and private.can_access_project(pe.project_id))
  )
  or (
    entity_type = 'inventory_pickup'
    and exists (select 1 from inventory_pickups ip where ip.id = entity_id and private.can_access_project(ip.project_id))
  )
);

create policy "audit_events_insert_authenticated_actor"
on audit_events for insert
to authenticated
with check (actor_user_id = private.current_app_user_id());
```

**Implementation note:** Do not allow update/delete on `audit_events` through client-facing roles. Grant insert only to controlled server/RPC paths if possible.

## 5. Functions & Triggers

### `updated_at` trigger

```sql
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
```

Apply to every mutable table with `updated_at`: `profiles`, `clients`, `projects`, `phases`, `gates`, `deficiencies`, `subcontractors`, `photo_evidence`, `material_logs`, and `equipment_logs`.

### Recommended database functions

- **`create_project_with_defaults(...)`:** Inserts a draft project, creates the three default phases, creates site/inspection gates per phase, creates the project attic gate, optionally seeds sequential phase dates, and writes `create_project` audit event.
- **`complete_site_check(...)`:** Validates gate type/status, optionally requires photo evidence, marks site check passed/blocked, advances phase status, activates project when appropriate, and writes audit.
- **`complete_inspection(...)`:** Validates inspector/date, blocks passed inspections when unresolved deficiencies exist, creates deficiency and before photo on failure, closes phase on pass, and calls project-completion sync.
- **`update_attic_gate(...)`:** Tracks call-in/install/photo evidence, sets attic gate/project attic status, and calls project-completion sync.
- **`sync_project_completion(project_id, actor_user_id)`:** Marks project completed only when all phases are closed and the attic gate is passed; writes `complete_project` audit event.
- **`archive_project(project_id)`:** Allows admin or assigned PM to archive only completed projects; writes `archive_project` audit event.
- **`soft_delete_project(project_id)`:** Implements current archive-like delete from active/draft/completed to `archived`; writes `delete_project` audit event.
- **`soft_delete_client(client_id)`:** Admin archives client and associated projects; PM can archive client only after all related projects are already archived.
- **`create_inventory_audit_request(project_id, type)`:** Enforces inventory/admin role, active project, assigned PM, duplicate outstanding request prevention, notification creation, and audit event.
- **`create_inventory_pickup(project_id, items, note)`:** Validates active project, inventory/admin role, note length, available quantities, decrements material/equipment logs, inserts pickup/items, creates notification, and writes audit.
- **`generate_phase_end_due_notifications(for_date date default current_date)`:** Creates one due-today notification per assigned active non-closed phase, deduped by PM/phase/date.
- **`delete_photo_evidence(photo_id)`:** Deletes or marks removed only after confirming the photo is not sole evidence for a passed gate or completed attic check; writes audit.

### Triggers and guards to consider

- **Schedule containment guard:** Enforce `phase.scheduled_start`/`phase.scheduled_end` within project boundaries to close the current prototype validation gap around direct phase edits.
- **Project date cascade guard:** Block project date changes that would exclude existing phase dates.
- **Status transition guard:** Validate allowed transitions for projects, phases, gates, deficiencies, and photo evidence.
- **Audit helper trigger:** Prefer explicit audit writes inside RPCs for rich metadata; generic triggers are useful only for simple field-change logging.
- **Notification trigger:** A trigger can mark inventory audit notifications read after PM action, but explicit server actions are easier to test.

### Logic that should remain outside RLS

- **Signed media URLs:** Generate signed R2/Supabase Storage URLs in server actions or route handlers after checking `private.can_access_project(photo.project_id)`.
- **Complex multi-row mutations:** Inventory pickups, inspection completion, attic completion, and project creation should be one transaction, not independent client table writes.
- **Field-addressable validation errors:** Keep user-facing `ApiResult` error shaping in server actions/route handlers while database constraints remain the final safety net.
