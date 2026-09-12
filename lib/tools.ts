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
      "Request, approve and reject customer refunds, with dual approval above $500.",
    icon: Banknote,
  },
  {
    slug: "kyc",
    title: "KYC review queue",
    description:
      "Review applicant identity cases, escalating high-risk ones to a finance admin.",
    icon: ShieldCheck,
  },
  {
    slug: "flags",
    title: "Feature flags",
    description: "Switch features on or off and set their rollout percentage.",
    icon: ToggleRight,
  },
];
