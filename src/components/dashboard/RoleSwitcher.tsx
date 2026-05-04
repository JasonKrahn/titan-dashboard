import { ChevronDown, UserCog } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { User } from "@/lib/types";
import { initials } from "@/lib/derived";

interface RoleSwitcherProps {
  current: User;
  users: User[];
  onSwitch: (userId: string) => void;
}

export function RoleSwitcher({ current, users, onSwitch }: RoleSwitcherProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors">
        <div className="h-7 w-7 rounded-full bg-primary/15 text-primary text-xs font-semibold flex items-center justify-center border border-primary/30">
          {initials(current.fullName)}
        </div>
        <div className="text-left hidden sm:block">
          <div className="text-xs font-medium leading-tight">{current.fullName}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {current.role === "admin" ? "Admin" : "Project Manager"}
          </div>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex items-center gap-2">
          <UserCog className="h-3.5 w-3.5" /> Demo: switch role
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {users.map((u) => (
          <DropdownMenuItem key={u.id} onClick={() => onSwitch(u.id)} className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-muted text-xs flex items-center justify-center">
              {initials(u.fullName)}
            </div>
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
