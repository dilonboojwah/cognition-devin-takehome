import { describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { AuthorizationError, type Action, type Role } from "@/lib/authorize";
import { auditWriter, runMutation } from "@/lib/mutation";
import { makeUser } from "./factories";

const DENIED_BY_ROLE: Array<[Role, Action]> = [
  ["ops_analyst", "refund.approve"],
  ["kyc_reviewer", "refund.request"],
  ["finance_admin", "kyc.decide"],
  ["eng_admin", "refund.request"],
];

describe("test 1: authorization denials are enforced and audited", () => {
  it.each(DENIED_BY_ROLE)("denies %s the action %s", async (role, action) => {
    const actor = await makeUser(role);
    const run = vi.fn();

    await expect(
      runMutation({
        actor,
        action,
        resourceType: "Refund",
        resourceId: "r1",
        run,
      }),
    ).rejects.toBeInstanceOf(AuthorizationError);

    expect(run).not.toHaveBeenCalled();
    const events = await prisma.auditEvent.findMany();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ actorId: actor.id, action, outcome: "denied" });
  });
});

describe("test 2: runMutation is atomic", () => {
  it("rolls the change back when the audit write fails", async () => {
    const actor = await makeUser("finance_admin");
    const spy = vi
      .spyOn(auditWriter, "write")
      .mockRejectedValueOnce(new Error("audit sink is down"));

    await expect(
      runMutation({
        actor,
        action: "refund.request",
        resourceType: "Refund",
        resourceId: "new",
        run: async (tx) => {
          const refund = await tx.refund.create({
            data: {
              customer: "Contoso",
              amountCents: 100,
              reason: "test",
              status: "pending",
              requestedById: actor.id,
            },
          });
          return { oldValue: null, newValue: refund };
        },
      }),
    ).rejects.toThrow("audit sink is down");

    expect(await prisma.refund.count()).toBe(0);
    expect(await prisma.auditEvent.count()).toBe(0);
    spy.mockRestore();
  });

  it("writes no change when authorize denies", async () => {
    const actor = await makeUser("ops_analyst");
    const run = vi.fn();

    await expect(
      runMutation({
        actor,
        action: "refund.approve",
        resourceType: "Refund",
        resourceId: "r1",
        run,
      }),
    ).rejects.toBeInstanceOf(AuthorizationError);

    expect(run).not.toHaveBeenCalled();
    expect(await prisma.refund.count()).toBe(0);
    const events = await prisma.auditEvent.findMany();
    expect(events.map((event) => event.outcome)).toEqual(["denied"]);
  });
});
