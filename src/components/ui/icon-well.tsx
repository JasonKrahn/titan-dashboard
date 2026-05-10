import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const iconWellVariants = cva("inline-flex shrink-0 items-center justify-center border", {
  variants: {
    tone: {
      primary: "border-icon-primary-border bg-icon-primary text-icon-primary-foreground",
      muted: "border-icon-muted-border bg-icon-muted text-icon-muted-foreground",
      ready: "border-icon-ready-border bg-icon-ready text-icon-ready-foreground",
      success: "border-icon-success-border bg-icon-success text-icon-success-foreground",
      warning: "border-icon-warning-border bg-icon-warning text-icon-warning-foreground",
      danger: "border-icon-danger-border bg-icon-danger text-icon-danger-foreground",
      accent: "border-icon-accent-border bg-icon-accent text-icon-accent-foreground",
    },
    size: {
      sm: "h-7 w-7 [&_svg]:h-3.5 [&_svg]:w-3.5",
      md: "h-8 w-8 [&_svg]:h-4 [&_svg]:w-4",
      lg: "h-9 w-9 [&_svg]:h-4 [&_svg]:w-4",
      xl: "h-10 w-10 [&_svg]:h-5 [&_svg]:w-5",
    },
    shape: {
      square: "rounded-md",
      panel: "rounded-lg",
      pill: "rounded-full",
    },
  },
  defaultVariants: {
    tone: "primary",
    size: "md",
    shape: "square",
  },
});

export interface IconWellProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof iconWellVariants> {}

const IconWell = React.forwardRef<HTMLDivElement, IconWellProps>(
  ({ className, tone, size, shape, ...props }, ref) => (
    <div ref={ref} className={cn(iconWellVariants({ tone, size, shape }), className)} {...props} />
  ),
);
IconWell.displayName = "IconWell";

export { IconWell, iconWellVariants };
