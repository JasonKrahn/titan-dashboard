import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpRight, Building2, Grid2X2, List, Mail, MoreHorizontal, Phone, Pencil, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Card } from "@/components/ui/card";
import { IconWell } from "@/components/ui/icon-well";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ClientRecord, Project } from "@/lib/types";
import { relativeTime } from "@/lib/derived";
import { cn } from "@/lib/utils";
import { buildClientRows, type ClientSortKey, type ClientSortState } from "./ClientDirectoryRows";

interface ClientDirectoryProps {
  clients: ClientRecord[];
  projects: Project[];
  loading?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onOpenClient?: (id: string) => void;
  onEditClient?: (id: string) => void;
  onNewClient?: () => void;
  isAdmin?: boolean;
}

const sortLabels: Record<ClientSortKey, string> = {
  client: "Client",
  contact: "Contact",
  active: "Active",
  total: "Total",
};

function SortButton({
  sortKey,
  sort,
  onSort,
  children,
}: {
  sortKey: ClientSortKey;
  sort: ClientSortState;
  onSort: (key: ClientSortKey) => void;
  children: ReactNode;
}) {
  const active = sort.key === sortKey;
  const Icon = active && sort.direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1 rounded-sm text-left font-medium transition-colors hover:text-foreground",
        active ? "text-foreground" : "text-muted-foreground",
      )}
      aria-label={`Sort by ${sortLabels[sortKey]}`}
      onClick={() => onSort(sortKey)}
    >
      {children}
      <Icon className={cn("h-3.5 w-3.5", !active && "opacity-40")} />
    </button>
  );
}

export function ClientDirectory({
  clients,
  projects,
  loading,
  search,
  onSearchChange,
  onOpenClient,
  onEditClient,
  onNewClient,
  isAdmin,
}: ClientDirectoryProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [mobileActionClientId, setMobileActionClientId] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<"list" | "cards">(() => {
    const saved = localStorage.getItem("clientViewMode");
    return saved === "list" || saved === "cards" ? saved : "cards";
  });
  const [sort, setSort] = useState<ClientSortState>({ key: "client", direction: "asc" });
  const rows = useMemo(() => buildClientRows(clients, projects, search, sort), [clients, projects, search, sort]);
  const mobileActionRow = rows.find((row) => row.client.id === mobileActionClientId);

  const handleSort = (key: ClientSortKey) => {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === "active" || key === "total" ? "desc" : "asc" },
    );
  };

  useEffect(() => {
    localStorage.setItem("clientViewMode", displayMode);
  }, [displayMode]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName.toLowerCase();
      const isEditing =
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        tagName === "button" ||
        target?.isContentEditable;

      if (event.key === "Escape" && search) {
        event.preventDefault();
        onSearchChange("");
        searchInputRef.current?.focus();
        return;
      }

      if (isEditing || event.metaKey || event.ctrlKey || event.altKey || event.key.length !== 1) return;

      onSearchChange(search + event.key);
      requestAnimationFrame(() => searchInputRef.current?.focus());
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSearchChange, search]);

  return (
    <section className="space-y-4">
      <div className="space-y-3">
        {isAdmin && onNewClient && (
          <div className="sticky top-[6.75rem] z-10 -mx-1 rounded-lg bg-background/95 px-1 py-1 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:py-0">
            <Button
              size="sm"
              className="h-10 w-full bg-primary text-primary-foreground hover:bg-primary/90 md:w-auto"
              onClick={onNewClient}
            >
              <Plus className="h-4 w-4 mr-1" />
              New client
            </Button>
          </div>
        )}

        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search clients, contacts, email..."
            className="bg-background/60 pl-9"
          />
        </div>

        <div className="hidden md:flex flex-wrap items-center gap-2">
          <SegmentedControl>
            <Button
              type="button"
              variant={displayMode === "list" ? "default" : "ghost"}
              size="sm"
              className="h-8 px-2"
              aria-pressed={displayMode === "list"}
              onClick={() => setDisplayMode("list")}
            >
              <List className="h-4 w-4" />
              List
            </Button>
            <Button
              type="button"
              variant={displayMode === "cards" ? "default" : "ghost"}
              size="sm"
              className="h-8 px-2"
              aria-pressed={displayMode === "cards"}
              onClick={() => setDisplayMode("cards")}
            >
              <Grid2X2 className="h-4 w-4" />
              Cards
            </Button>
          </SegmentedControl>
        </div>
      </div>

      {loading ? (
        displayMode === "list" ? (
          <Card surface="panel" className="p-3">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="mb-2 h-12 animate-pulse rounded-md bg-card/60 last:mb-0" />
            ))}
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <Card key={item} surface="muted" className="h-[210px] animate-pulse" />
            ))}
          </div>
        )
      ) : rows.length === 0 ? (
        <Card surface="panel" className="p-8 text-center">
          <IconWell tone="muted" size="xl" shape="panel" className="mx-auto border-transparent">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </IconWell>
          <h3 className="mt-3 font-semibold">No clients found</h3>
          <p className="mt-1 text-sm text-muted-foreground">Try a different name, contact, phone, or email.</p>
        </Card>
      ) : displayMode === "list" ? (
        <>
        <Card surface="panel" className="hidden md:block">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[58%] md:w-[50%] lg:w-[30%] xl:w-[22%]">
                  <SortButton sortKey="client" sort={sort} onSort={handleSort}>Client</SortButton>
                </TableHead>
                <TableHead className="hidden md:table-cell md:w-[24%] lg:w-[18%] xl:w-[14%]">
                  <SortButton sortKey="contact" sort={sort} onSort={handleSort}>Contact</SortButton>
                </TableHead>
                <TableHead className="hidden lg:table-cell lg:w-[12%] xl:w-[10%]">Phone</TableHead>
                <TableHead className="hidden lg:table-cell lg:w-[20%] xl:w-[18%]">Email</TableHead>
                <TableHead className="w-[21%] text-right md:w-[13%] lg:w-[10%] xl:w-[7%]">
                  <div className="flex justify-end">
                    <SortButton sortKey="active" sort={sort} onSort={handleSort}>Active</SortButton>
                  </div>
                </TableHead>
                <TableHead className="w-[21%] text-right md:w-[13%] lg:w-[10%] xl:w-[7%]">
                  <div className="flex justify-end">
                    <SortButton sortKey="total" sort={sort} onSort={handleSort}>Total</SortButton>
                  </div>
                </TableHead>
                <TableHead className="hidden xl:table-cell xl:w-[22%]">Latest</TableHead>
                <TableHead className="w-[36px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.client.id}
                  className="cursor-pointer"
                  onClick={() => onOpenClient?.(row.client.id)}
                >
                  <TableCell>
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-foreground">{row.client.name}</div>
                      <div className="truncate text-xs text-muted-foreground md:hidden">
                        {row.client.primaryContactName ?? "No primary contact"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden truncate text-muted-foreground md:table-cell">
                    {row.client.primaryContactName ?? "No primary contact"}
                  </TableCell>
                  <TableCell className="hidden truncate text-muted-foreground lg:table-cell">
                    {row.client.phone ?? "-"}
                  </TableCell>
                  <TableCell className="hidden truncate text-muted-foreground lg:table-cell">
                    {row.client.email ?? "-"}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{row.activeProjects}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{row.totalJobs}</TableCell>
                  <TableCell className="hidden truncate text-xs text-muted-foreground xl:table-cell">
                    {row.latestProject
                      ? `${row.latestProject.name} - ${relativeTime(row.latestProject.updatedAt)}`
                      : "No projects yet"}
                  </TableCell>
                  <TableCell className="w-[36px] p-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditClient?.(row.client.id);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
        <ul className="mobile-list md:hidden">
          {rows.map((row) => (
            <li key={row.client.id}>
              <div className="flex items-center gap-2 px-3 py-2.5 active:bg-muted/40">
                <button
                  type="button"
                  onClick={() => onOpenClient?.(row.client.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <IconWell tone="primary" size="md" shape="square">
                    <Building2 className="h-4 w-4" />
                  </IconWell>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{row.client.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {row.client.primaryContactName ?? row.client.phone ?? "No contact"}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums" aria-label={`${row.activeProjects} active projects`}>
                    {row.activeProjects} active
                  </span>
                </button>
                {onEditClient && (
                  <button
                    type="button"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground active:bg-muted/60"
                    aria-label={`Actions for ${row.client.name}`}
                    onClick={() => setMobileActionClientId(row.client.id)}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
        </>
      ) : (
        <>
          {/* Mobile dense list */}
          <ul className="mobile-list md:hidden">
            {rows.map((row) => (
              <li key={row.client.id}>
                <div className="flex items-center gap-2 px-3 py-2.5 active:bg-muted/40">
                  <button
                    type="button"
                    onClick={() => onOpenClient?.(row.client.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <IconWell tone="primary" size="md" shape="square">
                      <Building2 className="h-4 w-4" />
                    </IconWell>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{row.client.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {row.client.primaryContactName ?? row.client.phone ?? "No contact"}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums" aria-label={`${row.activeProjects} active projects`}>
                      {row.activeProjects} active
                    </span>
                  </button>
                  {onEditClient && (
                    <button
                      type="button"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground active:bg-muted/60"
                      aria-label={`Actions for ${row.client.name}`}
                      onClick={() => setMobileActionClientId(row.client.id)}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden md:grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {rows.map((row) => {
            return (
              <Card
                key={row.client.id}
                onClick={() => onOpenClient?.(row.client.id)}
                surface="interactive"
                className="group cursor-pointer p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <IconWell tone="primary" size="lg" shape="panel" className="mb-3">
                      <Building2 className="h-4 w-4" />
                    </IconWell>
                    <h3 className="truncate text-base font-semibold">{row.client.name}</h3>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {row.client.primaryContactName ?? "No primary contact"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditClient?.(row.client.id);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                  {row.client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{row.client.phone}</span>
                    </div>
                  )}
                  {row.client.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5" />
                      <span className="truncate">{row.client.email}</span>
                    </div>
                  )}
                </div>

                <div className="mt-5 border-t border-border/60 pt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Active projects</span>
                    <span className="font-semibold tabular-nums text-foreground">{row.activeProjects}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Total jobs</span>
                    <span className="font-semibold tabular-nums text-foreground">{row.totalJobs}</span>
                  </div>
                  <p className="mt-3 truncate text-[11px] text-muted-foreground">
                    {row.latestProject
                      ? `Latest: ${row.latestProject.name} - ${relativeTime(row.latestProject.updatedAt)}`
                      : "No projects yet"}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
        </>
      )}
      <BottomSheet open={!!mobileActionRow} onOpenChange={(open) => { if (!open) setMobileActionClientId(null); }} title={mobileActionRow?.client.name}>
        {mobileActionRow && (
          <div className="grid gap-2">
            <Button
              type="button"
              variant="outline"
              className="justify-start"
              onClick={() => {
                setMobileActionClientId(null);
                onOpenClient?.(mobileActionRow.client.id);
              }}
            >
              Open client
            </Button>
            {onEditClient && (
              <Button
                type="button"
                variant="outline"
                className="justify-start"
                onClick={() => {
                  setMobileActionClientId(null);
                  onEditClient(mobileActionRow.client.id);
                }}
              >
                Edit client
              </Button>
            )}
          </div>
        )}
      </BottomSheet>
    </section>
  );
}
