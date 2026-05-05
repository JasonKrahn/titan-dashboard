
# Terms
✅  MPV - Minimum Viable Product -- the critical functions of this software to be considered a success.
🚫 NON-MVP - Nice to have future features and considerations for this product to excel beyond our stated 

# Titan PM — Application Screen Tree

## System Entry

```
Login Screen
└── Role Router (Authentication)
    ├── 🔶 Project Manager (Mobile First) ✅  MPV
    ├── 🔷 Administration (Desktop) ✅  MPV
    └── 🟢 Clean Up Crew (Mobile) 
```

---

## External Integrations

```
Simply Accounting 
└── Generate PO → Auto-Create Project → System Database

Manual Project Entry (No PO) ✅  MPV
└── Populate → System Database

Email Webhook (The Mailman) 
├── Match PO/Address in Subject → System Database
└── Route Supplier Emails → Project Overview Screen
```

---

## 🔶 Project Manager Flow (Mobile First) ✅  MPV

```
PM Client Screen (Start View) 
│   Sorted alphabetically · Active & historic clients
│
├── [Add Client] → Create Client Modal → Save → PM Client Screen
├── [Delete Client] → Recycle Bin (30-day retention)
├── [View Recycle Bin] → Recycle Bin Screen
│   ├── [Recover Client] → PM Client Screen
│   └── Auto-Purge after 30 days
│
├── [Select Client] → Client Projects Screen
│   │   Sorted by last updated · Project addresses
│   │
│   ├── [Filter] → Active / Upcoming / Archived
│   ├── [Sort] → By last updated
│   │
│   ├── [Create Project (PO-based)] → Project Creation Fields
│   │   └── Generates default phases (Insulation, Drywall, Finishing)
│   │
│   ├── [Create Project (Manual Override)] → Manual Project Creation
│   │   └── Generates default phases (Insulation, Drywall, Finishing)
│   │
│   └── [Select Project] → Project Overview Screen
│       │   High-level overview · Phase progress · Active deficiencies
│       │
│       ├── [Edit Project Start/End Dates]
│       ├── [View Phase Progress Summary]
│       ├── [View Active Deficiencies]
│       │
│       ├── [Close Project] → ⛔ ATTIC GATE
│       │   ├── ✅ Attic Insulation Complete → Project Closed
│       │   └── ❌ Missing Call-in or Install Date → Close Blocked
│       │
│       ├── [Select Phase: Insulation] ──┐
│       ├── [Select Phase: Drywall] ─────┤
│       └── [Select Phase: Finishing] ───┘
│                                        │
│                              Phase Details Screen
│                              │
│                              ├── [View Notes] → Phase Notes
│                              ├── [View Progress] → Progress Tracker
│                              ├── [View Attention Items] → Deficiency Items
│                              ├── [View Materials] → Materials on Site
│                              ├── [View/Upload Photos] → Phase Photos
│                              ├── [View/Upload Documents] → Phase Documents
│                              │
│                              ├── [Assign Subcontractor] → Select from Rolodex
│                              ├── [Edit Phase Dates / Installer] → Personnel &                                      Schedule
│                              │
│                              ├── [Start Phase] → ⛔ SITE CHECK GATE
│                              │   ├── ✅ Walkthrough + Min 1 Photo → Phase                                             Active
│                              │   └── ❌ Missing Check/Photo → Phase Start                                             Blocked
│                              │
│                              └── Phase Active
│                                  ├── [QC Sign-off (Mandatory)] → Foreman Name                                          & Date
│                                  ├── [Insulation Only] → Pre-Insulation                                                Walkthrough Log
│                                  │
│                                  └── QC Complete → Phase Closed 🚫 NON-MVP
│                                      └── Auto-Email materials list to Clean Up                                            Crew
│
└── [Settings] → PM Settings
    └── [Subcontractor Rolodex] → Subcontractor Rolodex Screen
        └── [View Sub] → Sub Detail View
            ├── Specialty (Drywall / Insulation / Finishing)
            ├── Phone Number
            ├── Email
            ├── One-line Note (e.g. "Good for custom")
            ├── Current Assigned Jobs (all PMs)
            └── Active / Inactive Status
```

---

## 🔷 Administration Flow (Desktop) ✅  MPV

```
Admin Client Screen (Start View) 
│   Sorted alphabetically · All clients across all PMs
│
├── [Add Client] → Create Client Modal → Save → Admin Client Screen
├── [Delete Client] → Recycle Bin (30-day retention)
├── [Review Red Flags] → Data Controller View (Omitted Fields)
│
├── [Select Client] → Admin Client Projects Screen
│   │   All projects across all PMs for this client
│   │
│   ├── [Filter] → Active / Upcoming / Archived
│   ├── [Create Project] → Project Creation Fields
│   │   └── Generates default phases
│   ├── [Assign PM to Project] → Assign Project Manager Modal
│   │
│   └── [Select Project] → Admin Project Overview Screen
│       ├── [Audit Project Details] → Full Audit View
│       ├── [Download Data] → Export CSV Timeline & Assets Folder
│       └── [Select Phase] → Phase Details Screen (shared with PM flow)
│
└── [Settings] → Admin Settings
    ├── [Subcontractor Rolodex] → (Same as PM Rolodex)
    ├── [Manage Organization] → Organization Management
    │   ├── [Add / Remove / Invite PMs]
    │   └── [Add / Remove Clients]
    ├── [Audit All Jobs] → Cross-Client Audit View
    ├── [View All Activity] → Global Activity Log
    └── [View Project Map] → Filterable Province Map 🚫 NON-MVP
```

---

## 🟢 Clean Up Crew Flow (Mobile) 🚫 NON-MVP

> ⚠️ Notes indicate: "More thought needs to be put into the clean up crew"

```
Crew Dashboard (Start View)
│   Phase progress of every active site · No minute details
│
├── [View Site Phase Progress] (read-only overview)
│
├── [Select Active Project] → Project Material View
│   ├── [View Scaffolding] → Scaffolding Tracker
│   │   └── Type (Baker/Safety) · Piece Count · Delivery & Pickup Dates
│   └── [View Material Recovery] → Material Recovery Log
│       └── Excess drywall, mud, insulation, finishing materials
│
└── [View Routing] → Warehouse-less Routing Map
    └── Upcoming projects shown geographically for site-to-site moves
```

---

## Hard Gates Summary ✅  MPV

```
┌─────────────────┬─────────────┬──────────────────────────────────────────┐
│ Gate            │ Scope       │ Requirements                             │
├─────────────────┼─────────────┼──────────────────────────────────────────┤
│ Site Check      │ Per Phase   │ Walkthrough completed + min 1 photo      │
│ Inspection Check│ Per Phase   │ Foreman name + inspection date           │
│ Attic Gate      │ Per Project │ Call-in date + install date for attic    │
└─────────────────┴─────────────┴──────────────────────────────────────────┘
```

## Key Design Constraints

- **Phases are independent** — Drywall can start before Insulation finishes
- **No client-facing dashboard** — strictly internal tool
- **Permanent data retention** — un-deletable history for 10+ year warranty support
- **Trade terminology** — UI uses Insulation, Drywall, and Finishing
