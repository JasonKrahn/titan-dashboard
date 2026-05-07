import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Building2, Grid2X2, List, Mail, Phone, Pencil, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { buildClientRows } from "./ClientDirectoryRows";

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
  const [displayMode, setDisplayMode] = useState<"list" | "cards">(() => {
    const saved = localStorage.getItem("clientViewMode");
    return saved === "list" || saved === "cards" ? saved : "cards";
  });
  const rows = useMemo(() => buildClientRows(clients, projects, search), [clients, projects, search]);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

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
              className="h-10 w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
              onClick={onNewClient}
            >
              <Plus className="h-4 w-4 mr-1" />
              New client
            </Button>
          </div>
        )}

        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search clients, contacts, email..."
            className="bg-background/60 pl-9"
          />
        </div>

        <div className="hidden sm:flex flex-wrap items-center gap-2">
          <div className="inline-flex w-fit gap-1 rounded-md border border-border bg-card p-1 shadow-card">
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
          </div>
        </div>
      </div>

      {loading ? (
        displayMode === "list" ? (
          <Card className="border-border bg-gradient-surface p-3">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="mb-2 h-12 animate-pulse rounded-md bg-card/60 last:mb-0" />
            ))}
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <Card key={item} className="h-[210px] animate-pulse border-border bg-card/60" />
            ))}
          </div>
        )
      ) : rows.length === 0 ? (
        <Card className="border-border bg-gradient-surface p-8 text-center">
          <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />
          <h3 className="mt-3 font-semibold">No clients found</h3>
          <p className="mt-1 text-sm text-muted-foreground">Try a different name, contact, phone, or email.</p>
        </Card>
      ) : displayMode === "list" ? (
        <Card className="border-border bg-gradient-surface shadow-card">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[58%] sm:w-[50%] lg:w-[30%] xl:w-[22%]">Client</TableHead>
                <TableHead className="hidden sm:table-cell sm:w-[24%] lg:w-[18%] xl:w-[14%]">Contact</TableHead>
                <TableHead className="hidden lg:table-cell lg:w-[12%] xl:w-[10%]">Phone</TableHead>
                <TableHead className="hidden lg:table-cell lg:w-[20%] xl:w-[18%]">Email</TableHead>
                <TableHead className="w-[21%] text-right sm:w-[13%] lg:w-[10%] xl:w-[7%]">Active</TableHead>
                <TableHead className="w-[21%] text-right sm:w-[13%] lg:w-[10%] xl:w-[7%]">Total</TableHead>
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
                      <div className="truncate text-xs text-muted-foreground sm:hidden">
                        {row.client.primaryContactName ?? "No primary contact"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden truncate text-muted-foreground sm:table-cell">
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
      ) : (
        <>
          {/* Mobile dense list */}
          <ul className="mobile-list sm:hidden">
            {rows.map((row) => (
              <li key={row.client.id}>
                <button
                  type="button"
                  onClick={() => onOpenClient?.(row.client.id)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left active:bg-muted/40"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{row.client.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {row.client.primaryContactName ?? row.client.phone ?? "No contact"}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums">
                    {row.activeProjects}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="hidden sm:grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {rows.map((row) => {
            return (
              <Card
                key={row.client.id}
                onClick={() => onOpenClient?.(row.client.id)}
                className="group cursor-pointer border-border bg-gradient-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-glow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Building2 className="h-4 w-4" />
                    </div>
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
      )}
    </section>
  );
}
