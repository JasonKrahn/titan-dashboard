import {
  Activity,
  AlertOctagon,
  Archive,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Plus,
  ShieldCheck,
  UserPlus,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { AUDIT_ACTION_TONE, AUDIT_ACTION_PRIORITY, getAuditActionLabel } from "@/lib/audit";

const ACTION_ICON: Record<string, LucideIcon> = {
  activate_project: CheckCircle2,
  archive_project: Archive,
  attic_gate_updated: ShieldCheck,
  complete_project: CheckCircle2,
  create_client: Plus,
  create_deficiency: AlertOctagon,
  create_phase: Plus,
  create_project: Plus,
  create_subcontractor: UserPlus,
  created: Plus,
  deficiency_opened: AlertOctagon,
  deleted: XCircle,
  fail_gate: XCircle,
  inspection_completed: ClipboardCheck,
  pass_gate: CheckCircle2,
  phase_ready_for_inspection: ClipboardCheck,
  photo_uploaded: Camera,
  project_notes_updated: FileText,
  resolve_deficiency: CheckCircle2,
  site_check_blocked: AlertOctagon,
  site_check_cleared: ShieldCheck,
  site_check_completed: ShieldCheck,
  status_changed: Activity,
  subcontractor_assigned: UserPlus,
  update_deficiency: Activity,
  updated: Activity,
  upload_photo: Camera,
  uploaded: Camera,
};

export function actionTone(action: string): BadgeTone {
  return AUDIT_ACTION_TONE[action] ?? "info";
}

export function ActionBadge({
  action,
  size = "sm",
  appearance = "soft",
  className,
}: {
  action: string;
  size?: "xs" | "sm" | "md";
  appearance?: "soft" | "solid" | "outline";
  className?: string;
}) {
  const Icon = ACTION_ICON[action] ?? Activity;
  return (
    <Badge tone={actionTone(action)} appearance={appearance} size={size} icon={Icon} className={className}>
      {getAuditActionLabel(action)}
    </Badge>
  );
}

export function actionPriorityBorder(action: string): string | undefined {
  const p = AUDIT_ACTION_PRIORITY[action];
  if (p === "danger") return "border-l-4 border-l-status-blocked";
  if (p === "warning") return "border-l-4 border-l-status-attention";
  return undefined;
}
