import { Banknote, ShieldCheck, ToggleRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { RoleBadge } from "@/components/kit/RoleBadge";
import { KYC_RISK_HIGH_MIN } from "@/lib/config";

export type Tool = {
  slug: string;
  title: string;
  description: ReactNode;
  icon: LucideIcon;
};

/** Adding an entry here adds the nav item and the home page card. */
export const TOOLS: Tool[] = [
  {
    slug: "refunds",
    title: "Refunds",
    description: "An active log of refunds customers are owed.",
    icon: Banknote,
  },
  {
    slug: "kyc",
    title: "KYC Review Queue",
    description: (
      <>
        An active log of customer signups needing to be verified. All cases need to be
        reviewed by a <RoleBadge role="kyc_reviewer" className="mx-0.5 -translate-y-px" />;
        any case with {KYC_RISK_HIGH_MIN} or higher risk needs to be approved by a{" "}
        <RoleBadge role="finance_admin" className="mx-0.5 -translate-y-px" />.
      </>
    ),
    icon: ShieldCheck,
  },
  {
    slug: "flags",
    title: "Feature Flags",
    description: "An eng admin dashboard to monitor/toggle rollout % for new features.",
    icon: ToggleRight,
  },
];
