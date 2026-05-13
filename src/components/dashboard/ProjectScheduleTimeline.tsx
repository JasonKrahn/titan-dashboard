import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { PHASE_LABEL, computePhaseHealth, phaseHealthClasses } from "@/lib/derived";
import {
  computeScheduleDraft,
  daysBetween,
  formatDateWithOptions,
  orderedSchedulePhases,
  parseScheduleDate,
  toScheduleDate,
  type PhaseScheduleChange,
  type ScheduleDragMode,
  type ScheduleDraftResult,
} from "@/lib/schedule";
import type { Deficiency, Gate, Phase, Project } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ProjectScheduleTimelineProps {
  project: Project;
  phases: Phase[];
  gates?: Gate[];
  deficiencies?: Deficiency[];
  onScheduleChange: (changes: PhaseScheduleChange[]) => void;
  saving?: boolean;
  errorMessage?: string | null;
}

type DragState = {
  phaseId: string;
  mode: ScheduleDragMode;
  startX: number;
};

export function ProjectScheduleTimeline({
  project,
  phases,
  gates = [],
  deficiencies = [],
  onScheduleChange,
  saving,
  errorMessage,
}: ProjectScheduleTimelineProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draftRef = useRef<ScheduleDraftResult | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [draft, setDraft] = useState<ScheduleDraftResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const orderedPhases = useMemo(() => orderedSchedulePhases(phases), [phases]);
  const readOnly = project.status === "completed" || project.status === "archived" || saving;
  const projectStart = project.scheduledStart;
  const projectEnd = project.scheduledEnd;
  const totalDays = projectStart && projectEnd ? daysBetween(projectStart, projectEnd) : 1;
  const projected = draft?.ok ? draft.phases : [];

  useEffect(() => {
    setDraft(null);
    draftRef.current = null;
    setMessage(null);
  }, [phases]);

  useEffect(() => {
    if (!drag || !projectStart || !projectEnd) return;

    const trackWidth = () => Math.max(1, trackRef.current?.getBoundingClientRect().width ?? 1);

    const updateDraft = (clientX: number) => {
      const deltaDays = Math.round((clientX - drag.startX) / (trackWidth() / totalDays));
      const nextDraft = computeScheduleDraft({
        phases,
        projectStart,
        projectEnd,
        phaseId: drag.phaseId,
        mode: drag.mode,
        deltaDays,
      });
      draftRef.current = nextDraft;
      setDraft(nextDraft);
      setMessage(nextDraft.ok ? null : nextDraft.message);
    };

    const onPointerMove = (event: PointerEvent) => updateDraft(event.clientX);
    const onPointerUp = () => {
      const current = draftRef.current;
      if (current?.ok && current.changes.length > 0) {
        onScheduleChange(current.changes);
      } else if (current && !current.ok) {
        setMessage(current.message);
      }
      setDrag(null);
      draftRef.current = null;
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [drag, onScheduleChange, phases, projectEnd, projectStart, totalDays]);

  if (!projectStart || !projectEnd) {
    return (
      <Card surface="panel" className="rounded-xl p-4 sm:p-5">
        <SectionHeading as="h2">Project Schedule</SectionHeading>
        <p className="mt-2 text-sm text-muted-foreground">Set project start and end dates to enable timeline scheduling.</p>
      </Card>
    );
  }

  const projectStartMs = parseScheduleDate(projectStart);
  const projectEndMs = parseScheduleDate(projectEnd);
  const totalMs = Math.max(1, projectEndMs - projectStartMs);
  const todayMs = parseScheduleDate(toScheduleDate(Date.now()));
  const todayPct = ((todayMs - projectStartMs) / totalMs) * 100;

  const scheduleFor = (phase: Phase) => {
    const projectedPhase = projected.find((item) => item.phaseId === phase.id);
    return {
      scheduledStart: projectedPhase?.scheduledStart ?? phase.scheduledStart,
      scheduledEnd: projectedPhase?.scheduledEnd ?? phase.scheduledEnd,
    };
  };

  const startDrag = (event: ReactPointerEvent<HTMLElement>, phaseId: string, mode: ScheduleDragMode) => {
    if (readOnly) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setMessage(null);
    setDrag({ phaseId, mode, startX: event.clientX });
  };

  return (
    <Card surface="panel" className="rounded-xl p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <SectionHeading as="h2">Project Schedule</SectionHeading>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDateWithOptions(projectStart, { showYear: false })} - {formatDateWithOptions(projectEnd, { showYear: false })}
          </p>
        </div>
        {readOnly && (
          <span className="w-fit rounded-md border border-border bg-muted px-2 py-1 text-xs text-muted-foreground">
            Read-only
          </span>
        )}
      </div>

      {(message || errorMessage) && (
        <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {message || errorMessage}
        </div>
      )}

      {/* Desktop Gantt View - Hidden on Mobile */}
      <div className="hidden md:block mt-4">
        <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3 text-xs text-muted-foreground">
          <div>Phase</div>
          <div className="relative h-6">
            <span className="absolute left-0 top-0">{formatDateWithOptions(projectStart, { showYear: false })}</span>
            <span className="absolute right-0 top-0">{formatDateWithOptions(projectEnd, { showYear: false })}</span>
            {todayPct >= 0 && todayPct <= 100 && (
              <span
                className="absolute top-0 -translate-x-1/2 rounded-sm bg-status-blocked px-1 py-0.5 text-[10px] font-medium text-status-blocked-foreground"
                style={{ left: `${todayPct}%` }}
              >
                Today
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-x-3 gap-y-2">
          {orderedPhases.map((phase) => {
            const schedule = scheduleFor(phase);
            if (!schedule.scheduledStart || !schedule.scheduledEnd) return null;

            const startMs = parseScheduleDate(schedule.scheduledStart);
            const endMs = parseScheduleDate(schedule.scheduledEnd);
            const left = Math.max(0, ((startMs - projectStartMs) / totalMs) * 100);
            const width = Math.max(3, ((endMs - startMs) / totalMs) * 100);
            const phaseGates = gates.filter((gate) => gate.phaseId === phase.id);
            const phaseDefs = deficiencies.filter((deficiency) => deficiency.phaseId === phase.id);
            const health = computePhaseHealth(phase, phaseGates, phaseDefs);
            const classes = phaseHealthClasses(health.tone);

            return (
              <div key={phase.id} className="contents">
                <div className="flex min-h-14 items-center">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{PHASE_LABEL[phase.type]}</div>
                    <div className="text-[11px] text-muted-foreground">{health.label}</div>
                  </div>
                </div>
                <div ref={trackRef} className="relative min-h-14 border-l border-r border-border/70 bg-muted/20">
                  {todayPct >= 0 && todayPct <= 100 && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-1 w-px bg-status-blocked/80"
                      style={{ left: `${todayPct}%` }}
                    />
                  )}
                  <div
                    role="group"
                    aria-label={`${PHASE_LABEL[phase.type]} schedule`}
                    onPointerDown={(event) => startDrag(event, phase.id, "move")}
                    className={cn(
                      "absolute top-1/2 flex min-h-11 -translate-y-1/2 items-center justify-center overflow-hidden rounded-md border px-2 text-center text-xs shadow-card transition",
                      readOnly ? "cursor-default" : "cursor-grab active:cursor-grabbing",
                      classes.bg,
                      classes.border,
                      classes.text,
                      drag?.phaseId === phase.id && "ring-2 ring-primary/60",
                    )}
                    style={{ left: `${left}%`, width: `${width}%`, minWidth: 64 }}
                  >
                    <span className="truncate font-semibold">{formatDateWithOptions(schedule.scheduledStart, { showYear: false })} - {formatDateWithOptions(schedule.scheduledEnd, { showYear: false })}</span>
                    {!readOnly && (
                      <>
                        <span
                          role="button"
                          tabIndex={-1}
                          aria-label={`Resize ${PHASE_LABEL[phase.type]} start date`}
                          onPointerDown={(event) => startDrag(event, phase.id, "resize-start")}
                          className="absolute inset-y-0 left-0 w-4 cursor-ew-resize bg-foreground/10"
                        />
                        <span
                          role="button"
                          tabIndex={-1}
                          aria-label={`Resize ${PHASE_LABEL[phase.type]} end date`}
                          onPointerDown={(event) => startDrag(event, phase.id, "resize-end")}
                          className="absolute inset-y-0 right-0 w-4 cursor-ew-resize bg-foreground/10"
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Summary Bar - Always visible on mobile */}
      <div className="md:hidden mt-4">
        <button
          type="button"
          onClick={() => setMobileExpanded(!mobileExpanded)}
          className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-3 text-left"
        >
          <div className="flex items-center gap-3">
            <ChevronDown className={cn("h-4 w-4 transition-transform", mobileExpanded && "rotate-180")} />
            <span className="font-medium">Schedule</span>
            <span className="text-xs text-muted-foreground">
              {orderedPhases.filter(p => p.scheduledStart && p.scheduledEnd).length} phases · {formatDateWithOptions(projectStart, { showYear: false })} - {formatDateWithOptions(projectEnd, { showYear: false })}
            </span>
          </div>
          {readOnly && (
            <span className="text-xs text-muted-foreground">Read-only</span>
          )}
        </button>
      </div>

      {/* Mobile Vertical Phase List - Expandable */}
      {mobileExpanded && (
        <div className="md:hidden mt-3 space-y-3">
          {orderedPhases.map((phase) => {
            const schedule = scheduleFor(phase);
            if (!schedule.scheduledStart || !schedule.scheduledEnd) return null;

            const startMs = parseScheduleDate(schedule.scheduledStart);
            const endMs = parseScheduleDate(schedule.scheduledEnd);
            const left = Math.max(0, ((startMs - projectStartMs) / totalMs) * 100);
            const width = Math.max(3, ((endMs - startMs) / totalMs) * 100);
            const phaseGates = gates.filter((gate) => gate.phaseId === phase.id);
            const phaseDefs = deficiencies.filter((deficiency) => deficiency.phaseId === phase.id);
            const health = computePhaseHealth(phase, phaseGates, phaseDefs);
            const classes = phaseHealthClasses(health.tone);
            const duration = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24));

            return (
              <div
                key={phase.id}
                className={cn(
                  "rounded-lg border p-3",
                  classes.bg,
                  classes.border
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{PHASE_LABEL[phase.type]}</span>
                  <span className={cn("text-xs", classes.text)}>{health.label}</span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatDateWithOptions(schedule.scheduledStart, { showYear: false })}</span>
                  <span>→</span>
                  <span>{formatDateWithOptions(schedule.scheduledEnd, { showYear: false })}</span>
                  <span className="ml-auto">({duration} days)</span>
                </div>
                {/* Mini timeline bar */}
                <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", classes.bg.replace('/15', ''))}
                    style={{ marginLeft: `${left}%`, width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
