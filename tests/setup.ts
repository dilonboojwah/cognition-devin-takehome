import { afterAll, beforeEach } from "vitest";
import { prisma } from "@/lib/db";

beforeEach(async () => {
  await prisma.auditEvent.deleteMany();
  await prisma.refundApproval.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.kycCase.deleteMany();
  await prisma.featureFlag.deleteMany();
  await prisma.roleAssignment.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
