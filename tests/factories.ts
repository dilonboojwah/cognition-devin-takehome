import { prisma } from "@/lib/db";
import type { Role } from "@/lib/authorize";

let counter = 0;

export async function makeUser(role: Role, name = role) {
  counter += 1;
  return prisma.user.create({
    data: { name: `${name} ${counter}`, email: `${role}-${counter}@example.com`, role },
  });
}

export async function makeRefund(
  requestedById: string,
  overrides: Partial<{ amountCents: number; status: string; customer: string }> = {},
) {
  return prisma.refund.create({
    data: {
      customer: overrides.customer ?? "Northwind Trading",
      amountCents: overrides.amountCents ?? 2500,
      reason: "Duplicate charge",
      status: overrides.status ?? "pending",
      requestedById,
    },
  });
}
