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

function photoRelPath(photo: PhotoEvidence, phases: Phase[]): string {
  const folder = photoFolder(photo, phases);
  const ext = photo.mimeType?.split("/")[1] ?? "jpg";
  return `photos/${folder}/${photo.id}-${photo.purpose}.${ext}`;
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
    labelFromKey(project.status),
    project.siteAddress,
    labelFromKey(project.atticCheckStatus),
    project.finishLevel ?? "",
    formatDate(project.scheduledStart),
    formatDate(project.scheduledEnd),
    formatDate(project.completedAt),
    project.notes ?? "",
    project.notesLastEditedBy ?? "",
    formatDate(project.notesLastEditedAt),
    formatDate(project.createdAt),
    formatDate(project.updatedAt),
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
    boolCell(client.archived),
    formatDate(client.createdAt),
    formatDate(client.updatedAt),
  ]));

  lines.push("");
  lines.push("SECTION,PHASES");
  lines.push(buildRow(["Phase ID", "Type", "Status", "Scheduled Start", "Scheduled End", "Closed At", "Assigned Subcontractor ID", "Created At", "Updated At"]));
  phases.forEach((phase) => {
    lines.push(buildRow([
      phase.id,
      labelFromKey(phase.type),
      labelFromKey(phase.status),
      formatDate(phase.scheduledStart),
      formatDate(phase.scheduledEnd),
      formatDate(phase.closedAt),
      phase.assignedSubcontractorId ?? "",
      formatDate(phase.createdAt),
      formatDate(phase.updatedAt),
    ]));
  });

  lines.push("");
  lines.push("SECTION,GATES");
  lines.push(buildRow(["Gate ID", "Phase ID", "Type", "Status", "Completed By User ID", "Completed At", "Required Photo Evidence", "Notes", "Call-In Date", "Install Date", "Call-In Subcontractor ID", "Created At", "Updated At"]));
  gates.forEach((gate) => {
    lines.push(buildRow([
      gate.id,
      gate.phaseId ?? "",
      labelFromKey(gate.type),
      labelFromKey(gate.status),
      gate.completedByUserId ?? "",
      formatDate(gate.completedAt),
      boolCell(gate.requiredPhotoEvidence),
      gate.notes ?? "",
      formatDate(gate.callInDate),
      formatDate(gate.installDate),
      gate.callInSubcontractorId ?? "",
      formatDate(gate.createdAt),
      formatDate(gate.updatedAt),
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
      labelFromKey(deficiency.severity),
      labelFromKey(deficiency.status),
      deficiency.assignedSubcontractorId ?? "",
      formatDate(deficiency.resolvedAt),
      deficiency.resolvedByUserId ?? "",
      formatDate(deficiency.createdAt),
      formatDate(deficiency.updatedAt),
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
      photoPurposeLabel(photo),
      photo.objectKey,
      photo.contentHash ?? "",
      photo.mimeType,
      fileSizeLabel(photo.fileSizeBytes),
      labelFromKey(photo.status),
      photo.uploadedByUserId,
      formatDate(photo.createdAt),
      formatDate(photo.updatedAt),
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
      boolCell(subcontractor.active),
      subcontractor.notes ?? "",
      formatDate(subcontractor.createdAt),
      formatDate(subcontractor.updatedAt),
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
      formatDate(log.updatedAt),
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
      phase ? labelFromKey(phase.type) : "",
      log.itemKey,
      materialLabel(log.itemKey, phase),
      log.quantity,
      formatDate(log.updatedAt),
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
        formatDate(pickup.createdAt),
        labelFromKey(item.kind),
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
      phase ? labelFromKey(phase.type) : "",
      item.text,
      boolCell(item.completed),
      formatDate(item.createdAt),
      formatDate(item.updatedAt),
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
      formatDate(event.createdAt),
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

interface ProjectHtmlOptions {
  photoWarnings?: string[];
}

function formatDate(value: string | undefined): string {
  if (!value) return "Not recorded";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00.000Z`) : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function labelFromKey(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not recorded";
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function countLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function fileSizeLabel(value: number | undefined): string {
  if (!value) return "Unknown size";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function photoPurposeLabel(photo: PhotoEvidence): string {
  if (photo.purpose === "deficiency_before") return "Before correction";
  if (photo.purpose === "deficiency_after") return "After correction";
  return labelFromKey(photo.purpose);
}

function photoWarningFor(photo: PhotoEvidence, warnings: string[]): string | undefined {
  return warnings.find((warning) => warning.includes(`photo ${photo.id} `));
}

function renderPhotoCard(photo: PhotoEvidence, phasesById: Map<string, Phase>, warnings: string[], caption?: string): string {
  const relPath = photoRelPath(photo, [...phasesById.values()]);
  const phase = phasesById.get(photo.phaseId ?? "");
  const warning = photoWarningFor(photo, warnings);
  const title = caption ?? photoPurposeLabel(photo);
  const context = [
    phase ? labelFromKey(phase.type) : undefined,
    formatDate(photo.createdAt),
    fileSizeLabel(photo.fileSizeBytes),
  ].filter(Boolean).join(" - ");

  return `<article class="photo-card${warning ? " photo-card-warning" : ""}">
  <a href="${escapeHtml(relPath)}" target="_blank" rel="noreferrer">
    ${warning ? `<div class="photo-missing">Photo missing from export</div>` : `<img src="${escapeHtml(relPath)}" alt="${escapeHtml(title)}" loading="lazy">`}
  </a>
  <div class="photo-meta">
    <strong>${escapeHtml(title)}</strong>
    <span>${escapeHtml(context)}</span>
    ${warning ? `<em>${escapeHtml(warning)}</em>` : ""}
  </div>
</article>`;
}

function renderSummaryItem(label: string, value: string, detail?: string): string {
  return `<div class="summary-item">
  <span>${escapeHtml(label)}</span>
  <strong>${escapeHtml(value)}</strong>
  ${detail ? `<small>${escapeHtml(detail)}</small>` : ""}
</div>`;
}

function renderSimpleTable(headers: string[], rows: unknown[][]): string {
  if (rows.length === 0) return `<p class="empty-state">No records.</p>`;
  return `<div class="table-wrap"><table>
  <thead>${htmlHeaderRow(headers)}</thead>
  <tbody>${rows.map((row) => htmlRow(row)).join("")}</tbody>
</table></div>`;
}

export function buildProjectHtml(
  detail: ProjectDetail,
  client: ClientRecord,
  pm: User | undefined,
  exportData: ProjectExportData = {},
  options: ProjectHtmlOptions = {},
): string {
  const { project, auditEvents, phases, gates, deficiencies, photoEvidence } = detail;
  const { equipmentLogs = [], inventoryPickups = [], materialLogs = [], checklistItems = [] } = exportData;
  const phasesById = new Map(phases.map((p) => [p.id, p]));
  const photoWarnings = options.photoWarnings ?? [];

  const exportDate = new Date().toISOString().slice(0, 10);

  const style = `
    :root {
      --bg: #f7f8fb;
      --fg: #172033;
      --card: #ffffff;
      --surface-elevated: #f1f4f8;
      --border: #dbe2ea;
      --border-strong: #c7d1dc;
      --primary: #185abc;
      --muted-fg: #657184;
      --warning: #9a3412;
      --warning-bg: #fff7ed;
    }
    @media print {
      body { background: #ffffff; }
      .report-section, .photo-group, .deficiency-card { break-inside: avoid; page-break-inside: avoid; }
      .raw-appendix { break-before: page; page-break-before: always; }
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
      background: var(--card);
      border-bottom: 1px solid var(--border-strong);
      padding: 2rem;
    }
    header.report-header h1 {
      font-size: 2rem;
      font-weight: 700;
    }
    header.report-header .meta {
      font-size: 0.875rem;
      color: var(--muted-fg);
      margin-top: 0.25rem;
    }
    main { max-width: 1180px; margin: 0 auto; padding: 1.5rem 2rem; }
    .report-section {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      margin-bottom: 1.25rem;
      padding: 1.25rem;
    }
    section { margin-bottom: 2rem; }
    h2 {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--fg);
      margin-bottom: 0.625rem;
    }
    h3 { font-size: 0.95rem; margin: 1rem 0 0.5rem; }
    .toc {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      list-style: none;
    }
    .toc a {
      display: inline-block;
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 0.35rem 0.7rem;
      background: var(--surface-elevated);
      font-size: 0.8125rem;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 0.75rem;
      margin-top: 1rem;
    }
    .summary-item {
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      padding: 0.75rem;
      background: var(--surface-elevated);
    }
    .summary-item span, .photo-meta span, .summary-item small {
      display: block;
      color: var(--muted-fg);
      font-size: 0.75rem;
    }
    .summary-item strong { display: block; font-size: 1rem; margin-top: 0.15rem; }
    .notes {
      border-left: 3px solid var(--primary);
      color: var(--muted-fg);
      margin-top: 1rem;
      padding-left: 0.75rem;
    }
    .warning-box {
      background: var(--warning-bg);
      border: 1px solid #fed7aa;
      border-radius: 0.5rem;
      color: var(--warning);
      padding: 0.875rem;
    }
    .warning-box ul { margin: 0.5rem 0 0 1rem; }
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
    .photo-group, .deficiency-card {
      border: 1px solid var(--border);
      border-radius: 0.625rem;
      padding: 0.875rem;
      margin-top: 0.875rem;
    }
    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
      gap: 0.875rem;
    }
    .photo-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      overflow: hidden;
    }
    .photo-card-warning { border-color: #fed7aa; }
    .photo-card a { display: block; }
    .photo-card img {
      width: 100%;
      aspect-ratio: 4/3;
      object-fit: cover;
      display: block;
    }
    .photo-missing {
      align-items: center;
      aspect-ratio: 4/3;
      background: var(--warning-bg);
      color: var(--warning);
      display: flex;
      font-weight: 700;
      justify-content: center;
      padding: 1rem;
      text-align: center;
    }
    .photo-card .photo-meta {
      padding: 0.625rem 0.75rem;
      font-size: 0.75rem;
      color: var(--muted-fg);
      line-height: 1.4;
    }
    .photo-card .photo-meta strong { color: var(--fg); display: block; font-size: 0.8125rem; }
    .photo-card .photo-meta em { color: var(--warning); display: block; font-style: normal; margin-top: 0.25rem; }
    .empty-state { color: var(--muted-fg); font-size: 0.875rem; }
    .raw-appendix section { margin-bottom: 1.5rem; }
    a { color: var(--primary); text-decoration: none; }
    a:hover { text-decoration: underline; }
  `;

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
      const relPath = photoRelPath(photo, phases);
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

  const executiveSection = `<section id="executive-summary" class="report-section">
  <h2>Executive Summary</h2>
  <p>${escapeHtml(client.name)} - ${escapeHtml(project.siteAddress)}</p>
  <div class="summary-grid">
    ${renderSummaryItem("Project", project.projectNumber, project.name)}
    ${renderSummaryItem("Project Manager", pm?.fullName ?? "Unassigned", pm?.email)}
    ${renderSummaryItem("Status", labelFromKey(project.status), `Completed ${formatDate(project.completedAt)}`)}
    ${renderSummaryItem("Attic", `Attic ${labelFromKey(project.atticCheckStatus)}`)}
    ${renderSummaryItem("Schedule", `${formatDate(project.scheduledStart)} to ${formatDate(project.scheduledEnd)}`)}
    ${renderSummaryItem("Phases", countLabel(phases.length, "phase"))}
    ${renderSummaryItem("Deficiencies", countLabel(deficiencies.length, "deficiency", "deficiencies"))}
    ${renderSummaryItem("Photos", countLabel(photoEvidence.length, "photo"))}
  </div>
  ${project.notes ? `<p class="notes">${escapeHtml(project.notes)}</p>` : ""}
</section>`;

  const tocSection = `<nav id="table-of-contents" class="report-section" aria-label="Table of Contents">
  <h2>Table of Contents</h2>
  <ul class="toc">
    <li><a href="#executive-summary">Executive Summary</a></li>
    <li><a href="#photo-gallery">Photo Evidence Gallery</a></li>
    <li><a href="#deficiency-closeout">Deficiency Closeout</a></li>
    <li><a href="#phase-timeline">Phase Timeline</a></li>
    <li><a href="#inventory-materials">Inventory and Materials</a></li>
    <li><a href="#raw-data-appendix">Raw Data Appendix</a></li>
  </ul>
</nav>`;

  const warningSection = photoWarnings.length > 0 ? `<section id="export-warnings" class="report-section">
  <h2>Export Warnings</h2>
  <div class="warning-box">
    <strong>${escapeHtml(countLabel(photoWarnings.length, "photo warning"))}</strong>
    <ul>${photoWarnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul>
  </div>
</section>` : "";

  const photoGroups = phases.map((phase) => {
    const groupPhotos = photoEvidence.filter((photo) => photo.phaseId === phase.id);
    if (groupPhotos.length === 0) return "";
    return `<div class="photo-group">
  <h3>${escapeHtml(labelFromKey(phase.type))}</h3>
  <div class="gallery-grid">${groupPhotos.map((photo) => renderPhotoCard(photo, phasesById, photoWarnings)).join("")}</div>
</div>`;
  }).join("");
  const unphasedPhotos = photoEvidence.filter((photo) => !photo.phaseId);
  const unphasedGroup = unphasedPhotos.length > 0 ? `<div class="photo-group">
  <h3>General</h3>
  <div class="gallery-grid">${unphasedPhotos.map((photo) => renderPhotoCard(photo, phasesById, photoWarnings)).join("")}</div>
</div>` : "";
  const photoGallerySection = `<section id="photo-gallery" class="report-section">
  <h2>Photo Evidence Gallery</h2>
  ${photoEvidence.length > 0 ? `${photoGroups}${unphasedGroup}` : `<p class="empty-state">No photos were exported for this project.</p>`}
</section>`;

  const deficiencyCloseoutCards = deficiencies.map((deficiency) => {
    const phase = phasesById.get(deficiency.phaseId);
    const beforePhotos = photoEvidence.filter((photo) => photo.deficiencyId === deficiency.id && photo.purpose === "deficiency_before");
    const afterPhotos = photoEvidence.filter((photo) => photo.deficiencyId === deficiency.id && photo.purpose === "deficiency_after");
    return `<article class="deficiency-card">
  <h3>${escapeHtml(deficiency.title)}</h3>
  <p>${escapeHtml([labelFromKey(deficiency.severity), labelFromKey(deficiency.status), phase ? labelFromKey(phase.type) : undefined].filter(Boolean).join(" - "))}</p>
  ${deficiency.description ? `<p class="notes">${escapeHtml(deficiency.description)}</p>` : ""}
  <div class="gallery-grid">
    ${beforePhotos.length > 0 ? beforePhotos.map((photo) => renderPhotoCard(photo, phasesById, photoWarnings, "Before correction")).join("") : `<p class="empty-state">No before photo exported.</p>`}
    ${afterPhotos.length > 0 ? afterPhotos.map((photo) => renderPhotoCard(photo, phasesById, photoWarnings, "After correction")).join("") : `<p class="empty-state">No after photo exported.</p>`}
  </div>
</article>`;
  }).join("");
  const deficiencyCloseoutSection = `<section id="deficiency-closeout" class="report-section">
  <h2>Deficiency Closeout</h2>
  ${deficiencyCloseoutCards || `<p class="empty-state">No deficiencies recorded.</p>`}
</section>`;

  const phaseTimelineSection = `<section id="phase-timeline" class="report-section">
  <h2>Phase Timeline</h2>
  ${renderSimpleTable(
    ["Phase", "Status", "Scheduled", "Closed", "Subcontractor"],
    phases.map((phase) => {
      const subcontractor = detail.subcontractors.find((candidate) => candidate.id === phase.assignedSubcontractorId);
      return [
        labelFromKey(phase.type),
        labelFromKey(phase.status),
        `${formatDate(phase.scheduledStart)} to ${formatDate(phase.scheduledEnd)}`,
        formatDate(phase.closedAt),
        subcontractor?.displayName ?? "Unassigned",
      ];
    }),
  )}
</section>`;

  const inventorySection = `<section id="inventory-materials" class="report-section">
  <h2>Inventory and Materials</h2>
  <h3>Project Equipment</h3>
  ${renderSimpleTable(
    ["Item", "Quantity", "Updated"],
    equipmentLogs.map((log) => [equipmentLabel(log.itemKey), log.quantity, formatDate(log.updatedAt)]),
  )}
  <h3>Phase Materials</h3>
  ${renderSimpleTable(
    ["Phase", "Item", "Quantity", "Updated"],
    materialLogs.map((log) => {
      const phase = phasesById.get(log.phaseId);
      return [phase ? labelFromKey(phase.type) : "Not recorded", materialLabel(log.itemKey, phase), log.quantity, formatDate(log.updatedAt)];
    }),
  )}
  <h3>Inventory Pickups</h3>
  ${renderSimpleTable(
    ["Date", "Item", "Quantity", "Note"],
    inventoryPickups.flatMap((pickup) => pickup.items.map((item) => {
      const phase = item.kind === "material"
        ? phases.find((candidate) => PHASE_MATERIAL_CATALOGS[candidate.type].some((catalogItem) => catalogItem.itemKey === item.itemKey))
        : undefined;
      return [
        formatDate(pickup.createdAt),
        item.kind === "equipment" ? equipmentLabel(item.itemKey) : materialLabel(item.itemKey, phase),
        item.quantity,
        pickup.note ?? "",
      ];
    })),
  )}
</section>`;

  const rawAppendixSection = `<section id="raw-data-appendix" class="report-section raw-appendix">
  <h2>Raw Data Appendix</h2>
  ${projectSection}
  ${clientSection}
  ${phasesSection}
  ${gatesSection}
  ${deficienciesSection}
  ${photoEvidenceSection}
  ${subcontractorsSection}
  ${equipmentSection}
  ${materialsSection}
  ${pickupsSection}
  ${checklistSection}
  ${activitySection}
</section>`;

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
    <div class="meta">${escapeHtml(project.projectNumber)} - ${escapeHtml(project.siteAddress)} - Exported ${escapeHtml(formatDate(exportDate))}</div>
  </header>
  <main>
    ${executiveSection}
    ${tocSection}
    ${warningSection}
    ${photoGallerySection}
    ${deficiencyCloseoutSection}
    ${phaseTimelineSection}
    ${inventorySection}
    ${rawAppendixSection}
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

  // Add CSV before photo fetches; HTML is added after warnings are known.
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

        const relPath = photoRelPath(photo, phases);
        const [, folder, filename] = relPath.split("/");

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
  const html = buildProjectHtml(detail, client, pm, exportData, { photoWarnings: warnings });
  zip.file("project-details.html", html);

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
