import type { SubcontractorContact, TradeType } from "@/lib/types";

export type SubcontractorSortKey = "name" | "company" | "trade" | "status" | "assignmentCount" | "nextScheduledFinish";
export type SubcontractorSortDirection = "asc" | "desc";
export type SubcontractorStatusFilter = "all" | "active" | "inactive";
export type SubcontractorAssignmentFilter = "all" | "assigned" | "unassigned";
export type SubcontractorTradeFilter = "all" | TradeType;

export interface SubcontractorSortState {
  key: SubcontractorSortKey;
  direction: SubcontractorSortDirection;
}

export interface SubcontractorRowFilters {
  trade: SubcontractorTradeFilter;
  status: SubcontractorStatusFilter;
  assignment: SubcontractorAssignmentFilter;
}

export interface SubcontractorAssignmentSummary {
  assignmentCount: number;
  nextScheduledFinish?: string;
}

const EMPTY_FILTERS: SubcontractorRowFilters = {
  trade: "all",
  status: "all",
  assignment: "all",
};

const compareText = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "base" });

function matchesSearch(sub: SubcontractorContact, search: string) {
  const q = search.trim().toLowerCase();
  if (!q) return true;

  return [
    sub.displayName,
    sub.companyName,
    sub.trade,
    sub.phone,
    sub.email,
  ].some((value) => value?.toLowerCase().includes(q));
}

function matchesFilters(
  sub: SubcontractorContact,
  filters: SubcontractorRowFilters,
  assignments: Map<string, SubcontractorAssignmentSummary>,
) {
  if (filters.trade !== "all" && sub.trade !== filters.trade) return false;
  if (filters.status === "active" && !sub.active) return false;
  if (filters.status === "inactive" && sub.active) return false;

  const assignmentCount = assignments.get(sub.id)?.assignmentCount ?? 0;
  if (filters.assignment === "assigned" && assignmentCount === 0) return false;
  if (filters.assignment === "unassigned" && assignmentCount > 0) return false;

  return true;
}

function compareDates(a?: string, b?: string) {
  const aTime = a ? new Date(a).getTime() : Number.POSITIVE_INFINITY;
  const bTime = b ? new Date(b).getTime() : Number.POSITIVE_INFINITY;
  return aTime - bTime;
}

export function sortSubcontractors(
  subcontractors: SubcontractorContact[],
  sort: SubcontractorSortState,
  assignments = new Map<string, SubcontractorAssignmentSummary>(),
) {
  return [...subcontractors].sort((a, b) => {
    let result = 0;

    if (sort.key === "name") {
      result = compareText(a.displayName, b.displayName);
    } else if (sort.key === "company") {
      result = compareText(a.companyName ?? "", b.companyName ?? "");
    } else if (sort.key === "trade") {
      result = compareText(a.trade, b.trade);
    } else if (sort.key === "assignmentCount") {
      result = (assignments.get(a.id)?.assignmentCount ?? 0) - (assignments.get(b.id)?.assignmentCount ?? 0);
    } else if (sort.key === "nextScheduledFinish") {
      result = compareDates(assignments.get(a.id)?.nextScheduledFinish, assignments.get(b.id)?.nextScheduledFinish);
    } else {
      result = Number(b.active) - Number(a.active);
    }

    if (result === 0) {
      result = compareText(a.displayName, b.displayName);
    }

    return sort.direction === "asc" ? result : -result;
  });
}

export function buildSubcontractorRows(
  subcontractors: SubcontractorContact[],
  search: string,
  sort: SubcontractorSortState,
  filters: SubcontractorRowFilters = EMPTY_FILTERS,
  assignments = new Map<string, SubcontractorAssignmentSummary>(),
) {
  return sortSubcontractors(
    subcontractors.filter((sub) => matchesSearch(sub, search) && matchesFilters(sub, filters, assignments)),
    sort,
    assignments,
  );
}
