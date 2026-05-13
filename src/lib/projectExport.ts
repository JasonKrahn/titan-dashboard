import JSZip from "jszip";
import { getPhotoViewUrl } from "@/lib/api";
import type { AuditEvent, ClientRecord, Phase, PhotoEvidence, User } from "@/lib/types";
import type { ProjectDetail } from "@/lib/types";

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

export function buildProjectCsv(
  detail: ProjectDetail,
  client: ClientRecord,
  pm: User | undefined,
): string {
  const { project, auditEvents } = detail;
  const lines: string[] = [];

  // Section 1 — Project details
  lines.push("SECTION,PROJECT DETAILS");
  lines.push(buildRow(["Project Number", "Name", "Client", "Project Manager", "Status", "Site Address", "Finish Level", "Scheduled Start", "Scheduled End", "Completed At", "Created At", "Updated At"]));
  lines.push(buildRow([
    project.projectNumber,
    project.name,
    client.name,
    pm?.fullName ?? "Unassigned",
    project.status,
    project.siteAddress,
    project.finishLevel ?? "",
    project.scheduledStart ?? "",
    project.scheduledEnd ?? "",
    project.completedAt ?? "",
    project.createdAt,
    project.updatedAt,
  ]));

  lines.push("");

  // Section 2 — Activity log
  lines.push("SECTION,ACTIVITY LOG");
  lines.push(buildRow(["Timestamp", "Actor ID", "Entity Type", "Entity ID", "Action", "Previous Value", "Next Value"]));
  const sorted = [...auditEvents].sort(
    (a: AuditEvent, b: AuditEvent) => (a.createdAt < b.createdAt ? 1 : -1),
  );
  for (const event of sorted) {
    lines.push(buildRow([
      event.createdAt,
      event.actorUserId,
      event.entityType,
      event.entityId,
      event.action,
      event.previousValue !== undefined ? JSON.stringify(event.previousValue) : "",
      event.nextValue !== undefined ? JSON.stringify(event.nextValue) : "",
    ]));
  }

  return lines.join("\n");
}

export async function exportProjectZip(
  detail: ProjectDetail,
  client: ClientRecord,
  pm: User | undefined,
): Promise<void> {
  const { project, phases, photoEvidence } = detail;

  const zip = new JSZip();

  // Add CSV
  const csv = buildProjectCsv(detail, client, pm);
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
