import * as React from "react";
import { cn } from "@/lib/utils";

interface FabProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: React.ReactNode;
}

/**
 * Floating action button. Mobile-only (hidden at sm and up).
 * Pinned to bottom-right with safe-area padding.
 */
export const Fab = React.forwardRef<HTMLButtonElement, FabProps>(
  ({ label, icon, className, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className={cn(
        "sm:hidden fixed right-4 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow transition active:scale-95",
        "bottom-[max(1rem,env(safe-area-inset-bottom))]",
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  ),
);
Fab.displayName = "Fab";
