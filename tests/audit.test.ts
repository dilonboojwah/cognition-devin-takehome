import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { KYC_RISK_HIGH_MIN, REFUND_DUAL_APPROVAL_THRESHOLD_CENTS } from "@/lib/config";
import { approveRefund, rejectRefund, requestRefund } from "@/lib/refunds";
import { approveKycCase, escalateKycCase } from "@/lib/kyc";
import { updateFeatureFlag } from "@/lib/flags";
import { makeFeatureFlag, makeKycCase, makeRefund, makeUser } from "./factories";

/**
 * Test 14. One assertion shape for all three tools, because every tool goes
 * through runMutation().
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

  it("audits each KYC mutation exactly once, with old and new values", async () => {
    const reviewer = await makeUser("kyc_reviewer");
    const financeAdmin = await makeUser("finance_admin");
    const lowRisk = await makeKycCase({ riskScore: 10 });
    const highRisk = await makeKycCase({ riskScore: KYC_RISK_HIGH_MIN + 5 });

    await approveKycCase(reviewer, lowRisk.id);
    await escalateKycCase(reviewer, highRisk.id, "Needs review");
    await approveKycCase(financeAdmin, highRisk.id, "Source of funds verified");

    const events = await prisma.auditEvent.findMany({ orderBy: { createdAt: "asc" } });
    expect(events).toHaveLength(3);
    expect(events.every((event) => event.outcome === "success")).toBe(true);
    expect(events.map((event) => event.action)).toEqual([
      "kyc.decide",
      "kyc.decide",
      "kyc.decide_escalated",
    ]);
    expect(events.every((event) => event.resourceType === "KycCase")).toBe(true);

    expect(JSON.parse(events[1].oldValue!)).toMatchObject({ status: "pending_review" });
    expect(JSON.parse(events[1].newValue!)).toMatchObject({ status: "escalated" });
    expect(JSON.parse(events[2].newValue!)).toMatchObject({ status: "approved" });
  });

  it("audits each flag mutation exactly once, with old and new values", async () => {
    const engAdmin = await makeUser("eng_admin");
    const flag = await makeFeatureFlag({ enabled: false, rolloutPercent: 0 });

    await updateFeatureFlag(engAdmin, flag.id, { enabled: true });
    await updateFeatureFlag(engAdmin, flag.id, { rolloutPercent: 50 });

    const events = await prisma.auditEvent.findMany({ orderBy: { createdAt: "asc" } });
    expect(events).toHaveLength(2);
    expect(events.map((event) => event.action)).toEqual(["flag.update", "flag.update"]);
    expect(JSON.parse(events[0].oldValue!)).toMatchObject({ enabled: false });
    expect(JSON.parse(events[0].newValue!)).toMatchObject({ enabled: true });
    expect(JSON.parse(events[1].oldValue!)).toMatchObject({ rolloutPercent: 0 });
    expect(JSON.parse(events[1].newValue!)).toMatchObject({ rolloutPercent: 50 });
  });
});
