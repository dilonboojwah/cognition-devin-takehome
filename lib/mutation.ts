import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { authorize, AuthorizationError, type Action } from "@/lib/authorize";

export type Tx = Prisma.TransactionClient;

export type Actor = { id: string; role: string };

export type MutationValues = {
  oldValue: unknown;
  newValue: unknown;
};

export type MutationInput = {
  actor: Actor;
  action: Action;
  resourceType: string;
  resourceId: string;
  /**
   * Must re-read the current record inside the transaction, apply the state
   * rule, write the change, and return the values to audit. Re-reading inside
   * the transaction is what makes two simultaneous approvals safe.
   */
  run: (tx: Tx) => Promise<MutationValues>;
};

/**
 * Seam so a test can make the audit write fail and assert the change rolls
 * back. Production code always uses the default implementation.
 */
export const auditWriter = {
  async write(tx: Tx, data: Prisma.AuditEventUncheckedCreateInput) {
    await tx.auditEvent.create({ data });
  },
};

const serialize = (value: unknown) =>
  value === undefined || value === null ? null : JSON.stringify(value);

/**
 * The only write path to the database for domain code. Authorizes, opens a
 * transaction, runs the change, writes exactly one AuditEvent in that same
 * transaction, and commits. A denied check writes a `denied` event and throws.
 */
export async function runMutation({
  actor,
  action,
  resourceType,
  resourceId,
  run,
}: MutationInput): Promise<MutationValues> {
  try {
    authorize(actor, action);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      await prisma.auditEvent.create({
        data: {
          actorId: actor.id,
          action,
          resourceType,
          resourceId,
          oldValue: null,
          newValue: null,
          outcome: "denied",
        },
      });
    }
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    const { oldValue, newValue } = await run(tx);
    await auditWriter.write(tx, {
      actorId: actor.id,
      action,
      resourceType,
      resourceId,
      oldValue: serialize(oldValue),
      newValue: serialize(newValue),
      outcome: "success",
    });
    return { oldValue, newValue };
  });
}
