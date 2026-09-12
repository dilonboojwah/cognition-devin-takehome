"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/auth";
import { AuthorizationError } from "@/lib/authorize";
import {
  approveKycCase,
  escalateKycCase,
  KycRuleError,
  rejectKycCase,
} from "@/lib/kyc";

/** Server actions are a thin shell: they resolve the actor and call lib/kyc.ts. */

function toMessage(error: unknown): string {
  if (error instanceof AuthorizationError) return "Your role may not do that.";
  if (error instanceof KycRuleError) return error.message;
  return "Something went wrong.";
}

export async function approveKycAction(
  caseId: string,
  values: Record<string, string>,
): Promise<string | void> {
  const actor = await requireCurrentUser();
  try {
    await approveKycCase(actor, caseId, values.note);
  } catch (error) {
    return toMessage(error);
  }
  revalidatePath("/kyc");
}

export async function rejectKycAction(
  caseId: string,
  values: Record<string, string>,
): Promise<string | void> {
  const actor = await requireCurrentUser();
  try {
    await rejectKycCase(actor, caseId, values.note);
  } catch (error) {
    return toMessage(error);
  }
  revalidatePath("/kyc");
}

export async function escalateKycAction(
  caseId: string,
  values: Record<string, string>,
): Promise<string | void> {
  const actor = await requireCurrentUser();
  try {
    await escalateKycCase(actor, caseId, values.note);
  } catch (error) {
    return toMessage(error);
  }
  revalidatePath("/kyc");
}
