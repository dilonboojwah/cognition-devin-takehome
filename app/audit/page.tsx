import { AppShell } from "@/components/kit/AppShell";
import { DataTable, type DataTableRow } from "@/components/kit/DataTable";
import { RoleBadge } from "@/components/kit/RoleBadge";
import { StatusBadge } from "@/components/kit/StatusBadge";
import { listAuditEvents } from "@/lib/audit";
import { requireCurrentUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Cross-tool audit trail. Not in the tool registry; the sidebar links to it
 *  below a divider. Needs no per-tool work: new resource types appear as
 *  events exist. */
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
      actor: <span className="whitespace-nowrap">{event.actor.name}</span>,
      role: <RoleBadge role={event.actor.role} />,
      action: <code className="text-[12px]">{event.action}</code>,
      resource: (
        <span className="flex gap-1 whitespace-nowrap text-muted-foreground">
          {event.resourceType}
          <span className="tabular-nums">{event.resourceId.slice(0, 8)}</span>
        </span>
      ),
      outcome: <StatusBadge status={event.outcome} />,
    },
  }));

  return (
    <AppShell
      title="Audit trail"
      description="A permanent record of every change made through this app"
    >
      <section className="space-y-4 border-t pt-5">
        <h2 className="eyebrow">Events</h2>
        <DataTable
          columns={[
            { key: "when", label: "When (UTC)" },
            { key: "actor", label: "Actor" },
            { key: "role", label: "Role" },
            { key: "action", label: "Action" },
            { key: "resource", label: "Resource" },
            { key: "outcome", label: "Outcome" },
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
