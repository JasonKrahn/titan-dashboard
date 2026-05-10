// Pure derivation of the Phase Flow Heatmap and bottleneck insights.
import type { Phase, PhaseStatus, PhaseType, Project } from "@/lib/types";
import type { BadgeTone } from "@/components/ui/badge";

export type HeatmapRowKey = "draft" | "insulation" | "drywall" | "finishing" | "completed" | "archived";
export type HeatmapColKey = "not_started" | "in_progress" | "blocked" | "ready_for_inspection" | "closed";

export interface HeatmapCell {
  count: number;
  tone: BadgeTone;
  /** When false, the cell is rendered as a dimmed em-dash placeholder. */
  applicable: boolean;
}

export interface HeatmapRow {
  key: HeatmapRowKey;
  label: string;
  /** When set, the row collapses into a single project-status count rendered in this column. */
  singleCol?: HeatmapColKey;
  cells: Record<HeatmapColKey, HeatmapCell>;
}

export interface HeatmapMatrix {
  rows: HeatmapRow[];
  cols: { key: HeatmapColKey; label: string }[];
}

const COLS: { key: HeatmapColKey; label: string }[] = [
  { key: "not_started", label: "Not started" },
  { key: "in_progress", label: "In progress" },
  { key: "blocked", label: "Blocked" },
  { key: "ready_for_inspection", label: "Ready" },
  { key: "closed", label: "Closed" },
];

const COL_TONE: Record<HeatmapColKey, BadgeTone> = {
  not_started: "neutral",
  in_progress: "info",
  blocked: "danger",
  ready_for_inspection: "ready",
  closed: "success",
};

const PHASE_TYPES: PhaseType[] = ["insulation", "drywall", "finishing"];
const DAY = 1000 * 60 * 60 * 24;

function daysSince(iso?: string | null): number {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / DAY));
}

function emptyCells(applicable: HeatmapColKey | "all"): Record<HeatmapColKey, HeatmapCell> {
  const out = {} as Record<HeatmapColKey, HeatmapCell>;
  for (const c of COLS) {
    out[c.key] = {
      count: 0,
      tone: COL_TONE[c.key],
      applicable: applicable === "all" || applicable === c.key,
    };
  }
  return out;
}

export function buildHeatmap(projects: Project[], phases: Phase[]): HeatmapMatrix {
  const rows: HeatmapRow[] = [];
  const activeProjectIds = new Set(projects.filter((p) => p.status === "active").map((p) => p.id));

  // Draft (project status)
  const draftRow: HeatmapRow = {
    key: "draft",
    label: "Draft",
    singleCol: "not_started",
    cells: emptyCells("not_started"),
  };
  draftRow.cells.not_started.count = projects.filter((p) => p.status === "draft").length;
  rows.push(draftRow);

  // Phase rows
  for (const type of PHASE_TYPES) {
    const row: HeatmapRow = {
      key: type,
      label: type.charAt(0).toUpperCase() + type.slice(1),
      cells: emptyCells("all"),
    };
    const ofType = phases.filter((p) => p.type === type && activeProjectIds.has(p.projectId));
    for (const c of COLS) {
      row.cells[c.key].count = ofType.filter((p) => p.status === (c.key as PhaseStatus)).length;
    }
    rows.push(row);
  }

  // Completed (project status)
  const completedRow: HeatmapRow = {
    key: "completed",
    label: "Completed",
    singleCol: "closed",
    cells: emptyCells("closed"),
  };
  completedRow.cells.closed.count = projects.filter((p) => p.status === "completed").length;
  rows.push(completedRow);

  // Archived (project status)
  const archivedRow: HeatmapRow = {
    key: "archived",
    label: "Archived",
    singleCol: "closed",
    cells: emptyCells("closed"),
  };
  archivedRow.cells.closed.count = projects.filter((p) => p.status === "archived").length;
  archivedRow.cells.closed.tone = "neutral";
  rows.push(archivedRow);

  return { rows, cols: COLS };
}

export interface BottleneckInsight {
  id: string;
  tone: BadgeTone;
  message: string;
}

export function buildBottleneckInsights(matrix: HeatmapMatrix, projects: Project[]): BottleneckInsight[] {
  const out: BottleneckInsight[] = [];

  for (const type of PHASE_TYPES) {
    const row = matrix.rows.find((r) => r.key === type);
    if (!row) continue;
    const ready = row.cells.ready_for_inspection.count;
    const blocked = row.cells.blocked.count;
    if (blocked > 0) {
      out.push({
        id: `${type}-blocked`,
        tone: "danger",
        message: `${row.label} has ${blocked} blocked phase${blocked === 1 ? "" : "s"}.`,
      });
    }
    if (ready >= 2) {
      out.push({
        id: `${type}-ready`,
        tone: "ready",
        message: `${row.label} has ${ready} phases waiting for inspection.`,
      });
    }
  }

  const completed = projects.filter((p) => p.status === "completed" && daysSince(p.completedAt ?? p.updatedAt) >= 7).length;
  if (completed > 0) {
    out.push({
      id: "archive",
      tone: "success",
      message: `${completed} completed project${completed === 1 ? "" : "s"} ready to archive after 7 days.`,
    });
  }

  return out.slice(0, 4);
}
