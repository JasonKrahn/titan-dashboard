import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyInline } from "@/components/ui/empty-inline";
import { SectionHeading } from "@/components/ui/section-heading";

export interface InventoryDisplayItem {
  label: string;
  quantity: number;
}

export interface InventoryPickupSummaryItem {
  id: string;
  text: string;
}

export type InventoryDisplayLayout = "list" | "grid" | "chips";

interface InventoryDisplayCardProps {
  title: string;
  items: InventoryDisplayItem[];
  onManage: () => void;
  manageLabel?: string;
  emptyText?: string;
  layout?: InventoryDisplayLayout;
  pickupSummaries?: InventoryPickupSummaryItem[];
}

export function InventoryDisplayCard({
  title,
  items,
  onManage,
  manageLabel = "Manage",
  emptyText = "No items logged",
  layout = "list",
  pickupSummaries = [],
}: InventoryDisplayCardProps) {
  return (
    <Card className="p-3 shadow-card sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <SectionHeading as="h3">{title}</SectionHeading>
        <Button size="sm" variant="outline" className="h-8 px-3" onClick={onManage}>
          {manageLabel}
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyInline text={emptyText} />
      ) : layout === "chips" ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item.label}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-3 py-1 text-sm"
            >
              <span className="font-medium text-foreground">{item.label}</span>
              <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-foreground">
                ×{item.quantity}
              </span>
            </span>
          ))}
        </div>
      ) : layout === "grid" ? (
        <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2">
          {items.map((item) => (
            <li
              key={item.label}
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/20 p-2 sm:p-2.5"
            >
              <span className="min-w-0 truncate text-sm font-medium">{item.label}</span>
              <span className="shrink-0 tabular-nums text-sm font-semibold text-foreground">{item.quantity}</span>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-1.5 sm:space-y-2">
          {items.map((item) => (
            <li
              key={item.label}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/20 p-2 sm:p-2.5"
            >
              <span className="min-w-0 truncate text-sm font-medium">{item.label}</span>
              <span className="shrink-0 tabular-nums text-sm font-semibold text-foreground">{item.quantity}</span>
            </li>
          ))}
        </ul>
      )}

      {pickupSummaries.length > 0 && (
        <div className="mt-3 space-y-1 rounded-md border border-border/70 bg-muted/20 p-2 text-xs text-muted-foreground">
          {pickupSummaries.map((summary) => (
            <p key={summary.id}>
              <span className="font-semibold text-foreground">Picked up:</span> {summary.text}
            </p>
          ))}
        </div>
      )}
    </Card>
  );
}
