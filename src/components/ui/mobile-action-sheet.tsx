import * as React from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { IconWell } from "@/components/ui/icon-well";
import { cn } from "@/lib/utils";

export interface MobileActionItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  helperText?: string;
  disabled?: boolean;
}

interface MobileActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  actions: MobileActionItem[];
  variant?: "default" | "project";
}

export function MobileActionSheet({
  open,
  onOpenChange,
  title,
  actions,
  variant = "default",
}: MobileActionSheetProps) {
  const isProjectVariant = variant === "project";

  const runAction = (action: MobileActionItem) => {
    if (action.disabled) return;
    onOpenChange(false);
    action.onClick();
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      variant={isProjectVariant ? "project" : "default"}
    >
      <div className={cn("grid", isProjectVariant ? "gap-3" : "gap-2")}>
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            disabled={action.disabled}
            onClick={() => runAction(action)}
            className={cn(
              isProjectVariant
                ? "flex min-h-[72px] w-full items-center gap-4 rounded-xl border border-outline-variant/30 bg-surface-variant px-4 py-4 text-left transition-all"
                : "flex min-h-12 w-full items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-left transition-colors",
              isProjectVariant
                ? "enabled:active:scale-[0.98] enabled:active:bg-surface-bright enabled:hover:bg-surface-bright disabled:cursor-not-allowed disabled:opacity-50"
                : "enabled:active:bg-muted/60 enabled:hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <IconWell
              tone="primary"
              size={isProjectVariant ? "xl" : "lg"}
              shape={isProjectVariant ? "panel" : "square"}
              className={cn(
                "border-transparent",
                isProjectVariant && "bg-surface-container-lowest text-primary",
              )}
            >
              {action.icon}
            </IconWell>
            <span className="min-w-0 flex-1">
              <span className={cn("block font-medium", isProjectVariant ? "text-base text-on-surface" : "text-sm text-foreground")}>
                {action.label}
              </span>
              {action.helperText && (
                <span
                  className={cn(
                    "mt-0.5 block",
                    isProjectVariant ? "text-sm text-on-surface-variant" : "text-xs text-muted-foreground",
                  )}
                >
                  {action.helperText}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}
