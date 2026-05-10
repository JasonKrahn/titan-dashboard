import { cn } from "@/lib/utils";
import type { BadgeTone } from "@/components/ui/badge";
import type { HeatmapMatrix } from "@/lib/command/heatmap";

const CELL_BG: Record<BadgeTone, (intensity: number) => string> = {
  neutral: (i) => (i === 0 ? "bg-muted/30" : i < 0.5 ? "bg-status-not-started/15" : "bg-status-not-started/30"),
  info: (i) => (i === 0 ? "bg-muted/30" : i < 0.5 ? "bg-status-in-progress/20" : "bg-status-in-progress/40"),
  ready: (i) => (i === 0 ? "bg-muted/30" : i < 0.5 ? "bg-status-ready/20" : "bg-status-ready/45"),
  success: (i) => (i === 0 ? "bg-muted/30" : i < 0.5 ? "bg-status-closed/20" : "bg-status-closed/45"),
  warning: (i) => (i === 0 ? "bg-muted/30" : i < 0.5 ? "bg-status-attention/25" : "bg-status-attention/50"),
  danger: (i) => (i === 0 ? "bg-muted/30" : i < 0.5 ? "bg-status-blocked/30" : "bg-status-blocked/55"),
  accent: (i) => (i === 0 ? "bg-muted/30" : i < 0.5 ? "bg-status-accent/20" : "bg-status-accent/45"),
};

const CELL_TEXT: Record<BadgeTone, string> = {
  neutral: "text-foreground/70",
  info: "text-status-in-progress",
  ready: "text-status-ready",
  success: "text-status-closed",
  warning: "text-status-attention",
  danger: "text-status-blocked",
  accent: "text-status-accent",
};

interface Props {
  matrix: HeatmapMatrix;
}

export function PhaseFlowHeatmap({ matrix }: Props) {
  // Compute per-column max for intensity scaling.
  const colMax: Record<string, number> = {};
  for (const col of matrix.cols) {
    colMax[col.key] = Math.max(
      1,
      ...matrix.rows.map((r) => (r.singleCol && r.singleCol !== col.key ? 0 : r.cells[col.key].count)),
    );
  }

  return (
    <section className="rounded-md border border-border bg-surface-panel shadow-card">
      <header className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-bold uppercase tracking-widest">Phase Flow</h2>
        <p className="text-[11px] text-muted-foreground">Counts by phase × status. Darker = more.</p>
      </header>
      <div className="overflow-x-auto">
        <div className="p-3">
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `120px repeat(${matrix.cols.length}, minmax(0, 1fr))` }}
          >
            {/* Header row */}
            <div />
            {matrix.cols.map((c) => (
              <div
                key={c.key}
                className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center"
              >
                {c.label}
              </div>
            ))}

            {/* Body rows */}
            {matrix.rows.map((row) => (
              <FragmentRow key={row.key} row={row} colMax={colMax} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FragmentRow({
  row,
  colMax,
}: {
  row: HeatmapMatrix["rows"][number];
  colMax: Record<string, number>;
}) {
  return (
    <>
      <div className="flex items-center pr-2 text-xs font-semibold text-foreground/85">{row.label}</div>
      {Object.entries(row.cells).map(([colKey, cell]) => {
        const applicable = cell.applicable;
        const intensity = applicable && colMax[colKey] ? cell.count / colMax[colKey] : 0;
        return (
          <div
            key={colKey}
            className={cn(
              "flex h-12 items-center justify-center rounded-sm border border-border/60 text-sm font-bold tabular-nums",
              applicable ? CELL_BG[cell.tone](intensity) : "bg-transparent border-dashed",
              applicable ? CELL_TEXT[cell.tone] : "text-muted-foreground/40",
            )}
            aria-label={`${row.label} ${colKey}: ${applicable ? cell.count : "n/a"}`}
          >
            {applicable ? cell.count : "—"}
          </div>
        );
      })}
    </>
  );
}
