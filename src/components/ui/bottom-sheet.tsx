import * as React from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Mobile-friendly bottom sheet wrapper around Radix Sheet.
 */
export function BottomSheet({ open, onOpenChange, title, description, children, className }: BottomSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "flex max-h-[90dvh] flex-col overflow-hidden rounded-t-2xl p-0",
          className,
        )}
      >
        <button
          type="button"
          aria-label="Close bottom sheet"
          onClick={() => onOpenChange(false)}
          className="mx-auto mt-3 flex h-6 w-16 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 transition hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <span className="h-1 w-10 rounded-full bg-current" />
        </button>
        {title && (
          <SheetHeader className="shrink-0 px-4 pb-3 pt-1">
            <SheetTitle>{title}</SheetTitle>
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
