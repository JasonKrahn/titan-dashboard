import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Settings, Users } from "lucide-react";
import { toast } from "sonner";
import { RoleSwitcher } from "@/components/dashboard/RoleSwitcher";
import { SettingsDialog } from "@/components/dashboard/SettingsDialog";
import { getCurrentUser, getUsers, setCurrentUser } from "@/lib/api";
import { cn } from "@/lib/utils";

export type AppHeaderSection = "clients" | "dashboard" | "subs" | "activity";
export type DashboardViewTarget = "clients" | "dashboard";

interface AppHeaderProps {
  activeSection?: AppHeaderSection;
  onSelectDashboardView?: (view: DashboardViewTarget) => void;
  onUserSwitch?: () => void;
}

export function AppHeader({ activeSection, onSelectDashboardView, onUserSwitch }: AppHeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const meQ = useQuery({ queryKey: ["me"], queryFn: getCurrentUser });
  const usersQ = useQuery({ queryKey: ["users"], queryFn: getUsers });

  const me = meQ.data?.ok ? meQ.data.data : undefined;
  const users = usersQ.data?.ok ? usersQ.data.data : [];

  const section = activeSection ?? sectionFromPath(location.pathname);

  const goToDashboardView = (view: DashboardViewTarget) => {
    if (location.pathname === "/" && onSelectDashboardView) {
      onSelectDashboardView(view);
      return;
    }
    navigate("/", { state: { view } });
  };

  const handleSwitchUser = (userId: string) => {
    setCurrentUser(userId);
    onUserSwitch?.();
    qc.invalidateQueries();
    toast.success("Switched user");
  };

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container">
        <div className="flex h-16 items-center gap-3">
          <button
            type="button"
            onClick={() => goToDashboardView("clients")}
            className="flex shrink-0 cursor-pointer items-center gap-3 transition-opacity hover:opacity-80"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
              <span className="text-lg font-bold leading-none text-primary-foreground">T</span>
            </div>
            <div>
              <div className="font-bold leading-tight tracking-tight">Titan PM</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Operations</div>
            </div>
          </button>

          <div className="hidden min-w-0 flex-1 items-center gap-2 lg:flex">
            <div className="inline-flex w-fit rounded-lg border border-border bg-card p-1 shadow-card">
              <button
                type="button"
                onClick={() => goToDashboardView("clients")}
                className={dashboardNavClass(section === "clients")}
              >
                Clients
              </button>
              <button
                type="button"
                onClick={() => goToDashboardView("dashboard")}
                className={dashboardNavClass(section === "dashboard")}
              >
                All Projects
              </button>
            </div>
            <Link to="/subs" className={topNavClass(section === "subs")}>
              <Users className="h-4 w-4" />
              Subcontractor Rolodex
            </Link>
            <Link to="/activity" className={topNavClass(section === "activity")}>
              <FileText className="h-4 w-4" />
              Activity
            </Link>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {me && <RoleSwitcher current={me} users={users} onSwitch={handleSwitchUser} />}
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              disabled={!me}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-card transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>

        <nav className="border-t border-border/60 py-2 lg:hidden">
          <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => goToDashboardView("clients")}
              className={mobileDashboardNavClass(section === "clients")}
            >
              Clients
            </button>
            <button
              type="button"
              onClick={() => goToDashboardView("dashboard")}
              className={mobileDashboardNavClass(section === "dashboard")}
            >
              All Projects
            </button>
            <Link to="/subs" className={mobileTopNavClass(section === "subs")}>
              <Users className="h-4 w-4" />
              Subcontractor Rolodex
            </Link>
            <Link to="/activity" className={mobileTopNavClass(section === "activity")}>
              <FileText className="h-4 w-4" />
              Activity
            </Link>
          </div>
        </nav>
      </div>

      {me && (
        <SettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          user={me}
          onUpdated={() => {
            // SettingsDialog handles query invalidation for changed user data.
          }}
        />
      )}
    </header>
  );
}

function sectionFromPath(pathname: string): AppHeaderSection {
  if (pathname.startsWith("/subs")) return "subs";
  if (pathname.startsWith("/activity")) return "activity";
  if (pathname === "/") return "clients";
  return "dashboard";
}

function dashboardNavClass(active: boolean) {
  return cn(
    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
  );
}

function topNavClass(active: boolean) {
  return cn(
    "inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-md border px-3 text-sm font-medium shadow-card transition-colors",
    active
      ? "border-primary/60 bg-primary text-primary-foreground shadow-glow"
      : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
  );
}

function mobileDashboardNavClass(active: boolean) {
  return cn(
    "inline-flex h-10 shrink-0 items-center whitespace-nowrap rounded-md border px-3 text-sm font-medium transition-colors",
    active
      ? "border-primary/60 bg-primary text-primary-foreground shadow-glow"
      : "border-border bg-card text-muted-foreground shadow-card hover:bg-accent hover:text-foreground",
  );
}

function mobileTopNavClass(active: boolean) {
  return cn(
    "inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-md border px-3 text-sm font-medium transition-colors",
    active
      ? "border-primary/60 bg-primary text-primary-foreground shadow-glow"
      : "border-border bg-card text-muted-foreground shadow-card hover:bg-accent hover:text-foreground",
  );
}
