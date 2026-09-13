import { prisma } from "@/lib/db";
import { approveKycCase, escalateKycCase, rejectKycCase } from "@/lib/kyc";
import { approveRefund, rejectRefund, requestRefund } from "@/lib/refunds";

/**
 * The demo dataset. Extracted from prisma/seed.ts so the hosted demo can
 * restore it between reviewers without a redeploy. Refund and KYC states are
 * produced by the real mutations, so every seeded record has matching
 * approval rows and audit events.
 */

const USERS = [
  { name: "Giyu Tomioka", email: "giyu@example.com", role: "finance_admin" },
  { name: "Mr Bean", email: "mrbean@example.com", role: "finance_admin" },
  { name: "James Bond", email: "jamesbond@example.com", role: "ops_analyst" },
  { name: "Dwight Schrute", email: "dwight@example.com", role: "kyc_reviewer" },
  { name: "Rain Man", email: "rainman@example.com", role: "eng_admin" },
];

export async function seedDatabase() {
  await prisma.auditEvent.deleteMany();
  await prisma.refundApproval.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.kycCase.deleteMany();
  await prisma.featureFlag.deleteMany();
  await prisma.roleAssignment.deleteMany();
  await prisma.user.deleteMany();

  const users = Object.fromEntries(
    await Promise.all(
      USERS.map(async (user) => [user.email, await prisma.user.create({ data: user })] as const),
    ),
  );
  await prisma.roleAssignment.createMany({
    data: USERS.map(({ email, role }) => ({ email, role })),
  });

  const giyu = users["giyu@example.com"];
  const mrbean = users["mrbean@example.com"];
  const jamesbond = users["jamesbond@example.com"];
  const dwight = users["dwight@example.com"];

  const refundRequests = [
    { actor: jamesbond, customer: "Northwind Trading", amountCents: 1250, reason: "Duplicate charge" },
    { actor: giyu, customer: "Contoso Ltd", amountCents: 4999, reason: "Service outage credit" },
    { actor: jamesbond, customer: "Fabrikam Inc", amountCents: 12000, reason: "Cancelled subscription" },
    { actor: giyu, customer: "Tailspin Toys", amountCents: 7500, reason: "Shipping never delivered" },
    { actor: jamesbond, customer: "Adventure Works", amountCents: 50000, reason: "Chargeback settlement" },
    { actor: jamesbond, customer: "Woodgrove Bank", amountCents: 125000, reason: "Erroneous wire fee" },
    { actor: mrbean, customer: "Proseware", amountCents: 3200, reason: "Promo code not applied" },
    { actor: mrbean, customer: "Litware", amountCents: 22500, reason: "Goodwill credit" },
  ];
  const refundIds: string[] = [];
  for (const { actor, ...input } of refundRequests) {
    refundIds.push(await requestRefund(actor, input));
  }
  await approveRefund(mrbean, refundIds[2], "Verified with billing");
  await rejectRefund(mrbean, refundIds[3], "Carrier confirmed delivery");
  await approveRefund(mrbean, refundIds[4], "First of two approvals");
  await approveRefund(giyu, refundIds[6]);

  const kycCases = [
    { applicantName: "Maria Silva", country: "BR", riskScore: 12, documents: ["passport.pdf", "utility-bill.pdf"] },
    { applicantName: "Jonas Weber", country: "DE", riskScore: 35, documents: ["id-card.pdf"] },
    { applicantName: "Aiko Tanaka", country: "JP", riskScore: 44, documents: ["passport.pdf"] },
    { applicantName: "Samuel Adeyemi", country: "NG", riskScore: 58, documents: ["passport.pdf", "bank-statement.pdf"] },
    { applicantName: "Elena Petrova", country: "BG", riskScore: 66, documents: ["id-card.pdf", "selfie.jpg"] },
    { applicantName: "Omar Haddad", country: "LB", riskScore: 74, documents: ["passport.pdf", "source-of-funds.pdf"] },
    { applicantName: "Grace Miller", country: "US", riskScore: 81, documents: ["drivers-licence.pdf"] },
    { applicantName: "Wei Chen", country: "SG", riskScore: 93, documents: ["passport.pdf", "company-registry.pdf", "source-of-funds.pdf"] },
  ];
  const kycIds: string[] = [];
  for (const [index, kycCase] of kycCases.entries()) {
    const { documents, ...rest } = kycCase;
    const created = await prisma.kycCase.create({
      data: {
        ...rest,
        status: "pending_review",
        documents: JSON.stringify(documents),
        submittedAt: new Date(Date.now() - (kycCases.length - index) * 36 * 60 * 60 * 1000),
      },
    });
    kycIds.push(created.id);
  }
  await approveKycCase(dwight, kycIds[1], "Documents matched the application");
  await rejectKycCase(dwight, kycIds[3], "Bank statement did not match the applicant");
  await escalateKycCase(dwight, kycIds[5], "Offshore documents at a high risk score");
  await escalateKycCase(dwight, kycIds[7], "Layered corporate structure needs review");

  const flags = [
    { key: "instant_payouts", description: "Pay out refunds instantly instead of nightly", enabled: false, rolloutPercent: 0 },
    { key: "new_refunds_ui", description: "Redesigned refunds dashboard", enabled: true, rolloutPercent: 100 },
    { key: "kyc_auto_screen", description: "Automatic sanctions screening on submission", enabled: true, rolloutPercent: 25 },
    { key: "merchant_self_serve", description: "Let merchants raise their own refunds", enabled: false, rolloutPercent: 0 },
    { key: "audit_export", description: "CSV export on the audit log", enabled: true, rolloutPercent: 100 },
  ];
  for (const flag of flags) {
    await prisma.featureFlag.create({ data: flag });
  }

  return {
    users: USERS.length,
    refunds: refundIds.length,
    kycCases: kycIds.length,
    flags: flags.length,
  };
}
