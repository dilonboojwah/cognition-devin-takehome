"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type DialogField = {
  name: string;
  label: string;
  type?: "text" | "number" | "textarea";
  required?: boolean;
  placeholder?: string;
};

type Props = {
  trigger: string;
  title: string;
  description?: string;
  confirmLabel?: string;
  variant?: "default" | "destructive" | "outline" | "secondary";
  disabled?: boolean;
  /** Shorthand for the common "confirm with an optional note" case. */
  noteLabel?: string;
  requireNote?: boolean;
  /** Extra inputs, for actions that create a record rather than decide one. */
  fields?: DialogField[];
  /** Server action. Return a string to show an error instead of closing. */
  action: (values: Record<string, string>) => Promise<string | void>;
};

/** Confirm-then-mutate. The server action is the authority; this is only UI. */
export function ActionDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  variant = "default",
  disabled,
  noteLabel,
  requireNote,
  fields = [],
  action,
}: Props) {
  const allFields: DialogField[] = noteLabel
    ? [
        ...fields,
        { name: "note", label: noteLabel, type: "textarea", required: requireNote },
      ]
    : fields;

  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const missingRequired = allFields.some(
    (field) => field.required && !(values[field.name] ?? "").trim(),
  );

  function confirm() {
    setError(null);
    startTransition(async () => {
      const message = await action(values);
      if (message) {
        setError(message);
        return;
      }
      setValues({});
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size="sm" disabled={disabled}>
          {trigger}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {allFields.map((field) => {
          const id = `action-field-${field.name}`;
          const value = values[field.name] ?? "";
          const onChange = (next: string) =>
            setValues((current) => ({ ...current, [field.name]: next }));
          return (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={id} className="text-[13px] text-muted-foreground">
                {field.label}
                {field.required ? "" : " (optional)"}
              </Label>
              {field.type === "textarea" ? (
                <Textarea
                  id={id}
                  value={value}
                  placeholder={field.placeholder}
                  onChange={(event) => onChange(event.target.value)}
                  className="resize-none"
                />
              ) : (
                <Input
                  id={id}
                  type={field.type ?? "text"}
                  value={value}
                  placeholder={field.placeholder}
                  onChange={(event) => onChange(event.target.value)}
                />
              )}
            </div>
          );
        })}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            variant={variant}
            size="sm"
            onClick={confirm}
            disabled={pending || missingRequired}
          >
            {pending ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
