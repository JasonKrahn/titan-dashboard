import { Calendar, Users, Filter, Inbox, ChevronDown } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  QUEUE_FILTERS,
  buildVisibleQueue,
  getQueueCounts,
  type QueueFilter,
  type QueueItem,
  type QueueFilters,
} from "@/lib/command/attentionQueue";
import { AttentionQueueItem } from "./AttentionQueueItem";

interface Props {
  items: QueueItem[];
  filter: QueueFilter;
  onFilterChange: (f: QueueFilter) => void;
  onOpenProject: (id: string) => void;
  filters?: QueueFilters;
  onFiltersChange: (filters: QueueFilters) => void;
  clients?: string[];
  users?: string[];
}

export function AttentionQueue({ items, filter, onFilterChange, onOpenProject, filters, onFiltersChange, clients = [], users = [] }: Props) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const filtered = buildVisibleQueue(items, filter, filters);
  const counts = getQueueCounts(items);

  return (
    <section className="flex h-full flex-col rounded-md border border-border bg-surface-panel">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest">Attention Queue</h2>
        </div>
        <div className="text-[11px] text-muted-foreground">
          {filtered.length} item{filtered.length === 1 ? "" : "s"}
        </div>
      </header>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border bg-surface-elevated px-2 py-1 scrollbar-hide">
        {QUEUE_FILTERS.map((f) => {
          const active = filter === f.value;
          const count = counts[f.value] ?? 0;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => onFilterChange(f.value)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-sm px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide transition-colors",
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground/70 hover:bg-accent/50 hover:text-foreground",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "rounded-sm px-1 text-[10px] tabular-nums",
                  active ? "bg-background/20" : "bg-muted/50",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={cn(
            "ml-auto inline-flex shrink-0 items-center gap-1 rounded-sm px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide transition-colors",
            showAdvancedFilters
              ? "bg-foreground text-background"
              : "text-muted-foreground/70 hover:bg-accent/50 hover:text-foreground",
          )}
        >
          <Filter className="h-3 w-3" />
          Filters
          <ChevronDown className={cn("h-3 w-3 transition-transform", showAdvancedFilters && "rotate-180")} />
        </button>
      </div>

      {/* Advanced filters */}
      {showAdvancedFilters && (
        <div className="border-b border-border bg-surface-elevated px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Advanced Filters</span>
        </div>
        
        <div className="grid gap-3 sm:grid-cols-3">
          {/* Date range filter */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-1.5">
              <Calendar className="h-3 w-3.5" />
              Date Range
            </label>
            <div className="flex gap-1">
              <input
                type="date"
                className="h-8 flex-1 rounded border border-border bg-background px-2 text-xs"
                placeholder="Start"
                value={filters?.dateRange?.start || ""}
                onChange={(e) => onFiltersChange({
                  ...filters,
                  dateRange: { ...filters?.dateRange, start: e.target.value }
                })}
              />
              <input
                type="date"
                className="h-8 flex-1 rounded border border-border bg-background px-2 text-xs"
                placeholder="End"
                value={filters?.dateRange?.end || ""}
                onChange={(e) => onFiltersChange({
                  ...filters,
                  dateRange: { ...filters?.dateRange, end: e.target.value }
                })}
              />
            </div>
          </div>

          {/* Client filter */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-1.5">
              <Users className="h-3 w-3.5" />
              Clients
            </label>
            <select
              className="h-8 w-full rounded border border-border bg-background px-2 text-xs"
              value={filters?.client || ""}
              onChange={(e) => {
                onFiltersChange({ ...filters, client: e.target.value || undefined });
              }}
            >
              <option value="" className="text-xs">All Clients</option>
              {clients.map((client) => (
                <option key={client} value={client} className="text-xs">
                  {client}
                </option>
              ))}
            </select>
          </div>

          {/* User filter */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-1.5">
              <Users className="h-3 w-3.5" />
              Users
            </label>
            <select
              className="h-8 w-full rounded border border-border bg-background px-2 text-xs"
              value={filters?.user || ""}
              onChange={(e) => {
                onFiltersChange({ ...filters, user: e.target.value || undefined });
              }}
            >
              <option value="" className="text-xs">All Users</option>
              {users.map((user) => (
                <option key={user} value={user} className="text-xs">
                  {user}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      )}

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
