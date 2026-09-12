import { prisma } from "@/lib/db";
import { authorize } from "@/lib/authorize";
import type { Actor } from "@/lib/mutation";

export type AuditFilters = {
  resourceType?: string;
  resourceId?: string;
  actorId?: string;
};

/** The only read path for audit events: per-record activity lists and the
 *  cross-tool /audit page both go through it, so audit.view gates both. */
export async function listAuditEvents(actor: Actor, filters: AuditFilters = {}) {
  authorize(actor, "audit.view");
  return prisma.auditEvent.findMany({
    where: {
      resourceType: filters.resourceType || undefined,
      resourceId: filters.resourceId || undefined,
      actorId: filters.actorId || undefined,
    },
    orderBy: { createdAt: "desc" },
    include: { actor: true },
    take: 200,
  });
}
