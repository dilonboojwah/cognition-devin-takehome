"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/auth";
import { AuthorizationError } from "@/lib/authorize";
import { FlagRuleError, toggleFeatureFlag, updateFeatureFlag } from "@/lib/flags";

/** Server actions are a thin shell: they resolve the actor and call lib/flags.ts. */

function toMessage(error: unknown): string {
  if (error instanceof AuthorizationError) return "Your role may not do that.";
  if (error instanceof FlagRuleError) return error.message;
  return "Something went wrong.";
}

export async function toggleFlagAction(flagId: string): Promise<string | void> {
  const actor = await requireCurrentUser();
  try {
    await toggleFeatureFlag(actor, flagId);
  } catch (error) {
    return toMessage(error);
  }
  revalidatePath("/flags");
}

export async function setRolloutAction(
  flagId: string,
  values: Record<string, string>,
): Promise<string | void> {
  const actor = await requireCurrentUser();
  const percent = Number(values.rolloutPercent);
  if (!Number.isInteger(percent)) return "Enter a whole number between 0 and 100.";
  try {
    await updateFeatureFlag(actor, flagId, { rolloutPercent: percent });
  } catch (error) {
    return toMessage(error);
  }
  revalidatePath("/flags");
}
