import { ROLE_LABELS, type Role } from "@/lib/authorize";
import { cn } from "@/lib/utils";

/** Each role keeps the same tint everywhere it appears. */
const TINTS: Record<Role, string> = {
  ops_analyst: "border-sky-200 bg-sky-50 text-sky-900",
  kyc_reviewer: "border-violet-200 bg-violet-50 text-violet-900",
  finance_admin: "border-emerald-200 bg-emerald-50 text-emerald-900",
  eng_admin: "border-amber-200 bg-amber-50 text-amber-900",
};

export function RoleBadge({ role, className }: { role: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] leading-none whitespace-nowrap",
        TINTS[role as Role] ?? "border-border bg-muted text-muted-foreground",
        className,
      )}
    >
      {ROLE_LABELS[role as Role] ?? role}
    </span>
  );
}
