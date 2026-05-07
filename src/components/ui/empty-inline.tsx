import * as React from "react";
import { cn } from "@/lib/utils";

interface EmptyInlineProps {
  text: string;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Single-line italic muted empty state. Use on mobile to replace bordered
 * empty boxes that push actionable data below the fold.
 */
export function EmptyInline({ text, icon, className }: EmptyInlineProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-3 py-2 text-xs italic text-muted-foreground",
        className,
      )}
    >
      {icon}
      <span>{text}</span>
    </div>
  );
}
