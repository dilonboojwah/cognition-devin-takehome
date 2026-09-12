import { AppShell } from "@/components/kit/AppShell";
import { DataTable, type DataTableRow } from "@/components/kit/DataTable";
import { RoleBadge } from "@/components/kit/RoleBadge";
import { StatusBadge } from "@/components/kit/StatusBadge";
import { listAuditEvents } from "@/lib/audit";
import { requireCurrentUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

function preview(json: string | null): string {
  if (!json) return "—";
  const value = JSON.parse(json) as Record<string, unknown>;
  return Object.entries(value)
    .filter(([key]) => key !== "id")
    .map(([key, entry]) => `${key}: ${String(entry)}`)
    .join(", ");
}

/** Cross-tool audit trail. Not in the nav registry; reached from the header
 *  link. Needs no per-tool work: new resource types appear as events exist. */
export default async function AuditPage() {
  const user = await requireCurrentUser();
  const events = await listAuditEvents(user);

  const resourceTypes = [...new Set(events.map((event) => event.resourceType))].sort();
  const actors = [...new Map(events.map((event) => [event.actorId, event.actor.name]))];

  const rows: DataTableRow[] = events.map((event) => ({
    id: event.id,
    status: event.outcome,
    facets: { resourceType: event.resourceType, actorId: event.actorId },
    searchText: `${event.action} ${event.resourceType} ${event.actor.name} ${event.resourceId}`,
    cells: {
      when: <span className="tabular-nums">{formatDateTime(event.createdAt)}</span>,
      actor: (
        <span className="flex items-center gap-2 whitespace-nowrap">
          {event.actor.name}
          <RoleBadge role={event.actor.role} />
        </span>
      ),
      action: <code className="text-[12px]">{event.action}</code>,
      resource: (
        <span className="flex gap-1 whitespace-nowrap text-muted-foreground">
          {event.resourceType}
          <span className="tabular-nums">{event.resourceId.slice(0, 8)}</span>
        </span>
      ),
      outcome: <StatusBadge status={event.outcome} />,
      change: (
        // TableCell is nowrap by default: right for every other column, wrong here.
        <span className="block max-w-md text-[12px] leading-relaxed break-words whitespace-normal text-muted-foreground">
          {preview(event.oldValue)} → {preview(event.newValue)}
        </span>
      ),
    },
  }));

  return (
    <AppShell
      title="Audit trail"
      description="Every mutation across every tool, newest first. Written inside the same
        transaction as the change it describes, and never updated or deleted."
    >
      <section className="space-y-4 border-t pt-5">
        <h2 className="eyebrow">Events</h2>
        <DataTable
          columns={[
            { key: "when", label: "When (UTC)" },
            { key: "actor", label: "Actor" },
            { key: "action", label: "Action" },
            { key: "resource", label: "Resource" },
            { key: "outcome", label: "Outcome" },
            { key: "change", label: "Old → new", className: "max-w-md min-w-64" },
          ]}
          rows={rows}
          filterPlaceholder="Filter by action, actor or resource…"
          statusOptions={["success", "denied"]}
          statusLabel="All outcomes"
          facets={[
            {
              key: "resourceType",
              label: "All resource types",
              options: resourceTypes.map((type) => ({ value: type, label: type })),
            },
            {
              key: "actorId",
              label: "All actors",
              options: actors.map(([id, name]) => ({ value: id, label: name })),
            },
          ]}
          emptyMessage="No audit events yet."
        />
      </section>
    </AppShell>
  );
}
