import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const USERS = [
  { name: "Giyu Tomioka", email: "giyu@example.com", role: "finance_admin" },
  { name: "Mr Bean", email: "mrbean@example.com", role: "finance_admin" },
  { name: "James Bond", email: "jamesbond@example.com", role: "ops_analyst" },
  { name: "Dwight Schrute", email: "dwight@example.com", role: "kyc_reviewer" },
  { name: "Rain Man", email: "rainman@example.com", role: "eng_admin" },
];

async function main() {
  await prisma.auditEvent.deleteMany();
  await prisma.refundApproval.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.kycCase.deleteMany();
  await prisma.featureFlag.deleteMany();
  await prisma.roleAssignment.deleteMany();
  await prisma.user.deleteMany();

  const users = Object.fromEntries(
    await Promise.all(
      USERS.map(async (user) => [
        user.email,
        await prisma.user.create({ data: user }),
      ] as const),
    ),
  );
  await prisma.roleAssignment.createMany({
    data: USERS.map(({ email, role }) => ({ email, role })),
  });

  const giyu = users["giyu@example.com"];
  const mrbean = users["mrbean@example.com"];
  const jamesbond = users["jamesbond@example.com"];
  const dwight = users["dwight@example.com"];
  const rain = users["rainman@example.com"];

  // Requesters vary across roles that may request; none may decide their own.
  const refunds = [
    { customer: "Northwind Trading", amountCents: 1250, reason: "Duplicate charge", status: "pending", requestedById: jamesbond.id },
    { customer: "Contoso Ltd", amountCents: 4999, reason: "Service outage credit", status: "pending", requestedById: giyu.id },
    { customer: "Fabrikam Inc", amountCents: 12000, reason: "Cancelled subscription", status: "approved", requestedById: jamesbond.id },
    { customer: "Tailspin Toys", amountCents: 7500, reason: "Shipping never delivered", status: "rejected", requestedById: giyu.id },
    { customer: "Adventure Works", amountCents: 50000, reason: "Chargeback settlement", status: "partially_approved", requestedById: jamesbond.id },
    { customer: "Woodgrove Bank", amountCents: 125000, reason: "Erroneous wire fee", status: "pending", requestedById: jamesbond.id },
    { customer: "Proseware", amountCents: 3200, reason: "Promo code not applied", status: "approved", requestedById: mrbean.id },
    { customer: "Litware", amountCents: 22500, reason: "Goodwill credit", status: "pending", requestedById: mrbean.id },
  ];

  const created = await Promise.all(
    refunds.map((refund) => prisma.refund.create({ data: refund })),
  );

  const approvals = [
    { refund: created[2], approverId: mrbean.id, decision: "approve", note: "Verified with billing" },
    { refund: created[3], approverId: mrbean.id, decision: "reject", note: "Carrier confirmed delivery" },
    { refund: created[4], approverId: mrbean.id, decision: "approve", note: "First of two approvals" },
    { refund: created[6], approverId: giyu.id, decision: "approve", note: null },
  ];
  for (const approval of approvals) {
    await prisma.refundApproval.create({
      data: {
        refundId: approval.refund.id,
        approverId: approval.approverId,
        decision: approval.decision,
        note: approval.note,
      },
    });
  }

  const kycCases = [
    { applicantName: "Maria Silva", country: "BR", riskScore: 12, status: "pending_review", documents: ["passport.pdf", "utility-bill.pdf"] },
    { applicantName: "Jonas Weber", country: "DE", riskScore: 35, status: "approved", documents: ["id-card.pdf"], decidedById: dwight.id },
    { applicantName: "Aiko Tanaka", country: "JP", riskScore: 44, status: "pending_review", documents: ["passport.pdf"] },
    { applicantName: "Samuel Adeyemi", country: "NG", riskScore: 58, status: "rejected", documents: ["passport.pdf", "bank-statement.pdf"], decidedById: dwight.id },
    { applicantName: "Elena Petrova", country: "BG", riskScore: 66, status: "pending_review", documents: ["id-card.pdf", "selfie.jpg"] },
    { applicantName: "Omar Haddad", country: "LB", riskScore: 74, status: "escalated", documents: ["passport.pdf", "source-of-funds.pdf"] },
    { applicantName: "Grace Miller", country: "US", riskScore: 81, status: "pending_review", documents: ["drivers-licence.pdf"] },
    { applicantName: "Wei Chen", country: "SG", riskScore: 93, status: "escalated", documents: ["passport.pdf", "company-registry.pdf", "source-of-funds.pdf"] },
  ];

  for (const [index, kycCase] of kycCases.entries()) {
    const { documents, decidedById, ...rest } = kycCase;
    await prisma.kycCase.create({
      data: {
        ...rest,
        documents: JSON.stringify(documents),
        submittedAt: new Date(Date.now() - (kycCases.length - index) * 36 * 60 * 60 * 1000),
        decidedById: decidedById ?? null,
        decidedAt: decidedById ? new Date() : null,
        note: decidedById ? "Documents matched the application" : null,
      },
    });
  }

  const flags = [
    { key: "instant_payouts", description: "Pay out refunds instantly instead of nightly", enabled: false, rolloutPercent: 0 },
    { key: "new_refunds_ui", description: "Redesigned refunds dashboard", enabled: true, rolloutPercent: 100 },
    { key: "kyc_auto_screen", description: "Automatic sanctions screening on submission", enabled: true, rolloutPercent: 25 },
    { key: "merchant_self_serve", description: "Let merchants raise their own refunds", enabled: false, rolloutPercent: 0 },
    { key: "audit_export", description: "CSV export on the audit log", enabled: true, rolloutPercent: 100 },
  ];
  for (const flag of flags) {
    await prisma.featureFlag.create({ data: { ...flag, updatedById: rain.id } });
  }

  console.log(
    `Seeded ${USERS.length} users, ${refunds.length} refunds, ${kycCases.length} KYC cases, ${flags.length} flags.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
