import { ArrowLeft, Layers3 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

export interface PageNavItem {
  label: string;
  to?: string;
  state?: unknown;
}

interface PageNavProps {
  backFallback: string;
  backLabel: string;
  items: PageNavItem[];
  className?: string;
}

export function PageNav({ backFallback, backLabel, items, className }: PageNavProps) {
  const navigate = useNavigate();
  const mobileItems = items.length > 2 ? [items[0], items[items.length - 1]] : items;

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(backFallback);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border-strong bg-gradient-surface px-3 py-2 shadow-panel sm:flex-row sm:items-center sm:gap-4",
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleBack}
        className="h-9 shrink-0 gap-2 rounded-full border border-border-strong bg-card px-3 text-muted-foreground shadow-card hover:border-border-emphasis hover:bg-accent hover:text-foreground sm:self-auto"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>{backLabel}</span>
      </Button>
      <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />
      <div className="min-w-0 flex-1 overflow-x-auto scrollbar-hide sm:hidden" data-testid="page-nav-mobile-breadcrumb">
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap items-center gap-2 whitespace-nowrap">
            {mobileItems.map((item, idx) => {
              const isLast = idx === mobileItems.length - 1;
              return (
                <span key={`${item.label}-${idx}`} className="contents">
                  <BreadcrumbItem className="min-w-0">
                    {isLast || !item.to ? (
                      <BreadcrumbPage className="inline-flex min-w-0 max-w-[190px] items-center rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-sm font-medium text-foreground">
                        <span className="block truncate">{item.label}</span>
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild className="inline-flex min-w-0 max-w-[132px] items-center rounded-md border border-border bg-card px-2 py-1 text-sm font-medium text-muted-foreground hover:border-border-emphasis hover:bg-accent hover:text-foreground">
                        <Link to={item.to} state={item.state as object | undefined}>
                          <span className="block truncate">{item.label}</span>
                        </Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator className="text-muted-foreground/70" />}
                </span>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="hidden min-w-0 flex-1 overflow-x-auto scrollbar-hide sm:block" data-testid="page-nav-desktop-breadcrumb">
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap items-center gap-1 whitespace-nowrap sm:gap-2.5">
            {items.map((item, idx) => {
              const isLast = idx === items.length - 1;
              const isFirst = idx === 0;
              return (
                <span key={`${item.label}-${idx}`} className="contents">
                  <BreadcrumbItem className="min-w-0">
                    {isLast || !item.to ? (
                      <BreadcrumbPage className={breadcrumbPageClass(isFirst)}>
                        {isFirst && (
                          <span className="hidden h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border-strong bg-muted text-muted-foreground sm:inline-flex">
                            <Layers3 className="h-2.5 w-2.5" />
                          </span>
                        )}
                        <span className="block max-w-[160px] truncate sm:max-w-[220px] md:max-w-[320px]">{item.label}</span>
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild className={breadcrumbLinkClass(isFirst)}>
                        <Link to={item.to} state={item.state as object | undefined}>
                          {isFirst && (
                            <span className="hidden h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border-strong bg-muted text-muted-foreground sm:inline-flex">
                              <Layers3 className="h-2.5 w-2.5" />
                            </span>
                          )}
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
                </span>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>
  );
}

function breadcrumbLinkClass(isFirst: boolean) {
  return cn(
    "inline-flex min-w-0 max-w-[128px] items-center gap-1 rounded-md px-1 py-0.5 text-muted-foreground transition-colors hover:text-foreground sm:max-w-[200px] sm:gap-1.5 sm:border sm:border-border sm:bg-card sm:px-2 sm:py-1 sm:hover:border-border-emphasis sm:hover:bg-accent sm:hover:text-foreground md:max-w-[260px]",
    isFirst && "font-medium",
  );
}

function breadcrumbPageClass(isFirst: boolean) {
  return cn(
    "inline-flex min-w-0 max-w-[140px] items-center gap-1 rounded-md px-1 py-0.5 font-medium text-foreground sm:max-w-[220px] sm:gap-1.5 sm:border sm:border-primary/30 sm:bg-primary/10 sm:px-2 sm:py-1 sm:shadow-glow md:max-w-[320px]",
    isFirst && "sm:pl-2",
  );
}
