import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Bell, ChevronDown, FileText, Package, Radar, Settings, UserCog, Users } from "lucide-react";
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
import { getCurrentUser, getNotifications, getUsers, markNotificationRead, setCurrentUser } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { AppNotification, User } from "@/lib/types";

const adminToolsMenuContentClass = "min-w-[13.5rem] p-1.5";
const adminToolsMenuItemClass = "min-h-10 gap-2.5 rounded-md px-3 py-2 leading-5";

export type AppHeaderSection = "clients" | "dashboard" | "subs" | "activity" | "command" | "organization" | "archive" | "inventory";
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
  const notificationsQ = useQuery({
    queryKey: ["notifications", resolvedUser?.id],
    queryFn: getNotifications,
    enabled: resolvedUser?.role === "project_manager",
  });
  const notifications = notificationsQ.data?.ok ? notificationsQ.data.data : [];

  const section = activeSection ?? sectionFromPath(location.pathname);
  const isAdmin = resolvedUser?.role === "admin";
  const showAdminOverview = resolvedUser?.adminOverviewEnabled === true;
  const adminToolsActive = (showAdminOverview && section === "command") || section === "activity" || section === "organization" || section === "inventory";

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

  const markNotificationMutation = useMutation({ mutationFn: markNotificationRead });

  const handleNotificationClick = async (notification: AppNotification) => {
    const res = await markNotificationMutation.mutateAsync(notification.id);
    if (res.ok === false) {
      toast.error(res.error.message);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["notifications"] });
    await qc.invalidateQueries({ queryKey: ["inventory-audit-requests"] });
    navigate(`/project/${notification.projectId}`);
  };

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container">
        <div className="flex h-16 items-center gap-3">
          <button
            type="button"
            onClick={() => me?.role === "inventory_viewer" ? navigate("/inventory") : (me?.role === "project_manager" ? goToDashboardView("dashboard") : goToDashboardView("clients"))}
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
            {me?.role === "inventory_viewer" ? (
              <Link to="/inventory" className={dashboardNavClass(section === "inventory")}>
                <Package className="h-4 w-4" />
                Inventory
              </Link>
            ) : (
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
            )}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className={topNavClass(adminToolsActive)}>
                    Admin Tools
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className={adminToolsMenuContentClass}>
                  <DropdownMenuItem asChild className={adminToolsMenuItemClass}>
                    <Link to="/inventory">
                      <Package className="h-4 w-4" />
                      Inventory
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className={adminToolsMenuItemClass}>
                    <Link to="/organization">
                      <UserCog className="h-4 w-4" />
                      Organization Members
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className={adminToolsMenuItemClass}>
                    <Link to="/activity">
                      <FileText className="h-4 w-4" />
                      Activity
                    </Link>
                  </DropdownMenuItem>
                  {showAdminOverview && (
                    <DropdownMenuItem asChild className={adminToolsMenuItemClass}>
                      <Link to="/command">
                        <Radar className="h-4 w-4" />
                        Admin Overview
                      </Link>
                    </DropdownMenuItem>
                  )}
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
            {resolvedUser?.role === "project_manager" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-card transition-colors hover:bg-accent hover:text-foreground"
                    aria-label="Notifications"
                  >
                    <Bell className="h-4 w-4" />
                    {notifications.length > 0 && (
                      <span
                        aria-hidden="true"
                        data-testid="notification-unread-marker"
                        className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background"
                      />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[16rem] p-3">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-foreground">Notifications</div>
                    {notifications.length > 0 ? (
                      <div className="space-y-1">
                        {notifications.map((notification) => (
                          <button
                            key={notification.id}
                            type="button"
                            className="w-full rounded-md px-2 py-2 text-left text-sm leading-snug text-foreground transition-colors hover:bg-accent"
                            onClick={() => handleNotificationClick(notification)}
                          >
                            {notification.message}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No notifications yet.</div>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
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

        <nav className="overflow-hidden border-t border-border/60 py-2 lg:hidden">
          <div className="-mx-3 flex max-w-[calc(100%+1.5rem)] items-center gap-1.5 overflow-x-auto px-3 pb-1 scrollbar-hide snap-x">
            {me?.role === "inventory_viewer" ? (
              <Link
                to="/inventory"
                className={mobileDashboardNavClass(section === "inventory")}
              >
                <Package className="h-4 w-4" />
                Inventory
              </Link>
            ) : (
              <>
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
              </>
            )}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className={mobileTopNavClass(adminToolsActive)}>
                    Admin Tools
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className={adminToolsMenuContentClass}>
                  <DropdownMenuItem asChild className={adminToolsMenuItemClass}>
                    <Link to="/inventory">
                      <Package className="h-4 w-4" />
                      Inventory
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className={adminToolsMenuItemClass}>
                    <Link to="/organization">
                      <UserCog className="h-4 w-4" />
                      Members
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className={adminToolsMenuItemClass}>
                    <Link to="/activity">
                      <FileText className="h-4 w-4" />
                      Activity
                    </Link>
                  </DropdownMenuItem>
                  {showAdminOverview && (
                    <DropdownMenuItem asChild className={adminToolsMenuItemClass}>
                      <Link to="/command">
                        <Radar className="h-4 w-4" />
                        Admin Overview
                      </Link>
                    </DropdownMenuItem>
                  )}
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
  if (pathname.startsWith("/inventory")) return "inventory";
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
