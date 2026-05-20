import * as React from "react";
import { X } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "project";
}

/**
 * Mobile-friendly bottom sheet wrapper around Radix Sheet.
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  variant = "default",
}: BottomSheetProps) {
  const isProjectVariant = variant === "project";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        overlayClassName={isProjectVariant ? "bg-black/60 backdrop-blur-sm" : undefined}
        showCloseButton={!isProjectVariant}
        aria-describedby={description ? undefined : undefined}
        className={cn(
          "flex max-h-[90dvh] flex-col overflow-hidden p-0",
          isProjectVariant
            ? "max-h-[88dvh] rounded-t-3xl border-outline-variant/30 bg-surface-container-high shadow-2xl"
            : "rounded-t-2xl",
          className,
        )}
      >
        {isProjectVariant ? (
          <div className="relative shrink-0 px-4 pb-4 pt-3">
            <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-outline-variant" />
            {title && (
              <SheetHeader className="items-center px-0 pb-0 pt-0 text-center">
                <SheetTitle>{title}</SheetTitle>
                {description && <SheetDescription>{description}</SheetDescription>}
              </SheetHeader>
            )}
            <button
              type="button"
              aria-label="Close sheet"
              onClick={() => onOpenChange(false)}
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-variant focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              aria-label="Close bottom sheet"
              onClick={() => onOpenChange(false)}
              className="mx-auto mt-2 flex h-11 w-20 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 transition hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span className="h-1 w-10 rounded-full bg-current" />
            </button>
            {title && (
              <SheetHeader className="shrink-0 px-4 pb-3 pt-1">
                <SheetTitle>{title}</SheetTitle>
                {description && <SheetDescription>{description}</SheetDescription>}
              </SheetHeader>
            )}
          </>
        )}
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto",
            isProjectVariant
              ? "px-4 pb-[max(2rem,env(safe-area-inset-bottom))]"
              : "px-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
          )}
        >
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
