import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  variant: "no-projects" | "no-matches";
  onClear?: () => void;
}

export function EmptyState({ variant, onClear }: EmptyStateProps) {
  const title = variant === "no-projects" ? "No projects yet" : "No projects match your filters";
  const body = variant === "no-projects"
    ? "Create a project to start tracking phases, inspections, and deficiencies."
    : "Try adjusting your filters or clearing them to see more projects.";
  return (
    <>
      {/* Mobile: inline */}
      <div className="sm:hidden flex flex-col items-start gap-1 px-3 py-2 text-xs italic text-muted-foreground">
        <span>{title}.</span>
        {variant === "no-matches" && onClear && (
          <Button variant="link" size="sm" className="h-auto px-0 text-xs" onClick={onClear}>
            Clear filters
          </Button>
        )}
      </div>
      {/* Desktop */}
      <div className="hidden sm:block border border-dashed border-border rounded-lg p-12 text-center bg-card/40">
        <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Inbox className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">{body}</p>
        {variant === "no-matches" && onClear && (
          <Button variant="outline" className="mt-4" onClick={onClear}>
            Clear filters
          </Button>
        )}
      </div>
    </>
  );
}
