import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { REFUND_DUAL_APPROVAL_THRESHOLD_CENTS } from "@/lib/config";
import { approveRefund, rejectRefund, requestRefund, RefundRuleError } from "@/lib/refunds";
import { makeRefund, makeUser } from "./factories";

const statusOf = async (id: string) =>
  (await prisma.refund.findUniqueOrThrow({ where: { id } })).status;

describe("refund approval rules", () => {
  it("test 3: under threshold, one finance_admin approval approves", async () => {
    const requester = await makeUser("ops_analyst");
    const approver = await makeUser("finance_admin");
    const refund = await makeRefund(requester.id, {
      amountCents: REFUND_DUAL_APPROVAL_THRESHOLD_CENTS - 1,
    });

    await approveRefund(approver, refund.id);

    expect(await statusOf(refund.id)).toBe("approved");
  });

  it("test 4: at threshold, two distinct approvers are needed", async () => {
    const requester = await makeUser("ops_analyst");
    const first = await makeUser("finance_admin");
    const second = await makeUser("finance_admin");
    const refund = await makeRefund(requester.id, {
      amountCents: REFUND_DUAL_APPROVAL_THRESHOLD_CENTS,
    });

    await approveRefund(first, refund.id);
    expect(await statusOf(refund.id)).toBe("partially_approved");

    await approveRefund(second, refund.id);
    expect(await statusOf(refund.id)).toBe("approved");
  });

  it("test 5: a requester cannot approve their own refund", async () => {
    const requester = await makeUser("finance_admin");
    const refund = await makeRefund(requester.id);

    await expect(approveRefund(requester, refund.id)).rejects.toBeInstanceOf(RefundRuleError);
    expect(await statusOf(refund.id)).toBe("pending");
    expect(await prisma.refundApproval.count()).toBe(0);
  });

  it("test 6: the same approver cannot approve twice", async () => {
    const requester = await makeUser("ops_analyst");
    const approver = await makeUser("finance_admin");
    const refund = await makeRefund(requester.id, {
      amountCents: REFUND_DUAL_APPROVAL_THRESHOLD_CENTS,
    });

    await approveRefund(approver, refund.id);
    await expect(approveRefund(approver, refund.id)).rejects.toBeInstanceOf(RefundRuleError);

    expect(await statusOf(refund.id)).toBe("partially_approved");
    expect(await prisma.refundApproval.count()).toBe(1);
  });

  it("test 7: a rejection from partially_approved is terminal", async () => {
    const requester = await makeUser("ops_analyst");
    const first = await makeUser("finance_admin");
    const second = await makeUser("finance_admin");
    const third = await makeUser("finance_admin");
    const refund = await makeRefund(requester.id, {
      amountCents: REFUND_DUAL_APPROVAL_THRESHOLD_CENTS,
    });

    await approveRefund(first, refund.id);
    await rejectRefund(second, refund.id, "Fraud signal");
    expect(await statusOf(refund.id)).toBe("rejected");

    await expect(approveRefund(third, refund.id)).rejects.toBeInstanceOf(RefundRuleError);
    expect(await statusOf(refund.id)).toBe("rejected");
  });

  it("test 8: there is no transition out of approved", async () => {
    const requester = await makeUser("ops_analyst");
    const first = await makeUser("finance_admin");
    const second = await makeUser("finance_admin");
    const refund = await makeRefund(requester.id, { amountCents: 1000 });

    await approveRefund(first, refund.id);
    await expect(rejectRefund(second, refund.id, "too late")).rejects.toBeInstanceOf(
      RefundRuleError,
    );
    expect(await statusOf(refund.id)).toBe("approved");
  });
});

describe("requesting refunds", () => {
  it("creates a pending refund for a permitted role", async () => {
    const requester = await makeUser("ops_analyst");
    const id = await requestRefund(requester, {
      customer: "Fabrikam",
      amountCents: 1500,
      reason: "Duplicate charge",
    });

    expect(await statusOf(id)).toBe("pending");
  });
});
