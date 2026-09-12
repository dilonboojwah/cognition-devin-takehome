import { prisma } from "@/lib/db";
import { ROLLOUT_PERCENT_MAX, ROLLOUT_PERCENT_MIN } from "@/lib/config";
import { runMutation, type Actor, type Tx } from "@/lib/mutation";

export const FLAG_RESOURCE_TYPE = "FeatureFlag";

export class FlagRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FlagRuleError";
  }
}

export async function listFeatureFlags() {
  return prisma.featureFlag.findMany({
    orderBy: { key: "asc" },
    include: { updatedBy: true },
  });
}

export async function getFeatureFlag(id: string) {
  return prisma.featureFlag.findUnique({ where: { id }, include: { updatedBy: true } });
}

function snapshot(flag: { id: string; key: string; enabled: boolean; rolloutPercent: number }) {
  return {
    id: flag.id,
    key: flag.key,
    enabled: flag.enabled,
    rolloutPercent: flag.rolloutPercent,
    // A flag has no status column, but ActivityList and the audit log render a
    // record's `status`, so both halves of what can change are folded into one.
    status: `${flag.enabled ? "enabled" : "disabled"} at ${flag.rolloutPercent}%`,
  };
}

export async function updateFeatureFlag(
  actor: Actor,
  id: string,
  changes: { enabled?: boolean; rolloutPercent?: number },
) {
  await runMutation({
    actor,
    action: "flag.update",
    resourceType: FLAG_RESOURCE_TYPE,
    resourceId: id,
    run: async (tx: Tx) => {
      // Re-read inside the transaction: two admins editing one flag must not
      // audit the same stale old value.
      const flag = await tx.featureFlag.findUnique({ where: { id } });
      if (!flag) throw new FlagRuleError("Flag not found");

      const percent = changes.rolloutPercent;
      if (
        percent !== undefined &&
        (!Number.isInteger(percent) ||
          percent < ROLLOUT_PERCENT_MIN ||
          percent > ROLLOUT_PERCENT_MAX)
      ) {
        throw new FlagRuleError(
          `Rollout percent must be a whole number between ${ROLLOUT_PERCENT_MIN} and ${ROLLOUT_PERCENT_MAX}`,
        );
      }

      const updated = await tx.featureFlag.update({
        where: { id },
        data: {
          enabled: changes.enabled ?? flag.enabled,
          rolloutPercent: changes.rolloutPercent ?? flag.rolloutPercent,
          updatedById: actor.id,
        },
      });
      return { oldValue: snapshot(flag), newValue: snapshot(updated) };
    },
  });
}

export async function toggleFeatureFlag(actor: Actor, id: string) {
  const flag = await prisma.featureFlag.findUnique({ where: { id } });
  if (!flag) throw new FlagRuleError("Flag not found");
  return updateFeatureFlag(actor, id, { enabled: !flag.enabled });
}
