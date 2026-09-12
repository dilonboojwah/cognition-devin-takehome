"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  label: string;
  variant?: "default" | "destructive" | "outline" | "secondary";
  disabled?: boolean;
  /** Server action. Return a string to show an error inline. */
  action: (values: Record<string, string>) => Promise<string | void>;
};

/** Mutate on click, no confirmation. For actions safe enough to run unconfirmed. */
export function ActionButton({ label, variant, disabled, action }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button
        variant={variant}
        size="sm"
        disabled={disabled || pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const message = await action({});
            if (message) {
              setError(message);
              return;
            }
            router.refresh();
          })
        }
      >
        {pending ? "Working…" : label}
      </Button>
      {error && <span className="text-[11px] text-destructive">{error}</span>}
    </span>
  );
}
