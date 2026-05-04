import { Activity, AlertTriangle, ClipboardCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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
  accent: string;
  hint?: string;
}

function Stat({ label, value, icon, accent, hint }: StatProps) {
  return (
    <Card className="bg-gradient-surface border-border p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
          <p className="text-3xl font-bold mt-2 tabular-nums">{value}</p>
          {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
        </div>
        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", accent)}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

export function StatsRow({ activeProjects, blockedItems, inspectionsDueThisWeek, loading }: StatsRowProps) {
  if (loading) {
    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[112px] rounded-lg" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
      <Stat
        label="Active projects"
        value={activeProjects}
        hint="Visible to your role"
        icon={<Activity className="h-5 w-5 text-primary" />}
        accent="bg-primary/15"
      />
      <Stat
        label="Blocked items"
        value={blockedItems}
        hint="Across phases & gates"
        icon={<AlertTriangle className="h-5 w-5 text-status-blocked" />}
        accent="bg-status-blocked/15"
      />
      <Stat
        label="Inspections due"
        value={inspectionsDueThisWeek}
        hint="Phases ready for inspection"
        icon={<ClipboardCheck className="h-5 w-5 text-status-ready" />}
        accent="bg-status-ready/15"
      />
    </div>
  );
}
