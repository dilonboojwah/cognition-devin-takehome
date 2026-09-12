import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/db";
import { REFUND_DUAL_APPROVAL_THRESHOLD_CENTS } from "@/lib/config";
import { runMutation, type Actor, type Tx } from "@/lib/mutation";

export const REFUND_STATUSES = [
  "pending",
  "partially_approved",
  "approved",
  "rejected",
] as const;

export type RefundStatus = (typeof REFUND_STATUSES)[number];

export const REFUND_RESOURCE_TYPE = "Refund";

export class RefundRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RefundRuleError";
  }
}

/** Two distinct finance_admin approvals at or above the threshold, else one. */
export function approvalsRequired(amountCents: number): number {
  return amountCents >= REFUND_DUAL_APPROVAL_THRESHOLD_CENTS ? 2 : 1;
}

export function isTerminal(status: string): boolean {
  return status === "approved" || status === "rejected";
}

export async function listRefunds() {
  return prisma.refund.findMany({
    orderBy: { createdAt: "desc" },
    include: { requestedBy: true, approvals: true },
  });
}

export async function getRefund(id: string) {
  return prisma.refund.findUnique({
    where: { id },
    include: {
      requestedBy: true,
      approvals: { include: { approver: true }, orderBy: { createdAt: "asc" } },
    },
  });
}

export async function requestRefund(
  actor: Actor,
  input: { customer: string; amountCents: number; reason: string },
) {
  if (!input.customer.trim()) throw new RefundRuleError("Customer is required");
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new RefundRuleError("Amount must be a positive whole number of cents");
  }
  if (!input.reason.trim()) throw new RefundRuleError("Reason is required");

  // The id is minted here rather than by the database default so the audit
  // event records the real resource id.
  const id = randomUUID();
  await runMutation({
    actor,
    action: "refund.request",
    resourceType: REFUND_RESOURCE_TYPE,
    resourceId: id,
    run: async (tx) => {
      const refund = await tx.refund.create({
        data: {
          id,
          customer: input.customer.trim(),
          amountCents: input.amountCents,
          reason: input.reason.trim(),
          status: "pending",
          requestedById: actor.id,
        },
      });
      return { oldValue: null, newValue: snapshot(refund) };
    },
  });
  return id;
}

export async function approveRefund(actor: Actor, refundId: string, note?: string) {
  return decide(actor, refundId, "approve", note);
}

export async function rejectRefund(actor: Actor, refundId: string, note?: string) {
  return decide(actor, refundId, "reject", note);
}

function snapshot(refund: {
  id: string;
  status: string;
  amountCents: number;
  customer: string;
}) {
  return {
    id: refund.id,
    customer: refund.customer,
    amountCents: refund.amountCents,
    status: refund.status,
  };
}

async function decide(
  actor: Actor,
  refundId: string,
  decision: "approve" | "reject",
  note?: string,
) {
  await runMutation({
    actor,
    action: decision === "approve" ? "refund.approve" : "refund.reject",
    resourceType: REFUND_RESOURCE_TYPE,
    resourceId: refundId,
    run: async (tx: Tx) => {
      // Re-read inside the transaction: two simultaneous approvals must not
      // both see the same stale approval count.
      const refund = await tx.refund.findUnique({
        where: { id: refundId },
        include: { approvals: true },
      });
      if (!refund) throw new RefundRuleError("Refund not found");
      if (isTerminal(refund.status)) {
        throw new RefundRuleError(`Refund is already ${refund.status}`);
      }
      if (refund.requestedById === actor.id) {
        throw new RefundRuleError("A requester cannot decide their own refund");
      }
      if (refund.approvals.some((a) => a.approverId === actor.id)) {
        throw new RefundRuleError("This approver already decided this refund");
      }

      await tx.refundApproval.create({
        data: {
          refundId,
          approverId: actor.id,
          decision,
          note: note?.trim() || null,
        },
      });

      const approvals = refund.approvals.filter((a) => a.decision === "approve").length + 1;
      const status: RefundStatus =
        decision === "reject"
          ? "rejected"
          : approvals >= approvalsRequired(refund.amountCents)
            ? "approved"
            : "partially_approved";

      const updated = await tx.refund.update({ where: { id: refundId }, data: { status } });
      return { oldValue: snapshot(refund), newValue: snapshot(updated) };
    },
  });
}
