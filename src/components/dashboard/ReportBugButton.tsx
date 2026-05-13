import { useEffect, useMemo, useState } from "react";
import { Bug, CheckCircle2, Send } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { matchPath, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getCurrentUser } from "@/lib/api";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

interface RuntimeSignal {
  message: string;
  source: string;
  occurredAt: string;
}

interface BugReportContext {
  routeLabel: string;
  path: string;
  search: string;
  hash: string;
  url: string;
  title: string;
  reportedAt: string;
  user?: Pick<User, "id" | "fullName" | "email" | "role">;
  viewport: string;
  online: boolean;
  activeElement: string;
  lastRuntimeSignal?: RuntimeSignal;
  userAgent: string;
}

interface BugReportPayload {
  issue: string;
  context: BugReportContext;
}

const routePatterns = [
  { pattern: "/", label: "All Projects" },
  { pattern: "/project/:id", label: "Project detail" },
  { pattern: "/project/:projectId/phase/:phaseId", label: "Phase detail" },
  { pattern: "/subs", label: "Subcontractor Rolodex" },
  { pattern: "/organization", label: "Organization Members" },
  { pattern: "/activity", label: "Activity Log" },
  { pattern: "/command", label: "Admin Overview" },
  { pattern: "/archive", label: "Archive" },
  { pattern: "/inventory", label: "Inventory Tracker" },
];

const getRouteLabel = (pathname: string) => {
  const route = routePatterns.find((entry) => matchPath({ path: entry.pattern, end: true }, pathname));
  return route?.label ?? "Unknown screen";
};

const describeElement = (element: Element | null) => {
  if (!(element instanceof HTMLElement)) return "None";

  const label = element.getAttribute("aria-label")
    ?? element.getAttribute("placeholder")
    ?? element.innerText?.trim()
    ?? element.getAttribute("name")
    ?? element.id
    ?? element.tagName.toLowerCase();

  return `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}${label ? ` — ${label.slice(0, 80)}` : ""}`;
};

const getViewport = () => {
  if (typeof window === "undefined") return "Unknown";
  return `${window.innerWidth}×${window.innerHeight} @${window.devicePixelRatio || 1}x`;
};

const buildBugReportContext = (input: {
  location: ReturnType<typeof useLocation>;
  user?: User;
  lastRuntimeSignal?: RuntimeSignal;
}): BugReportContext => {
  const { location, user, lastRuntimeSignal } = input;
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  return {
    routeLabel: getRouteLabel(location.pathname),
    path: location.pathname,
    search: location.search,
    hash: location.hash,
    url: `${origin}${location.pathname}${location.search}${location.hash}`,
    title: typeof document === "undefined" ? "Titan PM" : document.title,
    reportedAt: new Date().toISOString(),
    user: user ? { id: user.id, fullName: user.fullName, email: user.email, role: user.role } : undefined,
    viewport: getViewport(),
    online: typeof navigator === "undefined" ? true : navigator.onLine,
    activeElement: typeof document === "undefined" ? "None" : describeElement(document.activeElement),
    lastRuntimeSignal,
    userAgent: typeof navigator === "undefined" ? "Unknown" : navigator.userAgent,
  };
};

export function ReportBugButton() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [issue, setIssue] = useState("");
  const [context, setContext] = useState<BugReportContext | null>(null);
  const [lastRuntimeSignal, setLastRuntimeSignal] = useState<RuntimeSignal | undefined>();
  const meQ = useQuery({ queryKey: ["me"], queryFn: getCurrentUser });
  const currentUser = meQ.data?.ok ? meQ.data.data : undefined;

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setLastRuntimeSignal({
        message: event.message || "Unhandled browser error",
        source: event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : "window.error",
        occurredAt: new Date().toISOString(),
      });
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason instanceof Error ? event.reason.message : String(event.reason ?? "Unhandled promise rejection");
      setLastRuntimeSignal({
        message: reason,
        source: "window.unhandledrejection",
        occurredAt: new Date().toISOString(),
      });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  const draftContext = useMemo(
    () => buildBugReportContext({ location, user: currentUser, lastRuntimeSignal }),
    [currentUser, lastRuntimeSignal, location],
  );

  useEffect(() => {
    if (open) {
      setContext(draftContext);
    }
  }, [draftContext, open]);

  const handleOpen = () => {
    setContext(draftContext);
    setOpen(true);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setIssue("");
    }
  };

  const handleSubmit = () => {
    const payload: BugReportPayload = {
      issue: issue.trim(),
      context: context ?? draftContext,
    };

    console.info("Demo bug report", payload);
    toast.success("Bug report sent", {
      description: "Thanks — the demo report details were captured.",
    });
    setIssue("");
    setOpen(false);
  };

  const visibleContext = context ?? draftContext;
  const canSend = issue.trim().length > 0;

  return (
    <>
      <Button
        type="button"
        size="sm"
        onClick={handleOpen}
        className="fixed bottom-[calc(max(1rem,env(safe-area-inset-bottom))+4rem)] left-4 z-40 h-11 rounded-full border border-primary/40 bg-background/95 px-3 text-foreground shadow-glow backdrop-blur transition hover:bg-primary hover:text-primary-foreground md:bottom-[max(1rem,env(safe-area-inset-bottom))] md:px-4"
        aria-label="Report a bug"
      >
        <Bug className="h-4 w-4" />
        <span className="hidden sm:inline">Report Bug</span>
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-icon-warning-border bg-icon-warning text-icon-warning-foreground">
                <Bug className="h-4 w-4" />
              </span>
              Report a bug
            </DialogTitle>
            <DialogDescription>
              Tell us what went wrong. Titan PM will attach demo context about this screen, user, device, and recent app signals.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bug-report-issue">Bug or issue</Label>
              <Textarea
                id="bug-report-issue"
                value={issue}
                onChange={(event) => setIssue(event.target.value)}
                placeholder="What happened? What did you expect instead?"
                className="min-h-32 resize-none"
              />
            </div>

            <div className="rounded-xl border border-border bg-surface-inset p-3">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <CheckCircle2 className="h-4 w-4 text-icon-success-foreground" />
                Attached demo context
              </div>
              <dl className="grid gap-2 text-xs sm:grid-cols-2">
                <ContextItem label="Screen" value={visibleContext.routeLabel} />
                <ContextItem label="Path" value={`${visibleContext.path}${visibleContext.search}${visibleContext.hash}`} />
                <ContextItem label="User" value={visibleContext.user ? `${visibleContext.user.fullName} · ${visibleContext.user.role}` : "Unknown user"} />
                <ContextItem label="Viewport" value={visibleContext.viewport} />
                <ContextItem label="Network" value={visibleContext.online ? "Online" : "Offline"} />
                <ContextItem label="Focused element" value={visibleContext.activeElement} />
              </dl>
              {visibleContext.lastRuntimeSignal && (
                <div className="mt-3 rounded-lg border border-icon-danger-border bg-icon-danger p-2 text-xs text-icon-danger-foreground">
                  Recent app signal: {visibleContext.lastRuntimeSignal.message}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={!canSend}>
              <Send className="h-4 w-4" />
              Send report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ContextItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("truncate font-medium text-foreground", label === "Focused element" && "normal-case")}>{value}</dd>
    </div>
  );
}
