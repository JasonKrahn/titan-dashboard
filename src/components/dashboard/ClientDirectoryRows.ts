import type { ClientRecord, Project } from "@/lib/types";

export interface ClientDirectoryRow {
  client: ClientRecord;
  activeProjects: number;
  totalJobs: number;
  latestProject?: Project;
}

export type ClientSortKey = "client" | "contact" | "active" | "total";

export interface ClientSortState {
  key: ClientSortKey;
  direction: "asc" | "desc";
}

const DEFAULT_SORT: ClientSortState = { key: "client", direction: "asc" };

function matchesSearch(client: ClientRecord, search: string) {
  if (!search) return true;
  return [client.name, client.primaryContactName, client.phone, client.email]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(search));
}

export function buildClientRows(
  clients: ClientRecord[],
  projects: Project[],
  search: string,
  sort: ClientSortState = DEFAULT_SORT,
): ClientDirectoryRow[] {
  const normalizedSearch = search.trim().toLowerCase();
  const rows = clients
    .filter((client) => matchesSearch(client, normalizedSearch))
    .map((client) => {
      const clientProjects = projects.filter((project) => project.clientId === client.id);
      const latestProject = [...clientProjects].sort((a, b) =>
        a.updatedAt < b.updatedAt ? 1 : -1,
      )[0];

      return {
        client,
        activeProjects: clientProjects.filter((project) => project.status === "active").length,
        totalJobs: clientProjects.length,
        latestProject,
      };
    });

  const direction = sort.direction === "asc" ? 1 : -1;
  return rows.sort((a, b) => {
    let result = 0;
    if (sort.key === "client") {
      result = a.client.name.localeCompare(b.client.name);
    } else if (sort.key === "contact") {
      result = (a.client.primaryContactName ?? "").localeCompare(b.client.primaryContactName ?? "");
    } else if (sort.key === "active") {
      result = a.activeProjects - b.activeProjects;
    } else if (sort.key === "total") {
      result = a.totalJobs - b.totalJobs;
    }

    if (result !== 0) return result * direction;
    return a.client.name.localeCompare(b.client.name);
  });
}
