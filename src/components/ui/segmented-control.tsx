import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const segmentedControlVariants = cva("inline-flex w-fit gap-1 rounded-md border bg-card p-1", {
  variants: {
    size: {
      sm: "border-border p-1",
      md: "border-border-strong p-1 shadow-card",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export interface SegmentedControlProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof segmentedControlVariants> {}

const SegmentedControl = React.forwardRef<HTMLDivElement, SegmentedControlProps>(
  ({ className, size, ...props }, ref) => (
    <div ref={ref} className={cn(segmentedControlVariants({ size }), className)} {...props} />
  ),
);
SegmentedControl.displayName = "SegmentedControl";

export { SegmentedControl, segmentedControlVariants };
