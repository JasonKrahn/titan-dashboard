import { ChevronDown, UserCog } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconWell } from "@/components/ui/icon-well";
import type { User } from "@/lib/types";
import { initials } from "@/lib/derived";

interface RoleSwitcherProps {
  current: User;
  users: User[];
  onSwitch: (userId: string) => void;
}

export function RoleSwitcher({ current, users, onSwitch }: RoleSwitcherProps) {
  const filteredUsers = users.filter((u) => u.role !== "inventory_viewer" || current.inventoryEnabled === true);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 transition-colors hover:bg-accent lg:min-h-10">
        <IconWell tone="primary" size="sm" shape="pill" className="text-xs font-semibold">
          {initials(current.fullName)}
        </IconWell>
        <div className="min-w-0 text-left hidden lg:block">
          <div className="max-w-[140px] truncate text-xs font-medium leading-tight">{current.fullName}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {current.role === "admin" ? "Admin" : current.role === "inventory_viewer" ? "Inventory Viewer" : "Project Manager"}
          </div>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex items-center gap-2">
          <UserCog className="h-3.5 w-3.5" /> Demo: switch role
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {filteredUsers.map((u) => (
          <DropdownMenuItem key={u.id} onClick={() => onSwitch(u.id)} className="flex items-center gap-2">
            <IconWell tone="muted" size="sm" shape="pill" className="border-transparent text-xs">
              {initials(u.fullName)}
            </IconWell>
            <div className="flex-1">
              <div className="text-sm">{u.fullName}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{u.role.replace("_", " ")}</div>
            </div>
            {u.id === current.id && <span className="text-[10px] text-primary">current</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
