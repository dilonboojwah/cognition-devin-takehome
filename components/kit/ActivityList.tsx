import { requireCurrentUser } from "@/lib/auth";
import { listAuditEvents } from "@/lib/audit";
import { formatDateTime } from "@/lib/format";
import { RoleBadge } from "@/components/kit/RoleBadge";
import { StatusBadge, humanizeStatus } from "@/components/kit/StatusBadge";

function statusOf(json: string | null): string | null {
  if (!json) return null;
  const value = JSON.parse(json) as Record<string, unknown>;
  return typeof value.status === "string" ? value.status : null;
}

/** Per-record audit trail, newest first. Every tool's detail card ends with this. */
export async function ActivityList({
  resourceType,
  resourceId,
}: {
  resourceType: string;
  resourceId: string;
}) {
  const actor = await requireCurrentUser();
  const events = await listAuditEvents(actor, { resourceType, resourceId });

  if (events.length === 0) {
    return <p className="mt-4 text-[13px] text-muted-foreground">No activity yet.</p>;
  }

  return (
    <ul className="mt-4 divide-y border-y">
      {events.map((event) => {
        const from = statusOf(event.oldValue);
        const to = statusOf(event.newValue);
        return (
          <li key={event.id} className="py-3 text-[13px]">
            <div className="flex flex-wrap items-center gap-2">
              <span>{event.actor.name}</span>
              <RoleBadge role={event.actor.role} />
              <code className="text-[12px] text-muted-foreground">{event.action}</code>
              {event.outcome === "denied" && <StatusBadge status="denied" />}
              {(from || to) && (
                <span className="text-muted-foreground">
                  {from ? humanizeStatus(from) : "Created"} →{" "}
                  {to ? humanizeStatus(to) : "—"}
                </span>
              )}
              <span className="ml-auto text-muted-foreground tabular-nums">
                {formatDateTime(event.createdAt)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
