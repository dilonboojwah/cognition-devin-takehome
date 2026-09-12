"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/auth";
import { AuthorizationError } from "@/lib/authorize";
import { approveRefund, RefundRuleError, rejectRefund, requestRefund } from "@/lib/refunds";

/** Server actions are a thin shell: they resolve the actor and call lib/refunds.ts. */

function toMessage(error: unknown): string {
  if (error instanceof AuthorizationError) return "Your role may not do that.";
  if (error instanceof RefundRuleError) return error.message;
  return "Something went wrong.";
}

export async function requestRefundAction(
  values: Record<string, string>,
): Promise<string | void> {
  const actor = await requireCurrentUser();
  const amount = Number(values.amount);
  if (!Number.isFinite(amount) || amount <= 0) return "Enter an amount in dollars.";
  try {
    await requestRefund(actor, {
      customer: values.customer ?? "",
      amountCents: Math.round(amount * 100),
      reason: values.reason ?? "",
    });
  } catch (error) {
    return toMessage(error);
  }
  revalidatePath("/refunds");
}

export async function approveRefundAction(
  refundId: string,
  values: Record<string, string>,
): Promise<string | void> {
  const actor = await requireCurrentUser();
  try {
    await approveRefund(actor, refundId, values.note);
  } catch (error) {
    return toMessage(error);
  }
  revalidatePath("/refunds");
}

export async function rejectRefundAction(
  refundId: string,
  values: Record<string, string>,
): Promise<string | void> {
  const actor = await requireCurrentUser();
  try {
    await rejectRefund(actor, refundId, values.note);
  } catch (error) {
    return toMessage(error);
  }
  revalidatePath("/refunds");
}
