import { AppShell } from "@/components/kit/AppShell";
import { DataTable, type DataTableRow } from "@/components/kit/DataTable";
import { RoleBadge } from "@/components/kit/RoleBadge";
import { StatusBadge } from "@/components/kit/StatusBadge";
import { KYC_RISK_HIGH_MIN } from "@/lib/config";
import { KYC_RISK_LEVELS, KYC_STATUSES, listKycCases, riskLevel } from "@/lib/kyc";
import { KycDetail } from "./detail";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

function ageInDays(submittedAt: Date): number {
  return Math.floor((Date.now() - submittedAt.getTime()) / DAY_MS);
}

export default async function KycPage({
  searchParams,
}: {
  searchParams: Promise<{ kyc?: string | string[] }>;
}) {
  const { kyc } = await searchParams;
  const selectedId = Array.isArray(kyc) ? kyc[0] : kyc;
  const cases = await listKycCases();

  const rows: DataTableRow[] = cases.map((kycCase) => {
    const level = riskLevel(kycCase.riskScore);
    const age = ageInDays(kycCase.submittedAt);
    return {
      id: kycCase.id,
      // Clicking the open row again closes the card.
      href: kycCase.id === selectedId ? "/kyc" : `/kyc?kyc=${kycCase.id}`,
      status: kycCase.status,
      facets: { risk: level },
      searchText: `${kycCase.applicantName} ${kycCase.country}`,
      cells: {
        applicant: kycCase.applicantName,
        country: <span className="text-muted-foreground">{kycCase.country}</span>,
        risk: (
          <span className="flex items-center gap-2">
            <span className="tabular-nums">{kycCase.riskScore}</span>
            <StatusBadge status={level} />
          </span>
        ),
        age: `${age}d`,
        status: <StatusBadge status={kycCase.status} />,
      },
    };
  });

  return (
    <AppShell
      title="KYC review queue"
      description={
        <>
          Oldest submission first. Cases scoring {KYC_RISK_HIGH_MIN} or above may only be
          escalated by a <RoleBadge role="kyc_reviewer" className="mx-0.5 -translate-y-px" />,
          then decided by a{" "}
          <RoleBadge role="finance_admin" className="mx-0.5 -translate-y-px" /> with a note.
        </>
      }
    >
      <section className="space-y-4 border-t pt-5">
        <div className="flex h-9 items-center justify-between gap-4">
          <h2 className="eyebrow">All cases</h2>
        </div>

        {/* Below ~1440px there is not room for table and card side by side,
            so the card stacks under the table. Above it, w-max lets the row
            spill past the column's right edge without shrinking the table. */}
        <div className="flex flex-col items-start gap-6 min-[1440px]:w-max min-[1440px]:flex-row">
          <div className="min-w-0">
            <DataTable
              columns={[
                { key: "applicant", label: "Applicant" },
                { key: "country", label: "Country" },
                { key: "risk", label: "Risk" },
                { key: "age", label: "Age", className: "tabular-nums" },
                { key: "status", label: "Status" },
              ]}
              rows={rows}
              filterPlaceholder="Filter by applicant or country…"
              statusOptions={[...KYC_STATUSES]}
              facets={[
                {
                  key: "risk",
                  label: "All risk levels",
                  options: KYC_RISK_LEVELS.map((level) => ({
                    value: level,
                    label: `${level[0].toUpperCase()}${level.slice(1)} risk`,
                  })),
                },
              ]}
              emptyMessage="No cases match this filter."
            />
          </div>

          {selectedId && (
            <aside className="w-full shrink-0 rounded-lg border bg-card p-5 min-[1440px]:sticky min-[1440px]:top-6 min-[1440px]:w-96">
              <KycDetail id={selectedId} />
            </aside>
          )}
        </div>
      </section>
    </AppShell>
  );
}
