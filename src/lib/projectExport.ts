import JSZip from "jszip";
import { getPhotoViewUrl } from "@/lib/api";
import { EQUIPMENT_ITEMS, PHASE_MATERIAL_CATALOGS } from "@/lib/inventoryCatalog";
import type { AuditEvent, ClientRecord, EquipmentLog, InventoryPickup, MaterialLog, Phase, PhotoEvidence, ProjectDetail, SubcontractorContact, User } from "@/lib/types";

// Maps photo purpose → folder name under photos/
function photoFolder(photo: PhotoEvidence, phases: Phase[]): string {
  if (photo.purpose === "attic_check") return "attic-check";
  if (photo.phaseId) {
    const phase = phases.find((p) => p.id === photo.phaseId);
    if (phase) return phase.type;
  }
  return "general";
}

function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "object" ? JSON.stringify(value) : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildRow(fields: unknown[]): string {
  return fields.map(escapeCsvField).join(",");
}

export interface ProjectExportData {
  equipmentLogs?: EquipmentLog[];
  inventoryPickups?: InventoryPickup[];
  materialLogs?: MaterialLog[];
}

function jsonField(value: unknown): string {
  return value !== undefined ? JSON.stringify(value) : "";
}

function equipmentLabel(itemKey: string): string {
  return EQUIPMENT_ITEMS.find((item) => item.itemKey === itemKey)?.label ?? itemKey;
}

function materialLabel(itemKey: string, phase?: Phase): string {
  if (!phase) return itemKey;
  return PHASE_MATERIAL_CATALOGS[phase.type].find((item) => item.itemKey === itemKey)?.label ?? itemKey;
}

function referencedSubcontractors(detail: ProjectDetail): SubcontractorContact[] {
  const referencedIds = new Set<string>();
  detail.phases.forEach((phase) => {
    if (phase.assignedSubcontractorId) referencedIds.add(phase.assignedSubcontractorId);
  });
  detail.gates.forEach((gate) => {
    if (gate.callInSubcontractorId) referencedIds.add(gate.callInSubcontractorId);
  });
  detail.deficiencies.forEach((deficiency) => {
    if (deficiency.assignedSubcontractorId) referencedIds.add(deficiency.assignedSubcontractorId);
  });
  return detail.subcontractors.filter((subcontractor) => referencedIds.has(subcontractor.id));
}

export function buildProjectCsv(
  detail: ProjectDetail,
  client: ClientRecord,
  pm: User | undefined,
  exportData: ProjectExportData = {},
): string {
  const { project, auditEvents, phases, gates, deficiencies, photoEvidence } = detail;
  const { equipmentLogs = [], inventoryPickups = [], materialLogs = [] } = exportData;
  const phasesById = new Map(phases.map((phase) => [phase.id, phase]));
  const lines: string[] = [];

  // Section 1 — Project details
  lines.push("SECTION,PROJECT DETAILS");
  lines.push(buildRow(["Project ID", "Project Number", "Name", "Client ID", "Client", "Project Manager ID", "Project Manager", "Status", "Site Address", "Attic Check Status", "Finish Level", "Scheduled Start", "Scheduled End", "Completed At", "Notes", "Notes Last Edited By", "Notes Last Edited At", "Created At", "Updated At"]));
  lines.push(buildRow([
    project.id,
    project.projectNumber,
    project.name,
    client.id,
    client.name,
    project.assignedProjectManagerId ?? "",
    pm?.fullName ?? "Unassigned",
    project.status,
    project.siteAddress,
    project.atticCheckStatus,
    project.finishLevel ?? "",
    project.scheduledStart ?? "",
    project.scheduledEnd ?? "",
    project.completedAt ?? "",
    project.notes ?? "",
    project.notesLastEditedBy ?? "",
    project.notesLastEditedAt ?? "",
    project.createdAt,
    project.updatedAt,
  ]));

  lines.push("");
  lines.push("SECTION,CLIENT DETAILS");
  lines.push(buildRow(["Client ID", "Name", "Primary Contact", "Phone", "Email", "Billing Address", "Notes", "Archived", "Created At", "Updated At"]));
  lines.push(buildRow([
    client.id,
    client.name,
    client.primaryContactName ?? "",
    client.phone ?? "",
    client.email ?? "",
    client.billingAddress ?? "",
    client.notes ?? "",
    client.archived,
    client.createdAt,
    client.updatedAt,
  ]));

  lines.push("");
  lines.push("SECTION,PHASES");
  lines.push(buildRow(["Phase ID", "Type", "Status", "Scheduled Start", "Scheduled End", "Closed At", "Assigned Subcontractor ID", "Created At", "Updated At"]));
  phases.forEach((phase) => {
    lines.push(buildRow([
      phase.id,
      phase.type,
      phase.status,
      phase.scheduledStart ?? "",
      phase.scheduledEnd ?? "",
      phase.closedAt ?? "",
      phase.assignedSubcontractorId ?? "",
      phase.createdAt,
      phase.updatedAt,
    ]));
  });

  lines.push("");
  lines.push("SECTION,GATES");
  lines.push(buildRow(["Gate ID", "Phase ID", "Type", "Status", "Completed By User ID", "Completed At", "Required Photo Evidence", "Notes", "Call-In Date", "Install Date", "Call-In Subcontractor ID", "Created At", "Updated At"]));
  gates.forEach((gate) => {
    lines.push(buildRow([
      gate.id,
      gate.phaseId ?? "",
      gate.type,
      gate.status,
      gate.completedByUserId ?? "",
      gate.completedAt ?? "",
      gate.requiredPhotoEvidence,
      gate.notes ?? "",
      gate.callInDate ?? "",
      gate.installDate ?? "",
      gate.callInSubcontractorId ?? "",
      gate.createdAt,
      gate.updatedAt,
    ]));
  });

  lines.push("");
  lines.push("SECTION,DEFICIENCIES");
  lines.push(buildRow(["Deficiency ID", "Phase ID", "Title", "Description", "Severity", "Status", "Assigned Subcontractor ID", "Resolved At", "Resolved By User ID", "Created At", "Updated At"]));
  deficiencies.forEach((deficiency) => {
    lines.push(buildRow([
      deficiency.id,
      deficiency.phaseId,
      deficiency.title,
      deficiency.description ?? "",
      deficiency.severity,
      deficiency.status,
      deficiency.assignedSubcontractorId ?? "",
      deficiency.resolvedAt ?? "",
      deficiency.resolvedByUserId ?? "",
      deficiency.createdAt,
      deficiency.updatedAt,
    ]));
  });

  lines.push("");
  lines.push("SECTION,PHOTO EVIDENCE");
  lines.push(buildRow(["Photo ID", "Phase ID", "Gate ID", "Deficiency ID", "Purpose", "Object Key", "Content Hash", "MIME Type", "File Size Bytes", "Status", "Uploaded By User ID", "Created At", "Updated At"]));
  photoEvidence.forEach((photo) => {
    lines.push(buildRow([
      photo.id,
      photo.phaseId ?? "",
      photo.gateId ?? "",
      photo.deficiencyId ?? "",
      photo.purpose,
      photo.objectKey,
      photo.contentHash ?? "",
      photo.mimeType,
      photo.fileSizeBytes ?? "",
      photo.status,
      photo.uploadedByUserId,
      photo.createdAt,
      photo.updatedAt,
    ]));
  });

  lines.push("");
  lines.push("SECTION,SUBCONTRACTORS");
  lines.push(buildRow(["Subcontractor ID", "Display Name", "Company Name", "Trade", "Phone", "Email", "Active", "Notes", "Created At", "Updated At"]));
  referencedSubcontractors(detail).forEach((subcontractor) => {
    lines.push(buildRow([
      subcontractor.id,
      subcontractor.displayName,
      subcontractor.companyName ?? "",
      subcontractor.trade,
      subcontractor.phone ?? "",
      subcontractor.email ?? "",
      subcontractor.active,
      subcontractor.notes ?? "",
      subcontractor.createdAt,
      subcontractor.updatedAt,
    ]));
  });

  lines.push("");
  lines.push("SECTION,PROJECT EQUIPMENT");
  lines.push(buildRow(["Equipment Log ID", "Item Key", "Item Label", "Quantity", "Updated At"]));
  equipmentLogs.forEach((log) => {
    lines.push(buildRow([
      log.id,
      log.itemKey,
      equipmentLabel(log.itemKey),
      log.quantity,
      log.updatedAt,
    ]));
  });

  lines.push("");
  lines.push("SECTION,PHASE MATERIALS");
  lines.push(buildRow(["Material Log ID", "Phase ID", "Phase Type", "Item Key", "Item Label", "Quantity", "Updated At"]));
  materialLogs.forEach((log) => {
    const phase = phasesById.get(log.phaseId);
    lines.push(buildRow([
      log.id,
      log.phaseId,
      phase?.type ?? "",
      log.itemKey,
      materialLabel(log.itemKey, phase),
      log.quantity,
      log.updatedAt,
    ]));
  });

  lines.push("");
  lines.push("SECTION,INVENTORY PICKUPS");
  lines.push(buildRow(["Pickup ID", "Picked Up By User ID", "Created At", "Kind", "Item Key", "Item Label", "Quantity", "Note"]));
  inventoryPickups.forEach((pickup) => {
    pickup.items.forEach((item) => {
      const phase = item.kind === "material" ? phases.find((candidate) => PHASE_MATERIAL_CATALOGS[candidate.type].some((catalogItem) => catalogItem.itemKey === item.itemKey)) : undefined;
      lines.push(buildRow([
        pickup.id,
        pickup.pickedUpByUserId,
        pickup.createdAt,
        item.kind,
        item.itemKey,
        item.kind === "equipment" ? equipmentLabel(item.itemKey) : materialLabel(item.itemKey, phase),
        item.quantity,
        pickup.note ?? "",
      ]));
    });
  });

  lines.push("");

  // Section 2 — Activity log
  lines.push("SECTION,ACTIVITY LOG");
  lines.push(buildRow(["Event ID", "Timestamp", "Actor ID", "Entity Type", "Entity ID", "Action", "Previous Value", "Next Value", "Metadata"]));
  const sorted = [...auditEvents].sort(
    (a: AuditEvent, b: AuditEvent) => (a.createdAt < b.createdAt ? 1 : -1),
  );
  for (const event of sorted) {
    lines.push(buildRow([
      event.id,
      event.createdAt,
      event.actorUserId,
      event.entityType,
      event.entityId,
      event.action,
      jsonField(event.previousValue),
      jsonField(event.nextValue),
      jsonField(event.metadata),
    ]));
  }

  return lines.join("\n");
}

export async function exportProjectZip(
  detail: ProjectDetail,
  client: ClientRecord,
  pm: User | undefined,
  exportData: ProjectExportData = {},
): Promise<void> {
  const { project, phases, photoEvidence } = detail;

  const zip = new JSZip();

  // Add CSV
  const csv = buildProjectCsv(detail, client, pm, exportData);
  zip.file("project-details.csv", csv);

  // Add photos into phase-specific folders
  const photosFolder = zip.folder("photos")!;
  const subfolders: Record<string, JSZip> = {
    insulation: photosFolder.folder("insulation")!,
    drywall: photosFolder.folder("drywall")!,
    finishing: photosFolder.folder("finishing")!,
    "attic-check": photosFolder.folder("attic-check")!,
    general: photosFolder.folder("general")!,
  };

  await Promise.all(
    photoEvidence.map(async (photo) => {
      const urlRes = await getPhotoViewUrl(photo.id);
      if (!urlRes.ok || !urlRes.data.url) return;

      try {
        const response = await fetch(urlRes.data.url);
        if (!response.ok) return;
        const blob = await response.blob();

        const folder = photoFolder(photo, phases);
        const ext = photo.mimeType?.split("/")[1] ?? "jpg";
        const filename = `${photo.id}-${photo.purpose}.${ext}`;

        const target = subfolders[folder] ?? subfolders["general"];
        target.file(filename, blob);
      } catch {
        // Skip photos that fail to fetch (network errors, revoked blobs, etc.)
      }
    }),
  );

  // Generate and trigger download
  const zipBlob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(zipBlob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `project-${project.projectNumber}-export.zip`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
