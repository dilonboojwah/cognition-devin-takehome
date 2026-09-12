import { Banknote, type LucideIcon } from "lucide-react";

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
];
