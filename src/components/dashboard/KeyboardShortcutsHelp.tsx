import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SectionHeading } from "@/components/ui/section-heading";
import { Fragment } from "react";

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsHelp({ open, onOpenChange }: KeyboardShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div>
            <SectionHeading as="h3" className="text-base mb-3">Global Navigation</SectionHeading>
            <div className="space-y-2">
              <ShortcutRow keys={["Cmd", "K"]} description="Open Command Palette" />
              <ShortcutRow keys={["Cmd", "/"]} description="Focus search input" />
              <ShortcutRow keys={["G", "P"]} description="Go to Projects (Dashboard)" />
              <ShortcutRow keys={["G", "C"]} description="Go to Clients" />
              <ShortcutRow keys={["G", "S"]} description="Go to Subcontractors" />
              <ShortcutRow keys={["G", "A"]} description="Go to Activity Log" />
            </div>
          </div>

          <div>
            <SectionHeading as="h3" className="text-base mb-3">Forms & Editing</SectionHeading>
            <div className="space-y-2">
              <ShortcutRow keys={["Cmd", "Enter"]} description="Submit form (dialogs)" />
              <ShortcutRow keys={["Cmd", "S"]} description="Save project notes" />
            </div>
          </div>

          <div>
            <SectionHeading as="h3" className="text-base mb-3">Actions</SectionHeading>
            <div className="space-y-2">
              <ShortcutRow keys={["N"]} description="New item (context-aware)" />
              <ShortcutRow keys={["E"]} description="Edit (context-aware)" />
            </div>
          </div>

          <div>
            <SectionHeading as="h3" className="text-base mb-3">Help</SectionHeading>
            <div className="space-y-2">
              <ShortcutRow keys={["?"]} description="Show this help dialog" />
              <ShortcutRow keys={["Esc"]} description="Close dialogs" />
            </div>
          </div>

          <p className="text-xs text-muted-foreground pt-2">
            All shortcuts are desktop-only (viewport ≥768px) and ignored when typing in input fields.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ShortcutRow({ keys, description }: { keys: string[]; description: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{description}</span>
      <div className="flex gap-1">
        {keys.map((key, i) => (
          <Fragment key={key}>
            <kbd className="inline-flex items-center rounded border border-border bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
              {key}
            </kbd>
            {i < keys.length - 1 && <span className="text-muted-foreground text-xs">+</span>}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
