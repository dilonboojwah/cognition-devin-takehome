import { Banknote, ShieldCheck, ToggleRight, type LucideIcon } from "lucide-react";

export type Tool = {
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

/** Adding an entry here adds the nav item and the home page card. */
export const TOOLS: Tool[] = [
  {
    slug: "refunds",
    title: "Refunds",
    description:
      "An active log of refunds customers are owed. Refunds of $500 or more need 2 distinct finance admin approvals.",
    icon: Banknote,
  },
  {
    slug: "kyc",
    title: "KYC Review Queue",
    description:
      "An active log of customer signups needing to be verified. Cases scoring 70 or above are escalated to a KYC reviewer, then decided by a finance admin.",
    icon: ShieldCheck,
  },
  {
    slug: "flags",
    title: "Feature Flags",
    description: "An eng admin dashboard to monitor/toggle rollout % for new features.",
    icon: ToggleRight,
  },
];
