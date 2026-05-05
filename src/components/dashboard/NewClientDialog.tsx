import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createClient, type CreateClientInput } from "@/lib/api";

interface NewClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (clientId: string) => void;
}

const empty: CreateClientInput = { name: "" };

export function NewClientDialog({ open, onOpenChange, onCreated }: NewClientDialogProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState<CreateClientInput>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reset = () => {
    setForm(empty);
    setErrors({});
  };

  const mutation = useMutation({
    mutationFn: createClient,
    onSuccess: (res) => {
      if (res.ok === true) {
        toast.success(`Client "${res.data.name}" created`);
        qc.invalidateQueries({ queryKey: ["clients"] });
        reset();
        onOpenChange(false);
        onCreated?.(res.data.id);
        return;
      }
      setErrors(res.error.fieldErrors ?? {});
      toast.error(res.error.message);
    },
  });

  const setField = <K extends keyof CreateClientInput>(key: K, value: CreateClientInput[K]) => {
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
          <DialogTitle>New client</DialogTitle>
          <DialogDescription>Add a customer record to attach projects to.</DialogDescription>
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
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="e.g. Northbridge Developments"
              autoFocus
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="contact">Primary contact</Label>
            <Input
              id="contact"
              value={form.primaryContactName ?? ""}
              onChange={(e) => setField("primaryContactName", e.target.value)}
              placeholder="Jane Doe"
            />
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
                placeholder="contact@example.com"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="billing">Billing address</Label>
            <Textarea
              id="billing"
              value={form.billingAddress ?? ""}
              onChange={(e) => setField("billingAddress", e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={form.notes ?? ""} onChange={(e) => setField("notes", e.target.value)} rows={2} />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating…" : "Create client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
