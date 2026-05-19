import { useNavigate } from "react-router-dom";
import { CommandDialog, CommandInput, CommandList, CommandItem, CommandGroup } from "@/components/ui/command";
import { FolderKanban, Building2, Users, Activity } from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();

  const handleNavigate = (path: string, options?: Parameters<typeof navigate>[1]) => {
    navigate(path, options);
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => handleNavigate("/", { state: { view: "dashboard" } })}>
            <FolderKanban className="mr-2 h-4 w-4" />
            <span>Projects</span>
          </CommandItem>
          <CommandItem onSelect={() => handleNavigate("/", { state: { view: "clients" } })}>
            <Building2 className="mr-2 h-4 w-4" />
            <span>Clients</span>
          </CommandItem>
          <CommandItem onSelect={() => handleNavigate("/subs")}>
            <Users className="mr-2 h-4 w-4" />
            <span>Subcontractors</span>
          </CommandItem>
          <CommandItem onSelect={() => handleNavigate("/activity")}>
            <Activity className="mr-2 h-4 w-4" />
            <span>Activity Log</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
