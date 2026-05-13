import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ChevronDown, FileText, Radar, Settings, UserCog, Users } from "lucide-react";
import { toast } from "sonner";
import { RoleSwitcher } from "@/components/dashboard/RoleSwitcher";
import { SettingsDialog } from "@/components/dashboard/SettingsDialog";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getCurrentUser, getUsers, setCurrentUser } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { User } from "@/lib/types";

export type AppHeaderSection = "clients" | "dashboard" | "subs" | "activity" | "command" | "organization" | "archive";
export type DashboardViewTarget = "clients" | "dashboard";

interface AppHeaderProps {
  activeSection?: AppHeaderSection;
  onSelectDashboardView?: (view: DashboardViewTarget) => void;
  onUserSwitch?: () => void;
  currentUser?: User;
}

export function AppHeader({ activeSection, onSelectDashboardView, onUserSwitch, currentUser }: AppHeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const meQ = useQuery({ queryKey: ["me"], queryFn: getCurrentUser });
  const usersQ = useQuery({ queryKey: ["users"], queryFn: getUsers });

  const me = meQ.data?.ok ? meQ.data.data : undefined;
  const resolvedUser = currentUser ?? me;
  const users = usersQ.data?.ok ? usersQ.data.data : [];
  const activeUsers = users.filter((user) => user.active || user.id === resolvedUser?.id);

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
              <div className="hidden text-[10px] uppercase tracking-widest text-muted-foreground md:block">Operations</div>
            </div>
          </button>

          <div className="hidden min-w-0 flex-1 items-center gap-2 lg:flex">
            <SegmentedControl className="rounded-lg">
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
              <Link
                to="/archive"
                className={dashboardNavClass(section === "archive")}
              >
                Archive
              </Link>
            </SegmentedControl>
            {me?.role === "admin" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className={topNavClass(section === "command" || section === "activity" || section === "organization")}>
                    Admin Tools
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem asChild>
                    <Link to="/organization">
                      <UserCog className="h-4 w-4" />
                      Organization Members
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/activity">
                      <FileText className="h-4 w-4" />
                      Activity
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/command">
                      <Radar className="h-4 w-4" />
                      Admin Overview
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {(me?.role === "admin" || me?.role === "project_manager") && (
              <Link
                to="/subs"
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium text-muted-foreground shadow-card transition-colors hover:bg-accent hover:text-foreground",
                  section === "subs" && "border-primary/60 bg-primary text-primary-foreground shadow-glow"
                )}
              >
                <Users className="h-4 w-4" />
                <span className="hidden md:inline">Subcontractors</span>
              </Link>
            )}
            {resolvedUser && <RoleSwitcher current={resolvedUser} users={activeUsers} onSwitch={handleSwitchUser} />}
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              disabled={!resolvedUser}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-card transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>

        <nav className="border-t border-border/60 py-2 lg:hidden">
          <div className="-mx-3 flex items-center gap-1.5 overflow-x-auto px-3 pb-1 scrollbar-hide snap-x">
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
            <Link
              to="/archive"
              className={mobileDashboardNavClass(section === "archive")}
            >
              <Archive className="h-4 w-4" />
              Archive
            </Link>
            {me?.role === "admin" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className={mobileTopNavClass(section === "command" || section === "activity" || section === "organization")}>
                    Admin Tools
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem asChild>
                    <Link to="/organization">
                      <UserCog className="h-4 w-4" />
                      Members
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/activity">
                      <FileText className="h-4 w-4" />
                      Activity
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/command">
                      <Radar className="h-4 w-4" />
                      Admin Overview
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {(me?.role === "admin" || me?.role === "project_manager") && (
              <Link
                to="/subs"
                className={cn(
                  "inline-flex h-10 shrink-0 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium text-muted-foreground shadow-card transition-colors hover:bg-accent hover:text-foreground",
                  section === "subs" && "border-primary/60 bg-primary text-primary-foreground shadow-glow"
                )}
              >
                <Users className="h-4 w-4" />
                Subs
              </Link>
            )}
          </div>
        </nav>
      </div>

      {resolvedUser && (
        <SettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          user={resolvedUser}
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
  if (pathname.startsWith("/command")) return "command";
  if (pathname.startsWith("/organization")) return "organization";
  if (pathname.startsWith("/archive")) return "archive";
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
