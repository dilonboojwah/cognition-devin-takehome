import { AppShell } from "@/components/kit/AppShell";
import { DataTable, type DataTableRow } from "@/components/kit/DataTable";
import { RoleBadge } from "@/components/kit/RoleBadge";
import { StatusBadge } from "@/components/kit/StatusBadge";
import { listFeatureFlags } from "@/lib/flags";
import { FlagDetail } from "./detail";

export const dynamic = "force-dynamic";

export default async function FlagsPage({
  searchParams,
}: {
  searchParams: Promise<{ flag?: string | string[] }>;
}) {
  const { flag } = await searchParams;
  const selectedId = Array.isArray(flag) ? flag[0] : flag;
  const flags = await listFeatureFlags();

  const rows: DataTableRow[] = flags.map((featureFlag) => ({
    id: featureFlag.id,
    // Clicking the open row again closes the card.
    href: featureFlag.id === selectedId ? "/flags" : `/flags?flag=${featureFlag.id}`,
    status: featureFlag.enabled ? "enabled" : "disabled",
    searchText: `${featureFlag.key} ${featureFlag.description}`,
    cells: {
      key: <code className="text-[12px]">{featureFlag.key}</code>,
      description: <span className="text-muted-foreground">{featureFlag.description}</span>,
      rollout: `${featureFlag.rolloutPercent}%`,
      status: <StatusBadge status={featureFlag.enabled ? "enabled" : "disabled"} />,
    },
  }));

  return (
    <AppShell
      title="Feature Flags"
      description={
        <>
          An <RoleBadge role="eng_admin" className="mx-0.5 -translate-y-px" /> dashboard to
          monitor/toggle rollout % for new features.
        </>
      }
    >
      <section className="space-y-4 border-t pt-5">
        <div className="flex h-9 items-center justify-between gap-4">
          <h2 className="eyebrow">All flags</h2>
        </div>

        {/* Below ~1440px there is not room for table and card side by side,
            so the card stacks under the table. Above it, w-max lets the row
            spill past the column's right edge without shrinking the table. */}
        <div className="flex flex-col items-start gap-6 min-[1440px]:w-max min-[1440px]:flex-row">
          <div className="min-w-0">
            <DataTable
              columns={[
                { key: "key", label: "Feature", className: "min-w-40" },
                { key: "description", label: "Description", className: "min-w-56" },
                { key: "rollout", label: "Rollout", className: "tabular-nums min-w-20" },
                { key: "status", label: "State", className: "min-w-24" },
              ]}
              rows={rows}
              filterPlaceholder="Search feature…"
              statusOptions={["enabled", "disabled"]}
              statusLabel="All states"
              emptyMessage="No flags match this filter."
            />
          </div>

          {selectedId && (
            <aside className="w-full shrink-0 rounded-lg border bg-card p-5 min-[1440px]:sticky min-[1440px]:top-6 min-[1440px]:w-96">
              <FlagDetail id={selectedId} />
            </aside>
          )}
        </div>
      </section>
    </AppShell>
  );
}
