import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, MoreHorizontal, Pencil, Phone, Plus, Search, ShieldCheck, Trash2, UserCog } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { IconWell } from "@/components/ui/icon-well";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createUser, deactivateUser, getCurrentUser, getProjects, getUsers, updateUser, type CreateUserInput, type UpdateUserInput } from "@/lib/api";
import type { Project, User, UserRole } from "@/lib/types";
import { useTypeToSearch } from "@/hooks/useTypeToSearch";

type RoleFilter = "all" | "admin" | "project_manager" | "inventory_viewer" | "inactive";

interface MemberFormState {
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
}

const EMPTY_FORM: MemberFormState = {
  fullName: "",
  email: "",
  phone: "",
  role: "project_manager",
};

function roleLabel(role: UserRole) {
  if (role === "admin") return "Admin";
  if (role === "inventory_viewer") return "Inventory Viewer";
  return "Project Manager";
}

function activeProjectCount(user: User, projects: Project[]) {
  if (user.role !== "project_manager") return 0;
  return projects.filter(
    (project) =>
      project.assignedProjectManagerId === user.id &&
      project.status !== "completed" &&
      project.status !== "archived",
  ).length;
}

function formFromUser(user: User): MemberFormState {
  return {
    fullName: user.fullName,
    email: user.email,
    phone: user.phone ?? "",
    role: user.role,
  };
}

function emptyForm() {
  return { ...EMPTY_FORM };
}

export default function OrganizationMembersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useTypeToSearch({
    searchInputRef,
    search,
    onSearchChange: setSearch,
  });

  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [form, setForm] = useState<MemberFormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [removeTarget, setRemoveTarget] = useState<User | null>(null);
  const [mobileActionUserId, setMobileActionUserId] = useState<string | null>(null);

  const meQ = useQuery({ queryKey: ["me"], queryFn: getCurrentUser });
  const usersQ = useQuery({ queryKey: ["users"], queryFn: getUsers });
  const projectsQ = useQuery({ queryKey: ["projects", "organization-members"], queryFn: () => getProjects() });

  const me = meQ.data?.ok ? meQ.data.data : undefined;
  const users = useMemo(() => (usersQ.data?.ok ? usersQ.data.data : []), [usersQ.data]);
  const projects = useMemo(() => (projectsQ.data?.ok ? projectsQ.data.data : []), [projectsQ.data]);

  const activeAdmins = users.filter((user) => user.role === "admin" && user.active);

  const memberRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users
      .filter((user) => {
        if (roleFilter === "inactive") return !user.active;
        if (roleFilter !== "all" && user.role !== roleFilter) return false;
        return true;
      })
      .filter((user) => {
        if (!term) return true;
        return [user.fullName, user.email, user.phone ?? "", roleLabel(user.role)]
          .some((value) => value.toLowerCase().includes(term));
      })
      .sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        if (a.role !== b.role) return a.role === "admin" ? -1 : 1;
        return a.fullName.localeCompare(b.fullName);
      });
  }, [roleFilter, search, users]);

  const mobileActionUser = memberRows.find((user) => user.id === mobileActionUserId);

  const resetForm = () => {
    setForm(emptyForm());
    setErrors({});
  };

  const invalidateMembers = () => {
    queryClient.invalidateQueries({ queryKey: ["users"] });
    queryClient.invalidateQueries({ queryKey: ["me"] });
    queryClient.invalidateQueries({ queryKey: ["audit"] });
  };

  const createMutation = useMutation({
    mutationFn: (input: CreateUserInput) => createUser(input),
    onSuccess: (result) => {
      if (!result.ok) {
        setErrors(result.error.fieldErrors ?? {});
        toast.error(result.error.message);
        return;
      }
      invalidateMembers();
      setAddOpen(false);
      resetForm();
      toast.success("Member added");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) => updateUser(id, input),
    onSuccess: (result) => {
      if (!result.ok) {
        setErrors(result.error.fieldErrors ?? {});
        toast.error(result.error.message);
        return;
      }
      invalidateMembers();
      setEditingUser(null);
      resetForm();
      toast.success("Member updated");
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => deactivateUser(id),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      invalidateMembers();
      setRemoveTarget(null);
      toast.success("Member removed");
    },
  });

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.fullName.trim()) nextErrors.fullName = "Required";
    if (!form.email.trim()) nextErrors.email = "Required";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const canRemove = (user: User) => {
    if (!user.active) return false;
    if (user.id === me?.id) return false;
    if (user.role === "admin" && activeAdmins.length <= 1) return false;
    if (activeProjectCount(user, projects) > 0) return false;
    return true;
  };

  const removalReason = (user: User) => {
    const assignmentCount = activeProjectCount(user, projects);
    if (!user.active) return "Already inactive";
    if (user.id === me?.id) return "You cannot remove your own admin account";
    if (user.role === "admin" && activeAdmins.length <= 1) return "At least one active admin is required";
    if (assignmentCount > 0) return `Reassign ${assignmentCount} active project${assignmentCount === 1 ? "" : "s"} first`;
    return "Deactivate this member";
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setForm(formFromUser(user));
    setErrors({});
  };

  const submitForm = (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;

    const input = {
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      role: form.role,
    };

    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, input });
      return;
    }

    createMutation.mutate(input);
  };

  if (meQ.isLoading || usersQ.isLoading || projectsQ.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader activeSection="organization" />
        <main className="container py-6 space-y-5">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  if (!me || me.role !== "admin") {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader activeSection="organization" />
        <main className="container py-6">
          <div className="rounded-md border border-border bg-surface-panel p-10 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-status-attention" aria-hidden />
            <h1 className="mt-3 text-lg font-semibold">Admin only</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Organization member management is limited to admins.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (usersQ.data?.ok === false || projectsQ.data?.ok === false) {
    const error = usersQ.data?.ok === false ? usersQ.data.error : projectsQ.data?.ok === false ? projectsQ.data.error : undefined;
    return (
      <div className="min-h-screen bg-background">
        <AppHeader activeSection="organization" />
        <main className="container py-6">
          <Alert variant="destructive">
            <AlertTitle>Couldn't load organization members</AlertTitle>
            <AlertDescription>{error?.message ?? "Unknown error"}</AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader activeSection="organization" />
      <main className="container py-6 space-y-5">
        <section className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Organization Members</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage Titan admins, project managers, and inventory viewers.</p>
          </div>
          <Button onClick={() => { resetForm(); setAddOpen(true); }}>
            <Plus className="h-4 w-4" />
            Add member
          </Button>
        </section>

        <Card surface="panel" className="p-3">
          <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_190px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                id="organization-member-search"
                name="organizationMemberSearch"
                aria-label="Search organization members"
                placeholder="Search name, email, or phone..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="bg-background/60 pl-9"
              />
            </div>
            <select
              id="organization-role-filter"
              name="organizationRoleFilter"
              aria-label="Filter by role"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
              className="h-10 rounded-md border border-input bg-background px-3 text-base md:text-sm"
            >
              <option value="all">All members</option>
              <option value="admin">Admins</option>
              <option value="project_manager">Project Managers</option>
              <option value="inventory_viewer">Inventory Viewers</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </Card>

        {memberRows.length === 0 ? (
          <Card surface="panel" className="p-8 text-center">
            <h2 className="font-semibold">No members found</h2>
            <p className="mt-1 text-sm text-muted-foreground">Try a different search or role filter.</p>
          </Card>
        ) : (
          <Card surface="panel" className="divide-y divide-border/70">
            {memberRows.map((user) => {
              const assignmentCount = activeProjectCount(user, projects);
              return (
                <div key={user.id} data-testid={`member-row-${user.id}`} className="flex items-center gap-3 p-4">
                  <IconWell tone={user.role === "admin" ? "primary" : "muted"} size="lg" shape="pill" className="shrink-0">
                    {user.role === "admin" ? <ShieldCheck className="h-4 w-4" /> : <UserCog className="h-4 w-4" />}
                  </IconWell>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-sm font-semibold">{user.fullName}</h2>
                      <Badge tone={user.active ? "success" : "neutral"} appearance="soft" size="xs" dot>
                        {user.active ? "Active" : "Inactive"}
                      </Badge>
                      <Badge tone={user.role === "admin" ? "accent" : "info"} appearance="outline" size="xs">
                        {roleLabel(user.role)}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{user.email}</span>
                      {user.phone && <span>{user.phone}</span>}
                      {user.role === "project_manager" && (
                        <span>{assignmentCount} active project{assignmentCount === 1 ? "" : "s"}</span>
                      )}
                    </div>
                  </div>
                  <div className="hidden shrink-0 items-center gap-1 md:flex">
                    {user.phone && (
                      <Button asChild variant="ghost" size="icon" className="h-9 w-9">
                        <a href={`tel:${user.phone}`} aria-label={`Call ${user.fullName}`}>
                          <Phone className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button asChild variant="ghost" size="icon" className="h-9 w-9">
                      <a href={`mailto:${user.email}`} aria-label={`Email ${user.fullName}`}>
                        <Mail className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={`Edit ${user.fullName}`} onClick={() => openEdit(user)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-destructive hover:text-destructive"
                      aria-label={`Remove ${user.fullName}`}
                      title={removalReason(user)}
                      disabled={!canRemove(user)}
                      onClick={() => setRemoveTarget(user)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 shrink-0 md:hidden"
                    aria-label={`Actions for ${user.fullName}`}
                    onClick={() => setMobileActionUserId(user.id)}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </Card>
        )}
      </main>

      <BottomSheet open={!!mobileActionUser} onOpenChange={(open) => { if (!open) setMobileActionUserId(null); }} title={mobileActionUser?.fullName}>
        {mobileActionUser && (
          <div className="grid gap-2">
            <Button asChild variant="outline" className="justify-start">
              <a href={`mailto:${mobileActionUser.email}`}>
                <Mail className="h-4 w-4" />
                Email {mobileActionUser.email}
              </a>
            </Button>
            {mobileActionUser.phone && (
              <Button asChild variant="outline" className="justify-start">
                <a href={`tel:${mobileActionUser.phone}`}>
                  <Phone className="h-4 w-4" />
                  Call {mobileActionUser.phone}
                </a>
              </Button>
            )}
            <Button type="button" variant="outline" className="justify-start" onClick={() => { setMobileActionUserId(null); openEdit(mobileActionUser); }}>
              <Pencil className="h-4 w-4" />
              Edit member
            </Button>
            <Button
              type="button"
              variant="outline"
              className="justify-start text-destructive hover:text-destructive"
              disabled={!canRemove(mobileActionUser)}
              title={removalReason(mobileActionUser)}
              onClick={() => {
                setMobileActionUserId(null);
                setRemoveTarget(mobileActionUser);
              }}
            >
              <Trash2 className="h-4 w-4" />
              Remove member
            </Button>
          </div>
        )}
      </BottomSheet>

      <MemberDialog
        open={addOpen || !!editingUser}
        title={editingUser ? "Edit Member" : "Add Member"}
        form={form}
        errors={errors}
        pending={createMutation.isPending || updateMutation.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setAddOpen(false);
            setEditingUser(null);
            resetForm();
          }
        }}
        onChange={setForm}
        onSubmit={submitForm}
      />

      <Dialog open={!!removeTarget} onOpenChange={(open) => { if (!open) setRemoveTarget(null); }}>
        <DialogContent className="md:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Deactivate this member while keeping their audit history intact.
            </DialogDescription>
          </DialogHeader>
          {removeTarget && (
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                Remove <strong>{removeTarget.fullName}</strong> from active organization access?
              </p>
              <p className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                This deactivates the member and keeps their audit history intact.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!removeTarget || deactivateMutation.isPending}
              onClick={() => removeTarget && deactivateMutation.mutate(removeTarget.id)}
            >
              {deactivateMutation.isPending ? "Removing..." : "Remove member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MemberDialog({
  open,
  title,
  form,
  errors,
  pending,
  onOpenChange,
  onChange,
  onSubmit,
}: {
  open: boolean;
  title: string;
  form: MemberFormState;
  errors: Record<string, string>;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (form: MemberFormState) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Add or update a Titan team member's profile and access role.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="member-full-name">Full name *</Label>
            <Input
              id="member-full-name"
              name="fullName"
              value={form.fullName}
              onChange={(event) => onChange({ ...form, fullName: event.target.value })}
              placeholder="e.g. Morgan Lee"
            />
            {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="member-email">Email *</Label>
            <Input
              id="member-email"
              name="email"
              type="email"
              value={form.email}
              onChange={(event) => onChange({ ...form, email: event.target.value })}
              placeholder="name@titanpm.io"
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="member-phone">Phone</Label>
              <Input
                id="member-phone"
                name="phone"
                value={form.phone}
                onChange={(event) => onChange({ ...form, phone: event.target.value })}
                placeholder="555-0100"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="member-role">Role *</Label>
              <select
                id="member-role"
                name="role"
                value={form.role}
                onChange={(event) => onChange({ ...form, role: event.target.value as UserRole })}
                className="h-10 rounded-md border border-input bg-background px-3 text-base md:text-sm"
              >
                <option value="project_manager">Project Manager</option>
                <option value="inventory_viewer">Inventory Viewer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
