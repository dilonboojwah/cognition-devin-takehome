import { cn } from "@/lib/utils";

/** One place decides how a status string looks, for every tool. */
const TINTS: Record<string, string> = {
  approved: "border-emerald-200 bg-emerald-50 text-emerald-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  enabled: "border-emerald-200 bg-emerald-50 text-emerald-900",
  rejected: "border-red-200 bg-red-50 text-red-900",
  denied: "border-red-200 bg-red-50 text-red-900",
  high: "border-red-200 bg-red-50 text-red-900",
  partially_approved: "border-amber-200 bg-amber-50 text-amber-900",
  escalated: "border-amber-200 bg-amber-50 text-amber-900",
  medium: "border-amber-200 bg-amber-50 text-amber-900",
};

export function humanizeStatus(status: string): string {
  return status.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] leading-none whitespace-nowrap",
        TINTS[status] ?? "border-border bg-muted text-muted-foreground",
      )}
    >
      {humanizeStatus(status)}
    </span>
  );
}
