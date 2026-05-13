import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyInline } from "@/components/ui/empty-inline";
import { SectionHeading } from "@/components/ui/section-heading";

export interface InventoryDisplayItem {
  label: string;
  quantity: number;
}

interface InventoryDisplayCardProps {
  title: string;
  items: InventoryDisplayItem[];
  onManage: () => void;
  manageLabel?: string;
  emptyText?: string;
}

export function InventoryDisplayCard({
  title,
  items,
  onManage,
  manageLabel = "Manage",
  emptyText = "No items logged",
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
    </Card>
  );
}
