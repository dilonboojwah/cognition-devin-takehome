"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setViewAsUser } from "@/lib/auth-actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RoleBadge } from "@/components/kit/RoleBadge";
import { cn } from "@/lib/utils";

type Option = { id: string; name: string; role: string };

/** Dev mode identity seam. Hidden in SSO mode. */
export function UserSwitcher({ users, currentId }: { users: Option[]; currentId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  const current = users.find((user) => user.id === currentId);

  return (
    <div className="flex items-center gap-2.5">
      <span className="eyebrow">Role selector</span>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          disabled={pending}
          aria-label="Switch user"
          className="flex h-12 items-center gap-2.5 rounded-md border border-input bg-transparent px-4 text-base whitespace-nowrap outline-none transition-colors select-none hover:bg-accent focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          {current?.name ?? "Choose user"}
          {current && <RoleBadge role={current.role} className="px-3 py-1 text-sm" />}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-64">
          {users.map((user) => (
            <DropdownMenuItem
              key={user.id}
              className={cn("text-[13px]", user.id === currentId && "bg-accent")}
              onSelect={() =>
                startTransition(async () => {
                  setFailed(false);
                  try {
                    await setViewAsUser(user.id);
                    router.refresh();
                  } catch {
                    setFailed(true);
                  }
                })
              }
            >
              <span className="flex w-full items-center justify-between gap-6">
                {user.name}
                <RoleBadge role={user.role} />
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {failed && (
        <span className="text-[11px] text-destructive" role="alert">
          Could not switch user
        </span>
      )}
    </div>
  );
}
