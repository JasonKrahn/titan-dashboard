import type { SubcontractorContact } from "@/lib/types";

export type SubcontractorSortKey = "name" | "company" | "trade" | "status";
export type SubcontractorSortDirection = "asc" | "desc";

export interface SubcontractorSortState {
  key: SubcontractorSortKey;
  direction: SubcontractorSortDirection;
}

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

export function sortSubcontractors(
  subcontractors: SubcontractorContact[],
  sort: SubcontractorSortState,
) {
  return [...subcontractors].sort((a, b) => {
    let result = 0;

    if (sort.key === "name") {
      result = compareText(a.displayName, b.displayName);
    } else if (sort.key === "company") {
      result = compareText(a.companyName ?? "", b.companyName ?? "");
    } else if (sort.key === "trade") {
      result = compareText(a.trade, b.trade);
    } else {
      result = Number(b.active) - Number(a.active);
    }

    return sort.direction === "asc" ? result : -result;
  });
}

export function buildSubcontractorRows(
  subcontractors: SubcontractorContact[],
  search: string,
  sort: SubcontractorSortState,
) {
  return sortSubcontractors(subcontractors.filter((sub) => matchesSearch(sub, search)), sort);
}
