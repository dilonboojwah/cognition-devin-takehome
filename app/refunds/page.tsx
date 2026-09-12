import { AppShell } from "@/components/kit/AppShell";
import { ActionDialog } from "@/components/kit/ActionDialog";
import { DataTable, type DataTableRow } from "@/components/kit/DataTable";
import { RoleBadge } from "@/components/kit/RoleBadge";
import { StatusBadge } from "@/components/kit/StatusBadge";
import { requireCurrentUser } from "@/lib/auth";
import { can } from "@/lib/authorize";
import { formatMoney } from "@/lib/format";
import { approvalsRequired, listRefunds, REFUND_STATUSES } from "@/lib/refunds";
import { requestRefundAction } from "./actions";
import { RefundDetail } from "./detail";

export const dynamic = "force-dynamic";

export default async function RefundsPage({
  searchParams,
}: {
  searchParams: Promise<{ refund?: string | string[] }>;
}) {
  const { refund } = await searchParams;
  const selectedId = Array.isArray(refund) ? refund[0] : refund;
  const user = await requireCurrentUser();
  const refunds = await listRefunds();

  const rows: DataTableRow[] = refunds.map((refund) => {
    const approvals = refund.approvals.filter((a) => a.decision === "approve").length;
    return {
      id: refund.id,
      // Clicking the open row again closes the card.
      href: refund.id === selectedId ? "/refunds" : `/refunds?refund=${refund.id}`,
      status: refund.status,
      searchText: `${refund.customer} ${refund.reason} ${refund.requestedBy.name}`,
      cells: {
        customer: refund.customer,
        amount: formatMoney(refund.amountCents),
        reason: <span className="text-muted-foreground">{refund.reason}</span>,
        requestedBy: refund.requestedBy.name,
        approvals: `${approvals} of ${approvalsRequired(refund.amountCents)}`,
        status: <StatusBadge status={refund.status} />,
      },
    };
  });

  return (
    <AppShell
      title="Refunds"
      description={
        <>
          Refunds of $500.00 or more need two distinct{" "}
          <RoleBadge role="finance_admin" className="mx-0.5 -translate-y-px" /> approvals.
        </>
      }
      actions={
        can(user.role, "refund.request") && (
          <ActionDialog
            trigger="Request refund"
            title="Request a refund"
            confirmLabel="Request"
            action={requestRefundAction}
            fields={[
              { name: "customer", label: "Customer", required: true },
              { name: "amount", label: "Amount in dollars", type: "number", required: true },
              { name: "reason", label: "Reason", type: "textarea", required: true },
            ]}
          />
        )
      }
    >
      <section className="space-y-4 border-t pt-5">
        <div className="flex h-9 items-center justify-between gap-4">
          <h2 className="eyebrow">All refunds</h2>
        </div>

        {/* Below ~1440px there is not room for table and card side by side,
            so the card stacks under the table. Above it, w-max lets the row
            spill past the column's right edge without shrinking the table. */}
        <div className="flex flex-col items-start gap-6 min-[1440px]:w-max min-[1440px]:flex-row">
          <div className="min-w-0">
            <DataTable
              columns={[
                { key: "customer", label: "Customer" },
                { key: "amount", label: "Amount", className: "tabular-nums" },
                { key: "reason", label: "Reason" },
                { key: "requestedBy", label: "Requested by" },
                { key: "approvals", label: "Approvals" },
                { key: "status", label: "Status" },
              ]}
              rows={rows}
              filterPlaceholder="Filter by customer, reason or requester…"
              statusOptions={[...REFUND_STATUSES]}
              emptyMessage="No refunds match this filter."
            />
          </div>

          {selectedId && (
            <aside className="w-full shrink-0 rounded-lg border bg-card p-5 min-[1440px]:sticky min-[1440px]:top-6 min-[1440px]:w-96">
              <RefundDetail id={selectedId} />
            </aside>
          )}
        </div>
      </section>
    </AppShell>
  );
}
