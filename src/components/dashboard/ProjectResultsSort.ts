import type { ClientRecord, Project, User } from "@/lib/types";
import type { PhaseSummaryItem } from "@/lib/derived";

export type ProjectSortKey = "project" | "client" | "status" | "openIssues" | "updated" | "pm";
export type ProjectSortDirection = "asc" | "desc";

export interface ProjectSortState {
  key: ProjectSortKey;
  direction: ProjectSortDirection;
}

export interface ProjectRow {
  project: Project;
  client?: ClientRecord;
  clientName: string;
  pm?: User;
  pmName: string;
  phaseSummary: PhaseSummaryItem[];
  openIssues: number;
}

function compareValue(a: string | number, b: string | number) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

function sortValue(row: ProjectRow, key: ProjectSortKey): string | number {
  switch (key) {
    case "project":
      return `${row.project.name} ${row.project.projectNumber}`;
    case "client":
      return row.clientName;
    case "status":
      return row.project.status;
    case "openIssues":
      return row.openIssues;
    case "updated":
      return new Date(row.project.updatedAt).getTime();
    case "pm":
      return row.pmName;
  }
}

export function sortProjectRows(rows: ProjectRow[], sort: ProjectSortState): ProjectRow[] {
  const direction = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const primary = compareValue(sortValue(a, sort.key), sortValue(b, sort.key));
    if (primary !== 0) return primary * direction;
    return compareValue(a.project.projectNumber, b.project.projectNumber);
  });
}
