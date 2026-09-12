import { ActionDialog } from "@/components/kit/ActionDialog";
import { ActivityList } from "@/components/kit/ActivityList";
import { DetailPanel } from "@/components/kit/DetailPanel";
import { RoleBadge } from "@/components/kit/RoleBadge";
import { StatusBadge } from "@/components/kit/StatusBadge";
import { requireCurrentUser } from "@/lib/auth";
import { can, ROLE_LABELS, type Role } from "@/lib/authorize";
import { KYC_RISK_HIGH_MIN } from "@/lib/config";
import { formatDateTime } from "@/lib/format";
import {
  getKycCase,
  isTerminal,
  KYC_RESOURCE_TYPE,
  parseDocuments,
  riskLevel,
} from "@/lib/kyc";
import { File, FileImage, FileSpreadsheet, FileText } from "lucide-react";
import { approveKycAction, escalateKycAction, rejectKycAction } from "./actions";

const DOCUMENT_ICONS = [
  { ext: /\.pdf$/i, icon: FileText, className: "text-red-500" },
  { ext: /\.(csv|xls|xlsx)$/i, icon: FileSpreadsheet, className: "text-emerald-600" },
  { ext: /\.(jpe?g|png|gif|webp|heic)$/i, icon: FileImage, className: "text-sky-500" },
] as const;

function DocumentIcon({ name }: { name: string }) {
  const match = DOCUMENT_ICONS.find((entry) => entry.ext.test(name));
  const Icon = match?.icon ?? File;
  return <Icon className={`size-4 ${match?.className ?? "text-muted-foreground"}`} />;
}

/** Detail card rendered beside the KYC table when a row is selected. */
export async function KycDetail({ id }: { id: string }) {
  const user = await requireCurrentUser();
  const kycCase = await getKycCase(id);
  if (!kycCase) {
    return <p className="text-[13px] text-muted-foreground">Case not found.</p>;
  }

  const level = riskLevel(kycCase.riskScore);
  const settled = isTerminal(kycCase.status);
  const escalated = kycCase.status === "escalated";
  // The server re-checks all of this inside the transaction; hiding the buttons
  // is only a convenience.
  const mayDecide =
    !settled &&
    (escalated ? can(user.role, "kyc.decide_escalated") : can(user.role, "kyc.decide")) &&
    !(level === "high" && !escalated);
  const mayEscalate =
    !settled && !escalated && level === "high" && can(user.role, "kyc.decide");
  const roleLabel = ROLE_LABELS[user.role as Role] ?? user.role;

  const blockedBecause = settled
    ? `This case is ${kycCase.status} and cannot change.`
    : escalated
      ? `${roleLabel} cannot decide escalated cases.`
      : !can(user.role, "kyc.decide")
        ? `${roleLabel} cannot decide KYC cases.`
        : null;

  const decisionFields = level === "high" ? { noteLabel: "Note", requireNote: true } : {};

  return (
    <DetailPanel
      compact
      title={kycCase.applicantName}
      description={
        level === "high" && !escalated && !settled
          ? `Scores ${KYC_RISK_HIGH_MIN} or above may only be escalated.`
          : undefined
      }
      actions={
        mayDecide || mayEscalate ? (
          <>
            {mayDecide && (
              <>
                <ActionDialog
                  trigger="Approve"
                  title="Approve this case"
                  confirmLabel="Approve"
                  action={approveKycAction.bind(null, kycCase.id)}
                  {...decisionFields}
                />
                <ActionDialog
                  trigger="Reject"
                  variant="destructive"
                  title="Reject this case"
                  description="Rejection is terminal."
                  confirmLabel="Reject"
                  action={rejectKycAction.bind(null, kycCase.id)}
                  {...decisionFields}
                />
              </>
            )}
            {mayEscalate && (
              <ActionDialog
                trigger="Escalate"
                variant="secondary"
                title="Escalate this case"
                description="A finance admin decides escalated cases."
                confirmLabel="Escalate"
                noteLabel="Note"
                action={escalateKycAction.bind(null, kycCase.id)}
              />
            )}
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
        { label: "Status", value: <StatusBadge status={kycCase.status} /> },
        {
          label: "Risk",
          value: (
            <span className="flex items-center gap-2">
              <span className="tabular-nums">{kycCase.riskScore}</span>
              <StatusBadge status={level} />
            </span>
          ),
        },
        { label: "Country", value: kycCase.country },
        { label: "Submitted", value: formatDateTime(kycCase.submittedAt) },
        {
          label: "Decided by",
          value: kycCase.decidedBy ? (
            <span className="flex items-center gap-2">
              {kycCase.decidedBy.name}
              <RoleBadge role={kycCase.decidedBy.role} />
            </span>
          ) : (
            <span className="text-muted-foreground">Nobody yet</span>
          ),
        },
        {
          label: "Decided",
          value: kycCase.decidedAt ? (
            formatDateTime(kycCase.decidedAt)
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
        },
      ]}
    >
      <div className="border-t pt-5">
        <h3 className="eyebrow">Documents</h3>
        <ul className="mt-4 divide-y border-y">
          {parseDocuments(kycCase.documents).map((document) => (
            <li key={document} className="flex items-center gap-2.5 py-2.5 text-[13px]">
              <DocumentIcon name={document} />
              {document}
            </li>
          ))}
        </ul>
      </div>

      {kycCase.note && (
        <div className="border-t pt-5">
          <h3 className="eyebrow">Note</h3>
          <p className="mt-4 text-[13px] text-muted-foreground">{kycCase.note}</p>
        </div>
      )}

      <div className="border-t pt-5">
        <h3 className="eyebrow">Activity</h3>
        <ActivityList resourceType={KYC_RESOURCE_TYPE} resourceId={kycCase.id} />
      </div>
    </DetailPanel>
  );
}
