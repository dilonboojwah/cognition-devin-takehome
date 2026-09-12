import { AppShell } from "@/components/kit/AppShell";
import { DataTable, type DataTableRow } from "@/components/kit/DataTable";
import { RoleBadge } from "@/components/kit/RoleBadge";
import { StatusBadge, humanizeStatus as humanize } from "@/components/kit/StatusBadge";
import { listAuditEvents } from "@/lib/audit";
import { requireCurrentUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Cross-tool audit trail. Not in the tool registry; the sidebar links to it
 *  below a divider. Needs no per-tool work: new resource types appear as
 *  events exist. */
const ACTION_PHRASES: Record<string, string> = {
  "refund.request": "Requested a refund",
  "refund.approve": "Approved a refund",
  "refund.reject": "Rejected a refund",
  "kyc.decide": "Decided a KYC case",
  "kyc.decide_escalated": "Decided an escalated KYC case",
  "flag.update": "Updated a feature flag",
};

const ACTION_INFINITIVES: Record<string, string> = {
  "refund.request": "request a refund",
  "refund.approve": "approve a refund",
  "refund.reject": "reject a refund",
  "kyc.decide": "decide a KYC case",
  "kyc.decide_escalated": "decide an escalated KYC case",
  "flag.update": "update a feature flag",
};

function parseValue(json: string | null): Record<string, unknown> | null {
  return json ? (JSON.parse(json) as Record<string, unknown>) : null;
}

function describe(event: {
  action: string;
  outcome: string;
  resourceType: string;
  oldValue: string | null;
  newValue: string | null;
}): string {
  if (event.outcome === "denied") {
    return `Denied attempt to ${ACTION_INFINITIVES[event.action] ?? event.action}`;
  }
  const label = ACTION_PHRASES[event.action] ?? `${event.action} on ${event.resourceType}`;
  const before = parseValue(event.oldValue);
  const after = parseValue(event.newValue);
  if (before?.status || after?.status) {
    return `${label} (${before?.status ? humanize(String(before.status)) : "created"} → ${after?.status ? humanize(String(after.status)) : "—"})`;
  }
  if (after && "enabled" in after) {
    return `${label} (${before?.enabled ? "enabled" : "disabled"} → ${after.enabled ? "enabled" : "disabled"})`;
  }
  if (after && "rolloutPercent" in after) {
    return `${label} (${before?.rolloutPercent ?? 0}% → ${after.rolloutPercent}%)`;
  }
  return label;
}

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
      description: (
        <span className="block max-w-sm text-[12px] whitespace-normal text-muted-foreground">
          {describe(event)}
        </span>
      ),
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
      title="Audit Trail"
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
            { key: "description", label: "Description", className: "whitespace-normal" },
            { key: "resource", label: "Resource" },
            { key: "outcome", label: "Outcome" },
          ]}
          rows={rows}
          filterPlaceholder="Search action…"
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
