import { describe, expect, it, vi } from "vitest";
import type { ClientRecord, Gate, Phase, PhotoEvidence, Project, User } from "@/lib/types";
import {
  buildAttentionQueue,
  buildVisibleQueue,
  getQueueCounts,
  type QueueFilter,
} from "./attentionQueue";

const NOW = "2026-05-10T12:00:00.000Z";

const user: User = {
  id: "user-1",
  role: "admin",
  fullName: "Avery Stone",
  email: "avery@example.com",
  active: true,
  createdAt: NOW,
  updatedAt: NOW,
};

const client: ClientRecord = {
  id: "client-1",
  name: "Acme Homes",
  archived: false,
  createdAt: NOW,
  updatedAt: NOW,
};

function daysAgo(days: number) {
  return new Date(Date.parse(NOW) - days * 24 * 60 * 60 * 1000).toISOString();
}

function project(overrides: Partial<Project> & { id: string }): Project {
  return {
    id: overrides.id,
    clientId: "client-1",
    projectNumber: `TP-${overrides.id}`,
    name: overrides.id,
    siteAddress: "123 Main St, Winnipeg, MB R3C 1A3",
    status: "active",
    assignedProjectManagerId: "user-1",
    atticCheckStatus: "passed",
    createdAt: daysAgo(20),
    updatedAt: daysAgo(2),
    ...overrides,
  };
}

function phase(overrides: Partial<Phase> & { id: string; projectId: string }): Phase {
  return {
    id: overrides.id,
    projectId: overrides.projectId,
    type: "drywall",
    status: "in_progress",
    createdAt: daysAgo(20),
    updatedAt: daysAgo(2),
    ...overrides,
  };
}

function gate(overrides: Partial<Gate> & { id: string; projectId: string }): Gate {
  return {
    id: overrides.id,
    projectId: overrides.projectId,
    type: "inspection",
    status: "not_started",
    requiredPhotoEvidence: false,
    createdAt: daysAgo(20),
    updatedAt: daysAgo(2),
    ...overrides,
  };
}

function queueData(overrides: {
  projects: Project[];
  phases?: Phase[];
  gates?: Gate[];
  photos?: PhotoEvidence[];
}) {
  return buildAttentionQueue({
    projects: overrides.projects,
    phases: overrides.phases ?? [],
    gates: overrides.gates ?? [],
    deficiencies: [],
    photos: overrides.photos ?? [],
    users: [user],
    clients: [client],
  });
}

describe("command attention queue", () => {
  vi.setSystemTime(new Date(NOW));

  it("groups the default queue to one row per project with secondary flags", () => {
    const items = queueData({
      projects: [
        project({
          id: "project-multi",
          atticCheckStatus: "not_started",
          scheduledEnd: daysAgo(5),
          updatedAt: daysAgo(15),
        }),
      ],
      phases: [
        phase({
          id: "phase-blocked",
          projectId: "project-multi",
          status: "blocked",
          updatedAt: daysAgo(4),
        }),
      ],
      gates: [gate({ id: "gate-blocked", projectId: "project-multi", status: "blocked" })],
    });

    const visible = buildVisibleQueue(items, "all");

    expect(visible).toHaveLength(1);
    expect(visible[0].projectId).toBe("project-multi");
    expect(visible[0].type).toBe("critical_blocker");
    expect(visible[0].secondaryFlags?.map((flag) => flag.type)).toEqual([
      "missing_attic_evidence",
      "past_scheduled_end",
      "stale_project",
    ]);
  });

  it("uses explicit type filters so blocked and failed inspection rows do not mix", () => {
    const items = queueData({
      projects: [project({ id: "project-blocked" }), project({ id: "project-failed" })],
      phases: [
        phase({ id: "phase-blocked", projectId: "project-blocked", status: "blocked" }),
        phase({ id: "phase-failed", projectId: "project-failed", status: "blocked" }),
      ],
      gates: [
        gate({ id: "gate-blocked", projectId: "project-blocked", status: "blocked" }),
        gate({
          id: "gate-failed",
          projectId: "project-failed",
          phaseId: "phase-failed",
          type: "inspection",
          status: "failed",
          completedAt: daysAgo(1),
        }),
      ],
    });

    expect(buildVisibleQueue(items, "critical_blocker").map((item) => item.projectId)).toEqual([
      "project-blocked",
    ]);
    expect(buildVisibleQueue(items, "failed_inspection").map((item) => item.projectId)).toEqual([
      "project-failed",
    ]);
  });

  it("counts archive-ready projects only after the 7 day threshold", () => {
    const items = queueData({
      projects: [
        project({
          id: "project-new-complete",
          status: "completed",
          completedAt: daysAgo(3),
          updatedAt: daysAgo(3),
        }),
        project({
          id: "project-old-complete",
          status: "completed",
          completedAt: daysAgo(8),
          updatedAt: daysAgo(8),
        }),
      ],
    });

    expect(items.filter((item) => item.type === "awaiting_archive").map((item) => item.projectId)).toEqual([
      "project-old-complete",
    ]);
    expect(getQueueCounts(items).completed).toBe(1);
  });

  it("accepts every planned queue filter type", () => {
    const filter: QueueFilter = "missing_attic_evidence";

    expect(filter).toBe("missing_attic_evidence");
  });
});
