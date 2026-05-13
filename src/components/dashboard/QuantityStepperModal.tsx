import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyInline } from "@/components/ui/empty-inline";

export interface QuantityStepperItem {
  itemKey: string;
  label: string;
  quantity: number;
}

interface QuantityStepperModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  items: QuantityStepperItem[];
  onQuantityChange: (itemKey: string, quantity: number) => void;
  confirmLabel?: string;
  onConfirm?: () => void;
  confirmDisabled?: boolean;
  isConfirming?: boolean;
}

const normalizeQuantity = (quantity: number) => Math.max(0, quantity);
const parseQuantityInput = (value: string) => {
  const quantity = Number(value);
  return Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0;
};

export function QuantityStepperModal({
  open,
  onOpenChange,
  title,
  description,
  items,
  onQuantityChange,
  confirmLabel,
  onConfirm,
  confirmDisabled,
  isConfirming,
}: QuantityStepperModalProps) {
  const footerLabel = onConfirm ? (isConfirming ? "Saving..." : confirmLabel ?? "Save") : "Done";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className={description ? undefined : "sr-only"}>
            {description ?? "Adjust item quantities."}
          </DialogDescription>
        </DialogHeader>

        {items.length === 0 ? (
          <EmptyInline text="No items available" />
        ) : (
          <ul className="space-y-2">
            {items.map((item) => {
              const quantity = normalizeQuantity(item.quantity);

              return (
                <li
                  key={item.itemKey}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/20 p-2.5"
                >
                  <span className="min-w-0 truncate text-sm font-medium">{item.label}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 md:h-8 md:w-8"
                      aria-label={`Decrease ${item.label}`}
                      disabled={quantity === 0}
                      onClick={() => onQuantityChange(item.itemKey, Math.max(0, quantity - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      aria-label={`Quantity for ${item.label}`}
                      value={quantity}
                      onChange={(event) => onQuantityChange(item.itemKey, parseQuantityInput(event.target.value))}
                      className="h-11 w-16 px-2 text-center text-base font-semibold tabular-nums md:h-8 md:text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 md:h-8 md:w-8"
                      aria-label={`Increase ${item.label}`}
                      onClick={() => onQuantityChange(item.itemKey, quantity + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <DialogFooter className="pt-2">
          <Button
            type="button"
            disabled={confirmDisabled || isConfirming}
            onClick={onConfirm ?? (() => onOpenChange(false))}
          >
            {footerLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
