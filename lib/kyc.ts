import { prisma } from "@/lib/db";
import { KYC_RISK_HIGH_MIN, KYC_RISK_MEDIUM_MIN } from "@/lib/config";
import { runMutation, type Actor, type Tx } from "@/lib/mutation";

export const KYC_STATUSES = [
  "pending_review",
  "escalated",
  "approved",
  "rejected",
] as const;

export type KycStatus = (typeof KYC_STATUSES)[number];

export const KYC_RESOURCE_TYPE = "KycCase";

export const KYC_RISK_LEVELS = ["low", "medium", "high"] as const;

export type KycRiskLevel = (typeof KYC_RISK_LEVELS)[number];

export class KycRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KycRuleError";
  }
}

export function riskLevel(riskScore: number): KycRiskLevel {
  if (riskScore >= KYC_RISK_HIGH_MIN) return "high";
  return riskScore >= KYC_RISK_MEDIUM_MIN ? "medium" : "low";
}

export function isTerminal(status: string): boolean {
  return status === "approved" || status === "rejected";
}

export function parseDocuments(documents: string): string[] {
  const parsed: unknown = JSON.parse(documents);
  return Array.isArray(parsed) ? parsed.map(String) : [];
}

export async function listKycCases() {
  return prisma.kycCase.findMany({
    orderBy: { submittedAt: "asc" },
    include: { decidedBy: true },
  });
}

export async function getKycCase(id: string) {
  return prisma.kycCase.findUnique({ where: { id }, include: { decidedBy: true } });
}

/**
 * An escalated case is decided by finance_admin, everything else by the
 * reviewer, so the action depends on the record. Resolved before the
 * transaction because `authorize()` runs first; the rule is re-checked against
 * the row as re-read inside the transaction.
 */
async function decideAction(id: string) {
  const current = await prisma.kycCase.findUnique({ where: { id } });
  return current?.status === "escalated" ? "kyc.decide_escalated" : "kyc.decide";
}

function snapshot(kycCase: {
  id: string;
  applicantName: string;
  riskScore: number;
  status: string;
}) {
  return {
    id: kycCase.id,
    applicantName: kycCase.applicantName,
    riskScore: kycCase.riskScore,
    status: kycCase.status,
  };
}

export async function approveKycCase(actor: Actor, id: string, note?: string) {
  return decide(actor, id, "approved", note);
}

export async function rejectKycCase(actor: Actor, id: string, note?: string) {
  return decide(actor, id, "rejected", note);
}

async function decide(actor: Actor, id: string, status: KycStatus, note?: string) {
  await runMutation({
    actor,
    action: await decideAction(id),
    resourceType: KYC_RESOURCE_TYPE,
    resourceId: id,
    run: async (tx: Tx) => {
      const kycCase = await guard(tx, id);
      if (kycCase.status === "pending_review" && riskLevel(kycCase.riskScore) === "high") {
        throw new KycRuleError(
          `A case scoring ${KYC_RISK_HIGH_MIN} or above may only be escalated`,
        );
      }
      if (riskLevel(kycCase.riskScore) === "high" && !note?.trim()) {
        throw new KycRuleError("Deciding a high-risk case requires a note");
      }

      const updated = await tx.kycCase.update({
        where: { id },
        data: {
          status,
          decidedById: actor.id,
          decidedAt: new Date(),
          note: note?.trim() || null,
        },
      });
      return { oldValue: snapshot(kycCase), newValue: snapshot(updated) };
    },
  });
}

export async function escalateKycCase(actor: Actor, id: string, note?: string) {
  await runMutation({
    actor,
    action: "kyc.decide",
    resourceType: KYC_RESOURCE_TYPE,
    resourceId: id,
    run: async (tx: Tx) => {
      const kycCase = await guard(tx, id);
      if (kycCase.status === "escalated") {
        throw new KycRuleError("This case is already escalated");
      }

      const updated = await tx.kycCase.update({
        where: { id },
        data: { status: "escalated", note: note?.trim() || null },
      });
      return { oldValue: snapshot(kycCase), newValue: snapshot(updated) };
    },
  });
}

/** Re-read inside the transaction so two reviewers cannot both decide. */
async function guard(tx: Tx, id: string) {
  const kycCase = await tx.kycCase.findUnique({ where: { id } });
  if (!kycCase) throw new KycRuleError("Case not found");
  if (isTerminal(kycCase.status)) {
    throw new KycRuleError(`Case is already ${kycCase.status}`);
  }
  return kycCase;
}
