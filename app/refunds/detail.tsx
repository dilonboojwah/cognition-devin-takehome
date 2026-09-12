import { ActionButton } from "@/components/kit/ActionButton";
import { ActivityList } from "@/components/kit/ActivityList";
import { ActionDialog } from "@/components/kit/ActionDialog";
import { DetailPanel } from "@/components/kit/DetailPanel";
import { RoleBadge } from "@/components/kit/RoleBadge";
import { StatusBadge } from "@/components/kit/StatusBadge";
import { requireCurrentUser } from "@/lib/auth";
import { can, ROLE_LABELS, type Role } from "@/lib/authorize";
import { formatDateTime, formatMoney } from "@/lib/format";
import { approvalsRequired, getRefund, isTerminal, REFUND_RESOURCE_TYPE } from "@/lib/refunds";
import { approveRefundAction, rejectRefundAction } from "./actions";

/** Detail card rendered beside the refunds table when a row is selected. */
export async function RefundDetail({ id }: { id: string }) {
  const user = await requireCurrentUser();
  const refund = await getRefund(id);
  if (!refund) {
    return <p className="text-[13px] text-muted-foreground">Refund not found.</p>;
  }

  const approvals = refund.approvals.filter((a) => a.decision === "approve").length;
  const required = approvalsRequired(refund.amountCents);
  const settled = isTerminal(refund.status);
  const alreadyDecided = refund.approvals.some((a) => a.approverId === user.id);
  const ownRefund = refund.requestedById === user.id;
  // The server re-checks all of this inside the transaction; hiding the buttons
  // is only a convenience.
  const mayDecide =
    can(user.role, "refund.approve") && !settled && !alreadyDecided && !ownRefund;

  const blockedBecause = !can(user.role, "refund.approve")
    ? `${ROLE_LABELS[user.role as Role] ?? user.role} cannot decide refunds.`
    : settled
      ? `This refund is ${refund.status.replaceAll("_", " ")} and cannot change.`
      : ownRefund
        ? "You requested this refund, so you cannot decide it."
        : alreadyDecided
          ? "You already recorded a decision on this refund."
          : null;

  return (
    <DetailPanel
      compact
      title={formatMoney(refund.amountCents)}
      description={refund.reason}
      actions={
        mayDecide ? (
          <>
            <ActionButton label="Approve" action={approveRefundAction.bind(null, refund.id)} />
            <ActionDialog
              trigger="Reject"
              variant="destructive"
              title="Reject this refund"
              description="Rejection is terminal."
              confirmLabel="Reject"
              noteLabel="Note"
              action={rejectRefundAction.bind(null, refund.id)}
            />
          </>
        ) : (
          blockedBecause && (
            <p className="text-[13px] text-muted-foreground">
              {blockedBecause}
            </p>
          )
        )
      }
      fields={[
        { label: "Status", value: <StatusBadge status={refund.status} /> },
        { label: "Approvals", value: `${approvals} of ${required}` },
        { label: "Customer", value: refund.customer },
        {
          label: "Requested by",
          value: (
            <span className="flex items-center gap-2">
              {refund.requestedBy.name}
              <RoleBadge role={refund.requestedBy.role} />
            </span>
          ),
        },
        { label: "Created", value: formatDateTime(refund.createdAt) },
        { label: "Last updated", value: formatDateTime(refund.updatedAt) },
      ]}
    >
      <div className="border-t pt-5">
        <h3 className="eyebrow">Approval history</h3>
        {refund.approvals.length === 0 ? (
          <p className="mt-4 text-[13px] text-muted-foreground">No decisions yet.</p>
        ) : (
          <ul className="mt-4 divide-y border-y">
            {refund.approvals.map((approval) => (
              <li key={approval.id} className="py-3 text-[13px]">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    status={approval.decision === "approve" ? "approved" : "rejected"}
                  />
                  <span>{approval.approver.name}</span>
                  <RoleBadge role={approval.approver.role} />
                  <span className="ml-auto text-muted-foreground tabular-nums">
                    {formatDateTime(approval.createdAt)}
                  </span>
                </div>
                {approval.note && (
                  <p className="mt-2 text-muted-foreground">{approval.note}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t pt-5">
        <h3 className="eyebrow">Activity</h3>
        <ActivityList resourceType={REFUND_RESOURCE_TYPE} resourceId={refund.id} />
      </div>
    </DetailPanel>
  );
}
