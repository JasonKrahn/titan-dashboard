// Prototype seed data. Only the prototype adapter imports this file.
// Components must NOT import seed.ts directly — go through lib/api.

import type {
  AuditEvent,
  ClientRecord,
  Deficiency,
  Gate,
  Phase,
  PhotoEvidence,
  Project,
  SubcontractorContact,
  User,
} from "@/lib/types";

const now = Date.now();
const iso = (offsetMs: number) => new Date(now + offsetMs).toISOString();
const days = (n: number) => n * 24 * 60 * 60 * 1000;
const hours = (n: number) => n * 60 * 60 * 1000;

export const seedUsers: User[] = [
  {
    id: "user-admin",
    role: "admin",
    fullName: "Sarah Chen",
    email: "sarah@titanpm.io",
    active: true,
    createdAt: iso(-days(120)),
    updatedAt: iso(-days(2)),
  },
  {
    id: "user-pm-1",
    role: "project_manager",
    fullName: "Marcus Reid",
    email: "marcus@titanpm.io",
    active: true,
    createdAt: iso(-days(90)),
    updatedAt: iso(-days(1)),
  },
  {
    id: "user-pm-2",
    role: "project_manager",
    fullName: "Priya Patel",
    email: "priya@titanpm.io",
    active: true,
    createdAt: iso(-days(60)),
    updatedAt: iso(-hours(8)),
  },
];

export const seedClients: ClientRecord[] = [
  {
    id: "client-1",
    name: "Northbridge Developments",
    primaryContactName: "Daniel Lowe",
    phone: "555-0101",
    email: "daniel@northbridge.com",
    archived: false,
    createdAt: iso(-days(200)),
    updatedAt: iso(-days(10)),
  },
  {
    id: "client-2",
    name: "Cedar Hollow Homes",
    primaryContactName: "Anna Lin",
    phone: "555-0102",
    email: "anna@cedarhollow.com",
    archived: false,
    createdAt: iso(-days(180)),
    updatedAt: iso(-days(7)),
  },
  {
    id: "client-3",
    name: "Summit Construction Group",
    primaryContactName: "Theo Park",
    phone: "555-0103",
    email: "theo@summitcg.com",
    archived: false,
    createdAt: iso(-days(150)),
    updatedAt: iso(-days(5)),
  },
  {
    id: "client-4",
    name: "Riverstone Builders",
    primaryContactName: "Maya Johnson",
    phone: "555-0104",
    email: "maya@riverstone.com",
    archived: false,
    createdAt: iso(-days(120)),
    updatedAt: iso(-days(3)),
  },
];

export const seedSubcontractors: SubcontractorContact[] = [
  { id: "sub-1", displayName: "Bob Hayes", companyName: "Insul-Pro", trade: "insulation", active: true, createdAt: iso(-days(100)), updatedAt: iso(-days(20)) },
  { id: "sub-2", displayName: "Tina Morales", companyName: "Wallcraft", trade: "drywall", active: true, createdAt: iso(-days(100)), updatedAt: iso(-days(15)) },
  { id: "sub-3", displayName: "Jules Park", companyName: "Finish First", trade: "finishing", active: true, createdAt: iso(-days(100)), updatedAt: iso(-days(8)) },
];

// Helpers for project construction
type ProjectSpec = {
  id: string;
  number: string;
  name: string;
  address: string;
  clientId: string;
  status: Project["status"];
  pmId?: string;
  atticStatus: Gate["status"];
  phases: { type: Phase["type"]; status: Phase["status"] }[];
  gates: { type: Gate["type"]; status: Gate["status"]; phaseType?: Phase["type"] }[];
  deficiencies?: { phaseType: Phase["type"]; title: string; severity: Deficiency["severity"]; status: Deficiency["status"] }[];
  hasAtticPhoto?: boolean;
  updatedHoursAgo: number;
};

const projectSpecs: ProjectSpec[] = [
  {
    id: "proj-1",
    number: "TP-2025-001",
    name: "Maple Ridge Phase 4",
    address: "120 Maple Ridge Dr",
    clientId: "client-1",
    status: "active",
    pmId: "user-pm-1",
    atticStatus: "not_started",
    phases: [
      { type: "insulation", status: "closed" },
      { type: "drywall", status: "in_progress" },
      { type: "finishing", status: "not_started" },
    ],
    gates: [
      { type: "site_check", status: "passed", phaseType: "insulation" },
      { type: "inspection", status: "passed", phaseType: "insulation" },
      { type: "site_check", status: "passed", phaseType: "drywall" },
      { type: "inspection", status: "in_progress", phaseType: "drywall" },
      { type: "attic_check", status: "not_started" },
    ],
    deficiencies: [
      { phaseType: "drywall", title: "Corner bead loose at stairwell", severity: "medium", status: "open" },
    ],
    updatedHoursAgo: 2,
  },
  {
    id: "proj-2",
    number: "TP-2025-002",
    name: "Cedar Hollow Lot 12",
    address: "12 Cedar Hollow Ln",
    clientId: "client-2",
    status: "active",
    pmId: "user-pm-1",
    atticStatus: "blocked",
    phases: [
      { type: "insulation", status: "closed" },
      { type: "drywall", status: "closed" },
      { type: "finishing", status: "ready_for_inspection" },
    ],
    gates: [
      { type: "inspection", status: "passed", phaseType: "insulation" },
      { type: "inspection", status: "passed", phaseType: "drywall" },
      { type: "inspection", status: "in_progress", phaseType: "finishing" },
      { type: "attic_check", status: "blocked" },
    ],
    hasAtticPhoto: false,
    updatedHoursAgo: 5,
  },
  {
    id: "proj-3",
    number: "TP-2025-003",
    name: "Summit Heights Block C",
    address: "880 Summit Way",
    clientId: "client-3",
    status: "active",
    pmId: "user-pm-2",
    atticStatus: "in_progress",
    phases: [
      { type: "insulation", status: "ready_for_inspection" },
      { type: "drywall", status: "not_started" },
      { type: "finishing", status: "not_started" },
    ],
    gates: [
      { type: "site_check", status: "passed", phaseType: "insulation" },
      { type: "inspection", status: "in_progress", phaseType: "insulation" },
      { type: "attic_check", status: "in_progress" },
    ],
    updatedHoursAgo: 1,
  },
  {
    id: "proj-4",
    number: "TP-2025-004",
    name: "Riverstone Estates 7",
    address: "47 Riverstone Cir",
    clientId: "client-4",
    status: "active",
    pmId: "user-pm-2",
    atticStatus: "failed",
    phases: [
      { type: "insulation", status: "blocked" },
      { type: "drywall", status: "not_started" },
      { type: "finishing", status: "not_started" },
    ],
    gates: [
      { type: "site_check", status: "passed", phaseType: "insulation" },
      { type: "inspection", status: "failed", phaseType: "insulation" },
      { type: "attic_check", status: "failed" },
    ],
    deficiencies: [
      { phaseType: "insulation", title: "Vapor barrier gaps in north wall", severity: "high", status: "in_progress" },
      { phaseType: "insulation", title: "Insufficient R-value at rim joist", severity: "critical", status: "open" },
    ],
    hasAtticPhoto: false,
    updatedHoursAgo: 18,
  },
  {
    id: "proj-5",
    number: "TP-2025-005",
    name: "Northbridge Townhomes A",
    address: "300 Northbridge Pkwy",
    clientId: "client-1",
    status: "active",
    pmId: "user-pm-1",
    atticStatus: "passed",
    phases: [
      { type: "insulation", status: "closed" },
      { type: "drywall", status: "closed" },
      { type: "finishing", status: "closed" },
    ],
    gates: [
      { type: "inspection", status: "passed", phaseType: "insulation" },
      { type: "inspection", status: "passed", phaseType: "drywall" },
      { type: "inspection", status: "passed", phaseType: "finishing" },
      { type: "attic_check", status: "passed" },
    ],
    hasAtticPhoto: true,
    updatedHoursAgo: 28,
  },
  {
    id: "proj-6",
    number: "TP-2025-006",
    name: "Maple Ridge Phase 5",
    address: "180 Maple Ridge Dr",
    clientId: "client-1",
    status: "active",
    pmId: "user-pm-2",
    atticStatus: "not_started",
    phases: [
      { type: "insulation", status: "in_progress" },
      { type: "drywall", status: "not_started" },
      { type: "finishing", status: "not_started" },
    ],
    gates: [
      { type: "site_check", status: "in_progress", phaseType: "insulation" },
      { type: "attic_check", status: "not_started" },
    ],
    updatedHoursAgo: 6,
  },
  {
    id: "proj-7",
    number: "TP-2025-007",
    name: "Cedar Hollow Lot 18",
    address: "18 Cedar Hollow Ln",
    clientId: "client-2",
    status: "active",
    pmId: "user-pm-1",
    atticStatus: "in_progress",
    phases: [
      { type: "insulation", status: "closed" },
      { type: "drywall", status: "ready_for_inspection" },
      { type: "finishing", status: "not_started" },
    ],
    gates: [
      { type: "inspection", status: "passed", phaseType: "insulation" },
      { type: "inspection", status: "in_progress", phaseType: "drywall" },
      { type: "attic_check", status: "in_progress" },
    ],
    deficiencies: [
      { phaseType: "drywall", title: "Mud shrinkage at ceiling seams", severity: "low", status: "open" },
    ],
    updatedHoursAgo: 9,
  },
  {
    id: "proj-8",
    number: "TP-2024-098",
    name: "Summit Heights Block B",
    address: "860 Summit Way",
    clientId: "client-3",
    status: "completed",
    pmId: "user-pm-2",
    atticStatus: "passed",
    phases: [
      { type: "insulation", status: "closed" },
      { type: "drywall", status: "closed" },
      { type: "finishing", status: "closed" },
    ],
    gates: [
      { type: "inspection", status: "passed", phaseType: "insulation" },
      { type: "inspection", status: "passed", phaseType: "drywall" },
      { type: "inspection", status: "passed", phaseType: "finishing" },
      { type: "attic_check", status: "passed" },
    ],
    hasAtticPhoto: true,
    updatedHoursAgo: 24 * 14,
  },
  {
    id: "proj-9",
    number: "TP-2025-009",
    name: "Willow Creek Lot 3",
    address: "3 Willow Creek Way",
    clientId: "client-4",
    status: "draft",
    pmId: "user-pm-1",
    atticStatus: "not_started",
    phases: [
      { type: "insulation", status: "not_started" },
      { type: "drywall", status: "not_started" },
      { type: "finishing", status: "not_started" },
    ],
    gates: [
      { type: "attic_check", status: "not_started" },
    ],
    updatedHoursAgo: 36,
  },
  {
    id: "proj-10",
    number: "TP-2024-077",
    name: "Northbridge Phase 3",
    address: "200 Northbridge Pkwy",
    clientId: "client-1",
    status: "archived",
    pmId: "user-pm-1",
    atticStatus: "passed",
    phases: [
      { type: "insulation", status: "closed" },
      { type: "drywall", status: "closed" },
      { type: "finishing", status: "closed" },
    ],
    gates: [
      { type: "inspection", status: "passed", phaseType: "insulation" },
      { type: "inspection", status: "passed", phaseType: "drywall" },
      { type: "inspection", status: "passed", phaseType: "finishing" },
      { type: "attic_check", status: "passed" },
    ],
    hasAtticPhoto: true,
    updatedHoursAgo: 24 * 60,
  },
  {
    id: "proj-11",
    number: "TP-2025-011",
    name: "Riverstone Estates 9",
    address: "59 Riverstone Cir",
    clientId: "client-4",
    status: "active",
    pmId: "user-pm-2",
    atticStatus: "in_progress",
    phases: [
      { type: "insulation", status: "ready_for_inspection" },
      { type: "drywall", status: "in_progress" },
      { type: "finishing", status: "not_started" },
    ],
    gates: [
      { type: "inspection", status: "in_progress", phaseType: "insulation" },
      { type: "site_check", status: "passed", phaseType: "drywall" },
      { type: "attic_check", status: "in_progress" },
    ],
    updatedHoursAgo: 4,
  },
];

const projects: Project[] = [];
const phases: Phase[] = [];
const gates: Gate[] = [];
const deficiencies: Deficiency[] = [];
const photos: PhotoEvidence[] = [];

projectSpecs.forEach((spec) => {
  projects.push({
    id: spec.id,
    clientId: spec.clientId,
    projectNumber: spec.number,
    name: spec.name,
    siteAddress: spec.address,
    status: spec.status,
    assignedProjectManagerId: spec.pmId,
    atticCheckStatus: spec.atticStatus,
    createdAt: iso(-days(60)),
    updatedAt: iso(-hours(spec.updatedHoursAgo)),
    completedAt: spec.status === "completed" ? iso(-days(7)) : undefined,
  });

  const phaseIdByType: Record<string, string> = {};
  spec.phases.forEach((p) => {
    const id = `${spec.id}-phase-${p.type}`;
    phaseIdByType[p.type] = id;
    phases.push({
      id,
      projectId: spec.id,
      type: p.type,
      status: p.status,
      createdAt: iso(-days(50)),
      updatedAt: iso(-hours(spec.updatedHoursAgo)),
    });
  });

  spec.gates.forEach((g, i) => {
    gates.push({
      id: `${spec.id}-gate-${g.type}-${i}`,
      projectId: spec.id,
      phaseId: g.phaseType ? phaseIdByType[g.phaseType] : undefined,
      type: g.type,
      status: g.status,
      requiredPhotoEvidence: g.type === "attic_check",
      createdAt: iso(-days(40)),
      updatedAt: iso(-hours(spec.updatedHoursAgo)),
    });
  });

  spec.deficiencies?.forEach((d, i) => {
    deficiencies.push({
      id: `${spec.id}-def-${i}`,
      projectId: spec.id,
      phaseId: phaseIdByType[d.phaseType],
      title: d.title,
      severity: d.severity,
      status: d.status,
      createdAt: iso(-days(5)),
      updatedAt: iso(-hours(spec.updatedHoursAgo)),
    });
  });

  if (spec.hasAtticPhoto) {
    photos.push({
      id: `${spec.id}-photo-attic`,
      projectId: spec.id,
      purpose: "attic_check",
      objectKey: `projects/${spec.id}/attic.jpg`,
      mimeType: "image/jpeg",
      status: "confirmed",
      uploadedByUserId: spec.pmId ?? "user-admin",
      createdAt: iso(-days(2)),
      updatedAt: iso(-days(2)),
    });
  }
});

export const seedProjects = projects;
export const seedPhases = phases;
export const seedGates = gates;
export const seedDeficiencies = deficiencies;
export const seedPhotos = photos;

// Audit events — at least 20
export const seedAuditEvents: AuditEvent[] = Array.from({ length: 24 }).map((_, i) => ({
  id: `audit-${i}`,
  entityType: i % 3 === 0 ? "project" : i % 3 === 1 ? "phase" : "gate",
  entityId: projects[i % projects.length].id,
  action: ["status_changed", "created", "photo_uploaded", "deficiency_opened", "inspection_completed"][i % 5],
  actorUserId: i % 2 === 0 ? "user-admin" : "user-pm-1",
  createdAt: iso(-hours(i * 6)),
}));
