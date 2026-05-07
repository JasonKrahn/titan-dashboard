import * as React from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
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
}

export function MobileActionSheet({ open, onOpenChange, title, actions }: MobileActionSheetProps) {
  const runAction = (action: MobileActionItem) => {
    if (action.disabled) return;
    onOpenChange(false);
    action.onClick();
  };

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={title}>
      <div className="grid gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            disabled={action.disabled}
            onClick={() => runAction(action)}
            className={cn(
              "flex min-h-12 w-full items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-left transition-colors",
              "enabled:active:bg-muted/60 enabled:hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
              {action.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">{action.label}</span>
              {action.helperText && (
                <span className="mt-0.5 block text-xs text-muted-foreground">{action.helperText}</span>
              )}
            </span>
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}
