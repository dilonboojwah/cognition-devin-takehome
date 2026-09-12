import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { AuthorizationError } from "@/lib/authorize";
import { KYC_RISK_HIGH_MIN } from "@/lib/config";
import {
  approveKycCase,
  escalateKycCase,
  KycRuleError,
  rejectKycCase,
} from "@/lib/kyc";
import { makeKycCase, makeUser } from "./factories";

const statusOf = async (id: string) =>
  (await prisma.kycCase.findUniqueOrThrow({ where: { id } })).status;

describe("kyc decision rules", () => {
  it("test 9: a reviewer decides a low-risk case", async () => {
    const reviewer = await makeUser("kyc_reviewer");
    const kycCase = await makeKycCase({ riskScore: KYC_RISK_HIGH_MIN - 1 });

    await approveKycCase(reviewer, kycCase.id);

    expect(await statusOf(kycCase.id)).toBe("approved");
    const decided = await prisma.kycCase.findUniqueOrThrow({ where: { id: kycCase.id } });
    expect(decided.decidedById).toBe(reviewer.id);
  });

  it("test 9: an approved case is terminal", async () => {
    const reviewer = await makeUser("kyc_reviewer");
    const kycCase = await makeKycCase({ riskScore: 10, status: "approved" });

    await expect(rejectKycCase(reviewer, kycCase.id)).rejects.toBeInstanceOf(KycRuleError);
    expect(await statusOf(kycCase.id)).toBe("approved");
  });

  it("test 10: a reviewer cannot decide a high-risk case, only escalate it", async () => {
    const reviewer = await makeUser("kyc_reviewer");
    const kycCase = await makeKycCase({ riskScore: KYC_RISK_HIGH_MIN });

    await expect(
      approveKycCase(reviewer, kycCase.id, "Looks fine"),
    ).rejects.toBeInstanceOf(KycRuleError);
    expect(await statusOf(kycCase.id)).toBe("pending_review");

    await escalateKycCase(reviewer, kycCase.id, "Needs a second pair of eyes");
    expect(await statusOf(kycCase.id)).toBe("escalated");
  });

  it("test 10: a role without kyc.decide is denied and audited", async () => {
    const analyst = await makeUser("ops_analyst");
    const kycCase = await makeKycCase({ riskScore: 10 });

    await expect(approveKycCase(analyst, kycCase.id)).rejects.toBeInstanceOf(
      AuthorizationError,
    );

    expect(await statusOf(kycCase.id)).toBe("pending_review");
    const events = await prisma.auditEvent.findMany();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      actorId: analyst.id,
      action: "kyc.decide",
      outcome: "denied",
      resourceId: kycCase.id,
    });
  });

  it("test 11: finance_admin decides an escalated case, and a missing note is rejected", async () => {
    const financeAdmin = await makeUser("finance_admin");
    const reviewer = await makeUser("kyc_reviewer");
    const kycCase = await makeKycCase({
      riskScore: KYC_RISK_HIGH_MIN + 10,
      status: "escalated",
    });

    // A reviewer may not decide an escalated case at all.
    await expect(
      approveKycCase(reviewer, kycCase.id, "Fine by me"),
    ).rejects.toBeInstanceOf(AuthorizationError);

    await expect(approveKycCase(financeAdmin, kycCase.id, "   ")).rejects.toBeInstanceOf(
      KycRuleError,
    );
    expect(await statusOf(kycCase.id)).toBe("escalated");

    await approveKycCase(financeAdmin, kycCase.id, "Source of funds verified");
    const decided = await prisma.kycCase.findUniqueOrThrow({ where: { id: kycCase.id } });
    expect(decided.status).toBe("approved");
    expect(decided.note).toBe("Source of funds verified");
    expect(decided.decidedById).toBe(financeAdmin.id);
  });
});
