# Titan PM Mobile Redesign Brief For Google Stitch

## Product Context

Titan PM is a mobile-first operations app for **residential interiors construction**, specifically the work surrounding:

- Insulation
- Drywall
- Finishing

It is not a general construction project management app. It is not intended to manage every phase of a build, every trade, or every commercial construction workflow. The app is focused on the interior production phase of residential jobs, where project managers need to coordinate subcontractors, site readiness, inspections, deficiencies, materials, photos, and closeout proof.

The mobile experience should feel like a field-ready control surface for residential interior work. It should help a project manager standing in a home, truck, office, or jobsite trailer quickly answer:

- What interior phase is this job in?
- Is insulation, drywall, or finishing blocked?
- Is the job ready for inspection?
- Did an inspection pass or fail?
- What deficiencies need follow-up?
- What photos or attic evidence are missing?
- What materials or equipment are tied to this job?
- What changed recently?
- What needs action today?

## Core Product Positioning

Titan PM exists to keep residential interior construction work from being scattered across texts, calls, photos, spreadsheets, memory, and disconnected checklists.

The app gives the team one shared operating picture for interior production work after a residential project reaches the insulation/drywall/finishing stage. It keeps project status, phase progress, inspection readiness, site blocks, deficiencies, subcontractors, inventory context, and photo evidence together.

The redesign should make that operating picture easier to use on a phone.

## Domain Boundary

### In Scope

Titan PM focuses on residential interior construction workflows such as:

- Tracking residential jobs through insulation, drywall, and finishing phases.
- Seeing whether each interior phase is not started, in progress, ready for inspection, blocked, or closed.
- Managing site checks, inspection results, attic checks, and closeout evidence.
- Tracking failed inspections and deficiencies that need rework.
- Assigning or referencing trade subcontractors for insulation, drywall, and finishing.
- Reviewing materials, equipment, pickups, and audit requests related to interior work.
- Capturing and reviewing job photos as proof of work or proof of deficiency resolution.
- Showing admins where interior production work is blocked, stale, missing evidence, or ready to archive.
- Keeping client and project context close to the field workflow.

### Out Of Scope

Do not design this as a broad construction management platform. Titan PM should not feel like it is trying to manage:

- Land development
- Estimating
- Bidding
- Permitting
- Framing
- Exterior envelope
- Roofing
- Concrete
- Excavation
- Mechanical/electrical/plumbing
- Full general-contractor scheduling
- Commercial construction portfolios
- Accounting, payroll, invoicing, or procurement systems
- Heavy equipment fleet management
- Customer-facing portals

The focus is residential interior production: insulation, drywall, finishing, inspection readiness, issues, evidence, and closeout.

## Mobile Redesign Goal

The goal is to make Titan PM easier to use in the field on a phone.

The current product has several strong operating concepts: project lists, phase detail, inspection actions, deficiencies, photos, materials, equipment, subcontractors, inventory visibility, command center risk, activity history, and archive readiness. The mobile redesign should preserve those concepts but make the phone experience faster, clearer, and more action-oriented.

The mobile app should prioritize:

- Fast triage
- Clear phase status
- One-handed scanning
- Jobsite-friendly actions
- Photo and evidence workflows
- Reduced navigation depth
- Clear next steps
- Strong separation between active work, blocked work, ready inspections, and completed work

## Primary Users

## Project Manager

The project manager is the most important mobile user.

They move between homes and need to quickly understand the state of assigned interior jobs. They use Titan PM to check phase progress, coordinate subcontractors, inspect readiness, document issues, review evidence, update notes, and resolve blockers.

### Project Manager Mobile Needs

- See today’s most important interior jobs first.
- Open a job and immediately understand insulation, drywall, and finishing status.
- Record or review site blocks.
- Mark or review inspection readiness.
- Record failed inspection outcomes.
- Track deficiencies and their resolution.
- View or add photos tied to the right project, phase, gate, or deficiency.
- Check material and equipment context before calling the shop or subcontractor.
- Contact or identify the right subcontractor.
- See what changed recently without digging.

## Admin

Admins use Titan PM to oversee all residential interior production work.

On mobile, admins need a compact executive view of what is at risk, what is blocked, which inspections need attention, which jobs are missing evidence, and which completed jobs can be archived.

### Admin Mobile Needs

- See the highest-risk interior jobs quickly.
- Identify blocked, failed, stale, and missing-evidence projects.
- Review project manager workload pressure.
- Open the most urgent project from the risk view.
- Review client/project context.
- Check activity history.
- Manage organization users when necessary, but this is secondary to operational visibility.

## Inventory User

Inventory users need limited, focused visibility into active residential interior jobs.

They do not need the full project-management experience. They need to see active projects, materials, equipment, pickup status, and audit needs related to insulation, drywall, and finishing.

### Inventory Mobile Needs

- See active interior jobs across project managers.
- Review material and equipment quantities.
- Check pickup history.
- See audit requests.
- Avoid unrelated project controls.

## Core Mobile Use Cases

## 1. Morning Interior Production Triage

A project manager opens the app and sees assigned residential interior jobs ordered by urgency.

The app should immediately surface:

- Blocked insulation, drywall, or finishing phases.
- Ready inspections.
- Failed inspections.
- Missing attic evidence.
- Stale work.
- Projects nearing completion.
- Recent updates.

The user should not have to scan a large desktop-style dashboard on mobile.

## 2. Jobsite Phase Review

A project manager arrives at a residential job and opens the project.

The mobile screen should make the three interior phases obvious:

- Insulation
- Drywall
- Finishing

Each phase should show status, schedule context, subcontractor context, inspection/gate state, deficiencies, photos, and next action.

The app should answer: “What is the current state of interior work at this home?”

## 3. Inspection Readiness And Result

When a phase is ready for inspection, the app should make that state highly visible.

The project manager should be able to:

- See which phase is ready.
- Review supporting details.
- Record pass or fail.
- Capture notes.
- Attach or review photos.
- Create or update deficiencies after a failed result.

Inspection workflows should feel direct and field-friendly.

## 4. Blocked Work Follow-Up

If a site check or phase is blocked, the mobile app should clearly explain:

- What is blocked.
- Which phase or gate is affected.
- Why it is blocked.
- Who owns the next step.
- What action can clear it.

Blocked work should be one of the strongest mobile visual states.

## 5. Deficiency Resolution

A deficiency is a work issue that needs follow-up, often after a failed inspection or field problem.

On mobile, a deficiency should show:

- Title
- Severity
- Phase
- Description
- Assigned subcontractor, if any
- Status
- Before/after photos
- Resolution notes
- Recent activity

The experience should make it easy to understand what is wrong and what proof is needed to close it.

## 6. Photo Evidence Capture And Review

Photos are central to Titan PM because residential interior work often needs proof:

- Attic evidence
- Inspection evidence
- Deficiency before photos
- Deficiency after photos
- General project documentation

The mobile redesign should make photo capture and review feel native to the workflow, not like a separate file-storage area.

Photos should always feel attached to a project, phase, inspection, attic check, or deficiency.

## 7. Material And Equipment Check

For insulation, drywall, and finishing work, project managers and inventory users need to understand material and equipment context.

Mobile views should support quick review of:

- Phase materials
- Project equipment
- Quantities
- Pickup history
- Audit requests

Inventory should be readable quickly and should not crowd out phase status or inspection actions.

## 8. Admin Risk Review

Admins need a mobile version of the command center that focuses on interior production risk.

The highest-value admin mobile view should show:

- Blocked work
- Failed inspections
- Ready inspections
- Missing attic evidence
- Aging pressure
- Project manager pressure
- Client pressure
- Archive-ready jobs

Admin mobile should support opening the urgent project directly from the risk item.

## 9. Client And Project Lookup

The team needs to search clients and projects quickly from mobile.

The mobile design should support:

- Searching by client name
- Searching by project name or number
- Opening a client
- Seeing active and historical projects for that client
- Jumping into a project detail view

This is a support workflow, not the main field workflow.

## 10. Closeout And Archive Review

When interior work is completed, Titan PM helps confirm that the project has the evidence and status needed for closeout.

Mobile archive review should make it clear:

- Which jobs are completed.
- Which jobs are ready to archive.
- Whether required evidence exists.
- What historical information will remain available.

## Primary Mobile Screens To Consider

## Home / Today

The most important mobile screen should be a practical “what needs attention” view.

Recommended content:

- Assigned active jobs
- Blocked jobs
- Ready inspections
- Failed inspections
- Missing attic evidence
- Recent updates
- Quick search

This should not feel like a desktop dashboard squeezed onto a phone.

## Project Detail

The project detail screen is the center of the mobile experience.

Recommended content hierarchy:

1. Project name, number, client, address
2. Current overall status
3. Interior phase summary: insulation, drywall, finishing
4. Urgent alerts: blocked, failed, missing evidence, ready inspection
5. Next actions
6. Photos/evidence
7. Deficiencies
8. Materials/equipment
9. Notes and activity

## Phase Detail

Phase detail should be optimized around one interior phase at a time.

Recommended content:

- Phase type: insulation, drywall, or finishing
- Phase status
- Site check
- Inspection state
- Schedule context
- Assigned subcontractor
- Deficiencies
- Photos
- Materials
- Activity

## Command Center

The mobile Command Center should be designed for admin triage, not deep analysis.

Recommended content:

- Top risk summary
- Critical blockers
- Failed inspections
- Ready inspections
- Missing attic evidence
- Stale jobs
- Archive-ready jobs
- Tap-through project actions

## Inventory

Inventory mobile screens should be narrower and calmer than project-management screens.

Recommended content:

- Active interior projects
- Materials
- Equipment
- Pickup history
- Audit requests

## Activity

Activity should help users understand what changed recently.

Recommended content:

- Time
- Actor
- Project
- Phase or entity affected
- Change summary
- Link back to the relevant project or phase

## UX Principles For The Redesign

## Make Phase State Instantly Clear

The app should always make it obvious where a job stands across insulation, drywall, and finishing.

These three phases are the product’s backbone.

## Prioritize Action Over Reporting

The mobile experience should not only display information. It should help users act:

- Open urgent project
- Mark inspection result
- Review deficiency
- Add evidence
- Check materials
- Contact subcontractor
- Clear a blocker

## Design For The Field

Assume users are distracted, moving, and often checking the app between calls or site visits.

Use:

- Large tap targets
- Short labels
- Clear status language
- Sticky critical actions where appropriate
- Minimal typing
- Strong search
- Quick photo access

## Keep Admin And Field Views Distinct

Admins need organization-wide risk.

Project managers need assigned job action.

Inventory users need material/equipment visibility.

The mobile redesign should not force every role through the same screen hierarchy.

## Treat Photos As Evidence, Not Decoration

Photos should be part of job proof and issue resolution. They should feel connected to inspections, attic checks, deficiencies, and project history.

## Use Status Language Consistently

Use consistent terms throughout the mobile experience:

- Not started
- In progress
- Ready for inspection
- Blocked
- Failed
- Passed
- Closed
- Completed
- Archived

Avoid generic labels that do not explain the field condition.

## What Google Stitch Should Not Produce

Do not design a generic construction SaaS dashboard.

Do not create a broad project-management app with generic tasks, budgets, milestones, or Gantt-first views.

Do not center the experience on commercial construction, estimating, bidding, accounting, or full general-contractor workflows.

Do not make the mobile app feel like a marketing website.

Do not hide insulation, drywall, and finishing behind generic “phases” without naming them.

Do not treat photos as a gallery disconnected from proof, inspections, attic checks, and deficiencies.

Do not make inventory the main product. Inventory supports the interior construction workflow.

## Success Criteria For The Mobile Redesign

The redesign succeeds if a user can quickly answer:

- Which residential interior jobs need attention today?
- What is the state of insulation, drywall, and finishing on this project?
- Is any work blocked?
- Is anything ready for inspection?
- Did anything fail inspection?
- What deficiencies exist?
- What evidence is missing?
- What photos prove the work?
- What materials or equipment are tied to the job?
- Who owns the next action?

The mobile app should feel purpose-built for residential interiors construction, not adapted from a broad construction management template.
