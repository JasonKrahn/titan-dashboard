import type { ClientRecord, Project } from "@/lib/types";

export interface ClientDirectoryRow {
  client: ClientRecord;
  activeProjects: number;
  totalJobs: number;
  latestProject?: Project;
}

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
): ClientDirectoryRow[] {
  const normalizedSearch = search.trim().toLowerCase();
  return clients
    .filter((client) => matchesSearch(client, normalizedSearch))
    .sort((a, b) => a.name.localeCompare(b.name))
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
}
