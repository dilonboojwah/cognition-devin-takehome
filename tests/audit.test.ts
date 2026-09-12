import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { REFUND_DUAL_APPROVAL_THRESHOLD_CENTS } from "@/lib/config";
import { approveRefund, rejectRefund, requestRefund } from "@/lib/refunds";
import { makeRefund, makeUser } from "./factories";

/**
 * Test 14. Later sessions extend this with the KYC and flag mutations; the
 * shape of the assertion stays the same because every tool goes through
 * runMutation().
 */
describe("test 14: one audit event per successful mutation", () => {
  it("audits each refund mutation exactly once, with old and new values", async () => {
    const requester = await makeUser("ops_analyst");
    const first = await makeUser("finance_admin");
    const second = await makeUser("finance_admin");

    const requestedId = await requestRefund(requester, {
      customer: "Litware",
      amountCents: 2000,
      reason: "Goodwill",
    });
    const dual = await makeRefund(requester.id, {
      amountCents: REFUND_DUAL_APPROVAL_THRESHOLD_CENTS,
    });
    const doomed = await makeRefund(requester.id, { amountCents: 1000 });

    await approveRefund(first, dual.id);
    await approveRefund(second, dual.id);
    await rejectRefund(first, doomed.id, "Not eligible");

    const events = await prisma.auditEvent.findMany({ orderBy: { createdAt: "asc" } });
    expect(events).toHaveLength(4);
    expect(events.every((event) => event.outcome === "success")).toBe(true);
    expect(events.map((event) => event.action)).toEqual([
      "refund.request",
      "refund.approve",
      "refund.approve",
      "refund.reject",
    ]);

    const created = events.find((event) => event.resourceId === requestedId);
    expect(created?.oldValue).toBeNull();
    expect(JSON.parse(created!.newValue!)).toMatchObject({ id: requestedId, status: "pending" });

    const finalApproval = events[2];
    expect(JSON.parse(finalApproval.oldValue!)).toMatchObject({ status: "partially_approved" });
    expect(JSON.parse(finalApproval.newValue!)).toMatchObject({ status: "approved" });
  });
});
