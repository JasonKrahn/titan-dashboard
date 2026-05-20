import JSZip from "jszip";
import { getPhotoViewUrl } from "@/lib/api";
import { EQUIPMENT_ITEMS, PHASE_MATERIAL_CATALOGS } from "@/lib/inventoryCatalog";
import type { AuditEvent, ClientRecord, EquipmentLog, InventoryPickup, MaterialLog, Phase, PhaseChecklistItem, PhotoEvidence, ProjectDetail, SubcontractorContact, User } from "@/lib/types";

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
  checklistItems?: PhaseChecklistItem[];
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
  const { equipmentLogs = [], inventoryPickups = [], materialLogs = [], checklistItems = [] } = exportData;
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
  lines.push("SECTION,PHASE TASK CHECKLIST");
  lines.push(buildRow(["Checklist Item ID", "Phase ID", "Phase Type", "Text", "Completed", "Created At", "Updated At"]));
  checklistItems.forEach((item) => {
    const phase = phasesById.get(item.phaseId);
    lines.push(buildRow([
      item.id,
      item.phaseId,
      phase?.type ?? "",
      item.text,
      item.completed,
      item.createdAt,
      item.updatedAt,
    ]));
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

function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "object" ? JSON.stringify(value) : String(value);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function boolCell(value: unknown): string {
  if (value === true || value === "true") return "✓";
  if (value === false || value === "false") return "✗";
  return escapeHtml(value);
}

function htmlRow(cells: unknown[], transform?: (v: unknown) => string): string {
  const fn = transform ?? escapeHtml;
  return `<tr>${cells.map((c) => `<td>${fn(c)}</td>`).join("")}</tr>`;
}

function htmlHeaderRow(headers: string[]): string {
  return `<tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr>`;
}

function htmlSection(id: string, title: string, headers: string[], rows: string[]): string {
  return `<section id="${id}">
  <h2>${escapeHtml(title)}</h2>
  <div class="table-wrap"><table>
    <thead>${htmlHeaderRow(headers)}</thead>
    <tbody>${rows.join("")}</tbody>
  </table></div>
</section>`;
}

export function buildProjectHtml(
  detail: ProjectDetail,
  client: ClientRecord,
  pm: User | undefined,
  exportData: ProjectExportData = {},
): string {
  const { project, auditEvents, phases, gates, deficiencies, photoEvidence } = detail;
  const { equipmentLogs = [], inventoryPickups = [], materialLogs = [], checklistItems = [] } = exportData;
  const phasesById = new Map(phases.map((p) => [p.id, p]));

  const exportDate = new Date().toISOString().slice(0, 10);

  // ── Embedded styles ──────────────────────────────────────────────────────────
  const style = `
    :root {
      --bg: hsl(222 22% 7%);
      --fg: hsl(210 20% 96%);
      --card: hsl(222 18% 11%);
      --surface-elevated: hsl(222 18% 13%);
      --border: hsl(222 14% 18%);
      --border-strong: hsl(222 16% 22%);
      --primary: hsl(220 95% 53%);
      --muted-fg: hsl(215 16% 62%);
      --header-bg: hsl(222 18% 9%);
    }
    @media print {
      :root {
        --bg: #ffffff;
        --fg: hsl(222 22% 12%);
        --card: #ffffff;
        --surface-elevated: hsl(220 20% 99%);
        --border: hsl(220 13% 87%);
        --border-strong: hsl(220 13% 82%);
        --primary: hsl(220 95% 43%);
        --muted-fg: hsl(215 16% 45%);
        --header-bg: hsl(220 13% 96%);
      }
      .no-print { display: none; }
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      background: var(--bg);
      color: var(--fg);
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      padding: 0 0 3rem;
    }
    header.report-header {
      background: var(--header-bg);
      border-bottom: 1px solid var(--border-strong);
      padding: 1.5rem 2rem;
    }
    header.report-header h1 {
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    header.report-header .meta {
      font-size: 0.75rem;
      color: var(--muted-fg);
      margin-top: 0.25rem;
    }
    main { max-width: 1200px; margin: 0 auto; padding: 1.5rem 2rem; }
    section { margin-bottom: 2.5rem; }
    h2 {
      font-size: 0.625rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted-fg);
      margin-bottom: 0.625rem;
    }
    .table-wrap { overflow-x: auto; border-radius: 0.5rem; border: 1px solid var(--border); }
    table { width: max-content; min-width: 100%; border-collapse: collapse; }
    th {
      background: var(--surface-elevated);
      color: var(--muted-fg);
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-align: left;
      padding: 0.5rem 0.75rem;
      white-space: nowrap;
      border-bottom: 1px solid var(--border);
    }
    td {
      background: var(--card);
      padding: 0.5rem 0.75rem;
      font-size: 0.8125rem;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
      word-break: normal;
      overflow-wrap: break-word;
    }
    tr:last-child td { border-bottom: none; }
    code { font-size: 0.75rem; font-family: ui-monospace, monospace; color: var(--muted-fg); }
    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 1rem;
    }
    .photo-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      overflow: hidden;
    }
    .photo-card a { display: block; }
    .photo-card img {
      width: 100%;
      aspect-ratio: 4/3;
      object-fit: cover;
      display: block;
    }
    .photo-card .photo-meta {
      padding: 0.5rem 0.625rem;
      font-size: 0.6875rem;
      color: var(--muted-fg);
      line-height: 1.4;
    }
    .photo-card .photo-meta strong { color: var(--fg); font-size: 0.75rem; }
    a { color: var(--primary); text-decoration: none; }
    a:hover { text-decoration: underline; }
  `;

  // ── Helper to compute photo relative path (mirrors exportProjectZip logic) ──
  function photoRelPath(photo: PhotoEvidence): string {
    const folder = photoFolder(photo, phases);
    const ext = photo.mimeType?.split("/")[1] ?? "jpg";
    return `photos/${folder}/${photo.id}-${photo.purpose}.${ext}`;
  }

  // ── Sections ─────────────────────────────────────────────────────────────────

  const projectSection = htmlSection("project-details", "Project Details",
    ["Project ID", "Project Number", "Name", "Client ID", "Client", "Project Manager ID", "Project Manager",
      "Status", "Site Address", "Attic Check Status", "Finish Level", "Scheduled Start", "Scheduled End",
      "Completed At", "Notes", "Notes Last Edited By", "Notes Last Edited At", "Created At", "Updated At"],
    [htmlRow([
      project.id, project.projectNumber, project.name, client.id, client.name,
      project.assignedProjectManagerId ?? "", pm?.fullName ?? "Unassigned",
      project.status, project.siteAddress, project.atticCheckStatus,
      project.finishLevel ?? "", project.scheduledStart ?? "", project.scheduledEnd ?? "",
      project.completedAt ?? "", project.notes ?? "",
      project.notesLastEditedBy ?? "", project.notesLastEditedAt ?? "",
      project.createdAt, project.updatedAt,
    ])],
  );

  const clientSection = htmlSection("client-details", "Client Details",
    ["Client ID", "Name", "Primary Contact", "Phone", "Email", "Billing Address", "Notes", "Archived", "Created At", "Updated At"],
    [htmlRow([client.id, client.name, client.primaryContactName ?? "", client.phone ?? "", client.email ?? "",
      client.billingAddress ?? "", client.notes ?? "", boolCell(client.archived), client.createdAt, client.updatedAt],
      (v) => v === "✓" || v === "✗" ? v : escapeHtml(v))],
  );

  const phasesSection = htmlSection("phases", "Phases",
    ["Phase ID", "Type", "Status", "Scheduled Start", "Scheduled End", "Closed At", "Assigned Subcontractor ID", "Created At", "Updated At"],
    phases.map((phase) => htmlRow([
      phase.id, phase.type, phase.status, phase.scheduledStart ?? "", phase.scheduledEnd ?? "",
      phase.closedAt ?? "", phase.assignedSubcontractorId ?? "", phase.createdAt, phase.updatedAt,
    ])),
  );

  const gatesSection = htmlSection("gates", "Gates",
    ["Gate ID", "Phase ID", "Type", "Status", "Completed By User ID", "Completed At",
      "Required Photo Evidence", "Notes", "Call-In Date", "Install Date", "Call-In Subcontractor ID", "Created At", "Updated At"],
    gates.map((gate) => {
      const cells = [
        gate.id, gate.phaseId ?? "", gate.type, gate.status, gate.completedByUserId ?? "",
        gate.completedAt ?? "", boolCell(gate.requiredPhotoEvidence), gate.notes ?? "",
        gate.callInDate ?? "", gate.installDate ?? "", gate.callInSubcontractorId ?? "",
        gate.createdAt, gate.updatedAt,
      ];
      return `<tr>${cells.map((c) => `<td>${c === "✓" || c === "✗" ? c : escapeHtml(c)}</td>`).join("")}</tr>`;
    }),
  );

  const deficienciesSection = htmlSection("deficiencies", "Deficiencies",
    ["Deficiency ID", "Phase ID", "Title", "Description", "Severity", "Status",
      "Assigned Subcontractor ID", "Resolved At", "Resolved By User ID", "Created At", "Updated At"],
    deficiencies.map((d) => htmlRow([
      d.id, d.phaseId, d.title, d.description ?? "", d.severity, d.status,
      d.assignedSubcontractorId ?? "", d.resolvedAt ?? "", d.resolvedByUserId ?? "",
      d.createdAt, d.updatedAt,
    ])),
  );

  const photoEvidenceSection = htmlSection("photo-evidence", "Photo Evidence",
    ["Photo ID", "Phase ID", "Gate ID", "Deficiency ID", "Purpose", "Object Key",
      "Content Hash", "MIME Type", "File Size Bytes", "Status", "Uploaded By User ID", "Created At", "Updated At"],
    photoEvidence.map((photo) => {
      const relPath = photoRelPath(photo);
      const idCell = `<a href="${escapeHtml(relPath)}" target="_blank">${escapeHtml(photo.id)}</a>`;
      return `<tr>
        <td>${idCell}</td>
        <td>${escapeHtml(photo.phaseId ?? "")}</td>
        <td>${escapeHtml(photo.gateId ?? "")}</td>
        <td>${escapeHtml(photo.deficiencyId ?? "")}</td>
        <td>${escapeHtml(photo.purpose)}</td>
        <td>${escapeHtml(photo.objectKey)}</td>
        <td>${escapeHtml(photo.contentHash ?? "")}</td>
        <td>${escapeHtml(photo.mimeType)}</td>
        <td>${escapeHtml(photo.fileSizeBytes ?? "")}</td>
        <td>${escapeHtml(photo.status)}</td>
        <td>${escapeHtml(photo.uploadedByUserId)}</td>
        <td>${escapeHtml(photo.createdAt)}</td>
        <td>${escapeHtml(photo.updatedAt)}</td>
      </tr>`;
    }),
  );

  const galleryCards = photoEvidence.map((photo) => {
    const relPath = photoRelPath(photo);
    const phase = phasesById.get(photo.phaseId ?? "");
    const phaseLabel = phase ? phase.type : "general";
    return `<div class="photo-card">
  <a href="${escapeHtml(relPath)}" target="_blank">
    <img src="${escapeHtml(relPath)}" alt="${escapeHtml(photo.purpose)}" loading="lazy">
  </a>
  <div class="photo-meta">
    <strong>${escapeHtml(photo.purpose)}</strong><br>
    ${escapeHtml(phaseLabel)} · ${escapeHtml(photo.createdAt.slice(0, 10))}
  </div>
</div>`;
  });
  const gallerySection = `<section id="photo-gallery">
  <h2>Photo Gallery</h2>
  ${galleryCards.length > 0 ? `<div class="gallery-grid">${galleryCards.join("\n")}</div>` : `<p style="color:var(--muted-fg);font-size:0.8125rem">No photos.</p>`}
</section>`;

  const subcontractorsSection = htmlSection("subcontractors", "Subcontractors",
    ["Subcontractor ID", "Display Name", "Company Name", "Trade", "Phone", "Email", "Active", "Notes", "Created At", "Updated At"],
    referencedSubcontractors(detail).map((s) => {
      const cells = [s.id, s.displayName, s.companyName ?? "", s.trade, s.phone ?? "", s.email ?? "",
        boolCell(s.active), s.notes ?? "", s.createdAt, s.updatedAt];
      return `<tr>${cells.map((c) => `<td>${c === "✓" || c === "✗" ? c : escapeHtml(c)}</td>`).join("")}</tr>`;
    }),
  );

  const equipmentSection = htmlSection("project-equipment", "Project Equipment",
    ["Equipment Log ID", "Item Key", "Item Label", "Quantity", "Updated At"],
    equipmentLogs.map((log) => htmlRow([log.id, log.itemKey, equipmentLabel(log.itemKey), log.quantity, log.updatedAt])),
  );

  const materialsSection = htmlSection("phase-materials", "Phase Materials",
    ["Material Log ID", "Phase ID", "Phase Type", "Item Key", "Item Label", "Quantity", "Updated At"],
    materialLogs.map((log) => {
      const phase = phasesById.get(log.phaseId);
      return htmlRow([log.id, log.phaseId, phase?.type ?? "", log.itemKey, materialLabel(log.itemKey, phase), log.quantity, log.updatedAt]);
    }),
  );

  const pickupsSection = htmlSection("inventory-pickups", "Inventory Pickups",
    ["Pickup ID", "Picked Up By User ID", "Created At", "Kind", "Item Key", "Item Label", "Quantity", "Note"],
    inventoryPickups.flatMap((pickup) =>
      pickup.items.map((item) => {
        const phase = item.kind === "material"
          ? phases.find((candidate) => PHASE_MATERIAL_CATALOGS[candidate.type].some((ci) => ci.itemKey === item.itemKey))
          : undefined;
        return htmlRow([
          pickup.id, pickup.pickedUpByUserId, pickup.createdAt, item.kind, item.itemKey,
          item.kind === "equipment" ? equipmentLabel(item.itemKey) : materialLabel(item.itemKey, phase),
          item.quantity, pickup.note ?? "",
        ]);
      }),
    ),
  );

  const checklistSection = htmlSection("phase-task-checklist", "Phase Task Checklist",
    ["Checklist Item ID", "Phase ID", "Phase Type", "Text", "Completed", "Created At", "Updated At"],
    checklistItems.map((item) => {
      const phase = phasesById.get(item.phaseId);
      const cells = [item.id, item.phaseId, phase?.type ?? "", item.text, boolCell(item.completed), item.createdAt, item.updatedAt];
      return `<tr>${cells.map((c) => `<td>${c === "✓" || c === "✗" ? c : escapeHtml(c)}</td>`).join("")}</tr>`;
    }),
  );

  const sorted = [...auditEvents].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const activitySection = htmlSection("activity-log", "Activity Log",
    ["Event ID", "Timestamp", "Actor ID", "Entity Type", "Entity ID", "Action", "Previous Value", "Next Value", "Metadata"],
    sorted.map((event) => {
      const metaStr = event.metadata !== undefined ? JSON.stringify(event.metadata) : "";
      return `<tr>
        <td>${escapeHtml(event.id)}</td>
        <td>${escapeHtml(event.createdAt)}</td>
        <td>${escapeHtml(event.actorUserId)}</td>
        <td>${escapeHtml(event.entityType)}</td>
        <td>${escapeHtml(event.entityId)}</td>
        <td>${escapeHtml(event.action)}</td>
        <td><code>${escapeHtml(jsonField(event.previousValue))}</code></td>
        <td><code>${escapeHtml(jsonField(event.nextValue))}</code></td>
        <td><code>${escapeHtml(metaStr)}</code></td>
      </tr>`;
    }),
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Project ${escapeHtml(project.projectNumber)} — ${escapeHtml(project.name)} Export</title>
  <style>${style}</style>
</head>
<body>
  <header class="report-header">
    <h1>${escapeHtml(project.name)}</h1>
    <div class="meta">${escapeHtml(project.projectNumber)} · ${escapeHtml(project.siteAddress)} · Exported ${escapeHtml(exportDate)}</div>
  </header>
  <main>
    ${projectSection}
    ${clientSection}
    ${phasesSection}
    ${gatesSection}
    ${deficienciesSection}
    ${photoEvidenceSection}
    ${gallerySection}
    ${subcontractorsSection}
    ${equipmentSection}
    ${materialsSection}
    ${pickupsSection}
    ${checklistSection}
    ${activitySection}
  </main>
</body>
</html>`;
}

export async function exportProjectZip(
  detail: ProjectDetail,
  client: ClientRecord,
  pm: User | undefined,
  exportData: ProjectExportData = {},
): Promise<void> {
  const { project, phases, photoEvidence } = detail;

  const zip = new JSZip();

  // Add CSV and HTML
  const csv = buildProjectCsv(detail, client, pm, exportData);
  zip.file("project-details.csv", csv);
  const html = buildProjectHtml(detail, client, pm, exportData);
  zip.file("project-details.html", html);

  // Add photos into phase-specific folders
  const photosFolder = zip.folder("photos")!;
  const subfolders: Record<string, JSZip> = {
    insulation: photosFolder.folder("insulation")!,
    drywall: photosFolder.folder("drywall")!,
    finishing: photosFolder.folder("finishing")!,
    "attic-check": photosFolder.folder("attic-check")!,
    general: photosFolder.folder("general")!,
  };

  const warnings: string[] = [];

  await Promise.all(
    photoEvidence.map(async (photo) => {
      const urlRes = await getPhotoViewUrl(photo.id);
      if (!urlRes.ok || !urlRes.data.url) {
        warnings.push(`photo ${photo.id} (${photo.purpose}): URL not available`);
        return;
      }

      try {
        const response = await fetch(urlRes.data.url);
        if (!response.ok) {
          warnings.push(`photo ${photo.id} (${photo.purpose}): HTTP ${response.status}`);
          return;
        }
        const blob = await response.blob();

        const folder = photoFolder(photo, phases);
        const ext = photo.mimeType?.split("/")[1] ?? "jpg";
        const filename = `${photo.id}-${photo.purpose}.${ext}`;

        const target = subfolders[folder] ?? subfolders["general"];
        target.file(filename, blob);
      } catch {
        warnings.push(`photo ${photo.id} (${photo.purpose}): fetch error`);
      }
    }),
  );

  if (warnings.length > 0) {
    zip.file("export-warnings.txt", warnings.join("\n"));
  }

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
