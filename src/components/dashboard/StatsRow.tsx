import { Activity, AlertTriangle, ClipboardCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { IconWell } from "@/components/ui/icon-well";
import { SectionHeading } from "@/components/ui/section-heading";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsRowProps {
  activeProjects: number;
  blockedItems: number;
  inspectionsDueThisWeek: number;
  loading?: boolean;
}

interface StatProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "primary" | "danger" | "ready";
  hint?: string;
}

function Stat({ label, value, icon, tone, hint }: StatProps) {
  return (
    <Card surface="panel" className="p-3 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <SectionHeading as="p" size="sm" className="sm:text-xs">
            {label}
          </SectionHeading>
          <p className="text-xl sm:text-3xl font-bold mt-1 sm:mt-2 tabular-nums">{value}</p>
          {hint && <p className="hidden md:block text-xs text-muted-foreground mt-1">{hint}</p>}
        </div>
        <IconWell tone={tone} size="xl" shape="panel" className="h-7 w-7 border-transparent sm:h-10 sm:w-10">
          {icon}
        </IconWell>
      </div>
    </Card>
  );
}

export function StatsRow({ activeProjects, blockedItems, inspectionsDueThisWeek, loading }: StatsRowProps) {
  if (loading) {
    return (
      <div className="grid gap-2 grid-cols-3 sm:gap-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[68px] sm:h-[112px] rounded-lg" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-2 grid-cols-3 sm:gap-4">
      <Stat
        label="Active projects"
        value={activeProjects}
        hint="Visible to your role"
        icon={<Activity className="h-5 w-5 text-primary" />}
        tone="primary"
      />
      <Stat
        label="Blocked items"
        value={blockedItems}
        hint="Across phases & gates"
        icon={<AlertTriangle className="h-5 w-5 text-status-blocked" />}
        tone="danger"
      />
      <Stat
        label="Inspections due"
        value={inspectionsDueThisWeek}
        hint="Phases ready for inspection"
        icon={<ClipboardCheck className="h-5 w-5 text-status-ready" />}
        tone="ready"
      />
    </div>
  );
}
