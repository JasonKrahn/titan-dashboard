import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { AttentionQueueItem } from "./AttentionQueueItem";
import { QUEUE_FILTERS, type QueueCategory, type QueueItem } from "@/lib/command/attentionQueue";

interface Props {
  items: QueueItem[];
  filter: QueueCategory | "all";
  onFilterChange: (f: QueueCategory | "all") => void;
  onOpenProject: (id: string) => void;
}

export function AttentionQueue({ items, filter, onFilterChange, onOpenProject }: Props) {
  const filtered = filter === "all" ? items : items.filter((i) => i.category === filter);
  const counts: Record<string, number> = { all: items.length };
  for (const it of items) counts[it.category] = (counts[it.category] ?? 0) + 1;

  return (
    <section className="flex h-full flex-col rounded-md border border-border bg-surface-panel shadow-card">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest">Attention Queue</h2>
          <p className="text-[11px] text-muted-foreground">
            Sorted by severity, then age. {items.length} item{items.length === 1 ? "" : "s"}.
          </p>
        </div>
      </header>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border bg-surface-elevated px-2 py-1.5 scrollbar-hide">
        {QUEUE_FILTERS.map((f) => {
          const active = filter === f.value;
          const count = counts[f.value] ?? 0;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => onFilterChange(f.value)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-semibold uppercase tracking-wide transition-colors",
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "rounded-sm px-1 text-[10px] tabular-nums",
                  active ? "bg-background/20" : "bg-muted",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="flex-1 divide-y divide-border overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <Inbox className="h-8 w-8 text-muted-foreground/60" aria-hidden />
            <p className="text-sm font-semibold">All clear</p>
            <p className="text-xs text-muted-foreground">
              No items in the {filter === "all" ? "queue" : filter + " filter"}.
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <AttentionQueueItem key={item.id} item={item} onOpen={onOpenProject} />
          ))
        )}
      </div>
    </section>
  );
}
