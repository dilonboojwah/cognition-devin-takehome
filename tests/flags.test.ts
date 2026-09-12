import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { AuthorizationError } from "@/lib/authorize";
import { ROLLOUT_PERCENT_MAX } from "@/lib/config";
import { FlagRuleError, toggleFeatureFlag, updateFeatureFlag } from "@/lib/flags";
import { makeFeatureFlag, makeUser } from "./factories";

describe("feature flag rules", () => {
  it("test 12: eng_admin changes a flag and the audit event carries old and new values", async () => {
    const engAdmin = await makeUser("eng_admin");
    const flag = await makeFeatureFlag({ enabled: false, rolloutPercent: 0 });

    await updateFeatureFlag(engAdmin, flag.id, { enabled: true, rolloutPercent: 25 });

    const updated = await prisma.featureFlag.findUniqueOrThrow({ where: { id: flag.id } });
    expect(updated).toMatchObject({ enabled: true, rolloutPercent: 25 });

    const events = await prisma.auditEvent.findMany();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      action: "flag.update",
      resourceType: "FeatureFlag",
      resourceId: flag.id,
      outcome: "success",
    });
    expect(JSON.parse(events[0].oldValue!)).toMatchObject({
      enabled: false,
      rolloutPercent: 0,
    });
    expect(JSON.parse(events[0].newValue!)).toMatchObject({
      enabled: true,
      rolloutPercent: 25,
    });
  });

  it("test 12: a role without flag.update is denied and audited", async () => {
    const financeAdmin = await makeUser("finance_admin");
    const flag = await makeFeatureFlag({ enabled: false });

    await expect(toggleFeatureFlag(financeAdmin, flag.id)).rejects.toBeInstanceOf(
      AuthorizationError,
    );

    const unchanged = await prisma.featureFlag.findUniqueOrThrow({ where: { id: flag.id } });
    expect(unchanged.enabled).toBe(false);
    const events = await prisma.auditEvent.findMany();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ action: "flag.update", outcome: "denied" });
  });

  it("test 13: a rollout percent above the maximum is rejected", async () => {
    const engAdmin = await makeUser("eng_admin");
    const flag = await makeFeatureFlag({ rolloutPercent: 10 });

    await expect(
      updateFeatureFlag(engAdmin, flag.id, { rolloutPercent: ROLLOUT_PERCENT_MAX + 1 }),
    ).rejects.toBeInstanceOf(FlagRuleError);
    await expect(
      updateFeatureFlag(engAdmin, flag.id, { rolloutPercent: -1 }),
    ).rejects.toBeInstanceOf(FlagRuleError);

    const unchanged = await prisma.featureFlag.findUniqueOrThrow({ where: { id: flag.id } });
    expect(unchanged.rolloutPercent).toBe(10);
    expect(await prisma.auditEvent.count()).toBe(0);
  });
});
