import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { updateUser, type UpdateUserInput } from "@/lib/api";
import type { User } from "@/lib/types";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  onUpdated?: () => void;
}

const empty: UpdateUserInput = { fullName: "" };

export function SettingsDialog({ open, onOpenChange, user, onUpdated }: SettingsDialogProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState<UpdateUserInput>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("theme") !== "light");
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem("accentColor") ?? "blue");

  useEffect(() => {
    if (user) {
      setForm({
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
      });
    } else {
      setForm(empty);
    }
    setErrors({});
  }, [user, open]);

  const reset = () => {
    setForm(empty);
    setErrors({});
  };

  const mutation = useMutation({
    mutationFn: (data: UpdateUserInput) => updateUser(user.id, data),
    onSuccess: (res) => {
      if (res.ok === true) {
        toast.success("Profile updated");
        qc.invalidateQueries({ queryKey: ["me"] });
        qc.invalidateQueries({ queryKey: ["users"] });
        reset();
        onOpenChange(false);
        onUpdated?.();
        return;
      }
      setErrors(res.error.fieldErrors ?? {});
      toast.error(res.error.message);
    },
  });

  const setField = <K extends keyof UpdateUserInput>(key: K, value: UpdateUserInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key as string]) setErrors((e) => ({ ...e, [key as string]: "" }));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Edit your profile information and preferences.</DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4 py-2"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate(form);
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={form.fullName}
              onChange={(e) => setField("fullName", e.target.value)}
              placeholder="Your full name"
              autoFocus
            />
            {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone ?? ""} onChange={(e) => setField("phone", e.target.value)} placeholder="555-0100" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email ?? ""}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="dark-mode">Dark mode</Label>
              <p className="text-xs text-muted-foreground">Toggle between light and dark themes</p>
            </div>
            <Switch
              id="dark-mode"
              checked={darkMode}
              onCheckedChange={(isDark) => {
                setDarkMode(isDark);
                document.documentElement.classList.toggle("light", !isDark);
                localStorage.setItem("theme", isDark ? "dark" : "light");
              }}
            />
          </div>

          <div className="space-y-2 py-2">
            <div className="space-y-0.5">
              <Label>Primary color</Label>
              <p className="text-xs text-muted-foreground">Choose your preferred accent color</p>
            </div>
            <div className="flex gap-2">
              {([
                { key: "blue",    hex: "#3b82f6", label: "Blue" },
                { key: "green",   hex: "#22c55e", label: "Green" },
                { key: "purple",  hex: "#8b5cf6", label: "Purple" },
                { key: "orange",  hex: "#f97316", label: "Orange" },
                { key: "magenta", hex: "#ec4899", label: "Magenta" },
              ] as const).map(({ key, hex, label }) => (
                <button
                  key={key}
                  type="button"
                  title={label}
                  aria-label={`Set primary color to ${label}`}
                  className="relative h-8 w-8 rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  style={{
                    backgroundColor: hex,
                    boxShadow: accentColor === key
                      ? `0 0 0 2px hsl(var(--background)), 0 0 0 4px ${hex}`
                      : undefined,
                  }}
                  onClick={() => {
                    setAccentColor(key);
                    if (key === "blue") {
                      document.documentElement.removeAttribute("data-accent");
                      localStorage.removeItem("accentColor");
                    } else {
                      document.documentElement.setAttribute("data-accent", key);
                      localStorage.setItem("accentColor", key);
                    }
                  }}
                />
              ))}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
