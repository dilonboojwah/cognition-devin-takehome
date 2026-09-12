"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type RolloutAction = (
  flagId: string,
  values: Record<string, string>,
) => Promise<string | void>;

type RolloutContext = {
  editing: boolean;
  pending: boolean;
  value: string;
  error: string | null;
  setValue: (value: string) => void;
  begin: () => void;
  cancel: () => void;
  save: () => void;
};

const Context = createContext<RolloutContext | null>(null);

function useRollout() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("Rollout components must sit inside RolloutEditor");
  return ctx;
}

/** Wraps the flag detail card so the actions-row button and the Rollout
 *  field share edit state: clicking "Set rollout %" makes the field
 *  itself editable, in place. */
export function RolloutEditor({
  flagId,
  current,
  action,
  children,
}: {
  flagId: string;
  current: number;
  action: RolloutAction;
  children: ReactNode;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(current));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const ctx: RolloutContext = {
    editing,
    pending,
    value,
    error,
    setValue,
    begin: () => {
      setValue(String(current));
      setError(null);
      setEditing(true);
    },
    cancel: () => setEditing(false),
    save: () =>
      startTransition(async () => {
        setError(null);
        const result = await action(flagId, { rolloutPercent: value });
        if (result) {
          setError(result);
        } else {
          setEditing(false);
          router.refresh();
        }
      }),
  };

  return <Context.Provider value={ctx}>{children}</Context.Provider>;
}

/** Sits in the detail card's actions row; makes the Rollout field editable. */
export function SetRolloutButton() {
  const { begin } = useRollout();
  return (
    <Button type="button" variant="secondary" onClick={begin}>
      Set rollout %
    </Button>
  );
}

/** The Rollout field: plain text until SetRolloutButton flips it to an input. */
export function RolloutValue({ current }: { current: number }) {
  const { editing, pending, value, error, setValue, cancel, save } = useRollout();
  const inputRef = useRef<HTMLInputElement>(null);

  if (!editing) {
    // h-7 matches the input+button height so entering edit mode moves nothing.
    return (
      <span className="flex h-7 items-center tabular-nums">{current}%</span>
    );
  }

  return (
    <span
      className="flex h-7 items-center gap-2"
      // Clicking anywhere outside this field cancels the edit; the Save
      // button stays inside so it still works.
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) cancel();
      }}
    >
      <Input
        ref={inputRef}
        autoFocus
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") save();
          if (event.key === "Escape") cancel();
        }}
        className="h-7 w-20 text-[13px] tabular-nums"
        aria-label="Rollout percent"
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={save}
        className="h-7 text-[12px]"
      >
        Save
      </Button>
      {error && <span className="text-[12px] text-destructive">{error}</span>}
    </span>
  );
}
