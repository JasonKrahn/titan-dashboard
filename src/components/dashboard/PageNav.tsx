import { ArrowLeft } from "lucide-react";
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
  items: PageNavItem[];
  className?: string;
}

export function PageNav({ backFallback, items, className }: PageNavProps) {
  const navigate = useNavigate();

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
        "flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3",
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleBack}
        className="-ml-2 self-start text-muted-foreground hover:text-foreground sm:self-auto"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back
      </Button>
      <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />
      <div className="-mx-3 overflow-x-auto px-3 scrollbar-hide sm:mx-0 sm:overflow-visible sm:px-0">
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap whitespace-nowrap">
            {items.map((item, idx) => {
              const isLast = idx === items.length - 1;
              return (
                <span key={`${item.label}-${idx}`} className="contents">
                  <BreadcrumbItem className="min-w-0">
                    {isLast || !item.to ? (
                      <BreadcrumbPage className="block max-w-[160px] truncate sm:max-w-[220px] md:max-w-[320px]">
                        {item.label}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild className="block max-w-[140px] truncate sm:max-w-[200px] md:max-w-[260px]">
                        <Link to={item.to} state={item.state as object | undefined}>
                          {item.label}
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
