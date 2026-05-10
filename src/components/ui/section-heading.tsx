import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const sectionHeadingVariants = cva("font-semibold uppercase tracking-wider text-muted-foreground", {
  variants: {
    size: {
      sm: "text-eyebrow",
      md: "text-xs",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export interface SectionHeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof sectionHeadingVariants> {
  as?: "div" | "h2" | "h3" | "h4" | "p" | "span";
}

function SectionHeading({ as = "h2", className, size, ...props }: SectionHeadingProps) {
  const Comp = as;
  return <Comp className={cn(sectionHeadingVariants({ size }), className)} {...props} />;
}

export { SectionHeading, sectionHeadingVariants };
