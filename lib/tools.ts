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
    description: "An active log of refunds customers are owed.",
    icon: Banknote,
  },
  {
    slug: "kyc",
    title: "KYC Review Queue",
    description: "An active log of customer signups needing to be verified.",
    icon: ShieldCheck,
  },
  {
    slug: "flags",
    title: "Feature Flags",
    description: "An eng admin dashboard to monitor/toggle rollout % for new features.",
    icon: ToggleRight,
  },
];
