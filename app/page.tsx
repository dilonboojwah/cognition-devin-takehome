import Link from "next/link";
import { ArrowUpRight, Check, Flag, Minus, ScanFace } from "lucide-react";
import { AppShell } from "@/components/kit/AppShell";
import { RoleBadge } from "@/components/kit/RoleBadge";
import { PERMISSIONS, ROLES } from "@/lib/authorize";
import { TOOLS } from "@/lib/tools";

export const dynamic = "force-dynamic";

const INCOMING_TOOLS = [
  {
    title: "KYC review",
    description: "Review queue with risk bands, escalation and decision history.",
    icon: ScanFace,
  },
  {
    title: "Feature flags",
    description: "Toggle flags and set rollout percentages with audited changes.",
    icon: Flag,
  },
];

export default function HomePage() {
  return (
    <AppShell
      title="Internal Tools Starter Kit"
      description="A foundation of primitives to scale custom apps quickly"
    >
      <section className="border-t pt-5">
        <h2 className="text-sm font-medium">Tools</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {TOOLS.map((tool) => (
            <Link
              key={tool.slug}
              href={`/${tool.slug}`}
              className="group rounded-lg border bg-card p-5 transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-2 text-[13px] font-medium">
                <tool.icon className="size-3.5" />
                {tool.title}
                <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                {tool.description}
              </p>
            </Link>
          ))}
          {INCOMING_TOOLS.map((tool) => (
            <div key={tool.title} className="rounded-lg border border-dashed p-5">
              <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                <tool.icon className="size-3.5" />
                {tool.title}
                <span className="eyebrow ml-auto">Coming soon</span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                {tool.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t pt-5">
        <h2 className="text-sm font-medium">Permission matrix</h2>
        <table className="mt-5 w-auto border-separate border-spacing-0 text-[13px]">
          <thead>
            <tr>
              <th className="border-b py-2 pr-8 text-left font-normal text-muted-foreground">
                Action
              </th>
              {ROLES.map((role) => (
                <th key={role} className="border-b px-4 py-2 text-center font-normal">
                  <RoleBadge role={role} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((row) => (
              <tr key={row.label}>
                <td className="border-b py-2 pr-8 whitespace-nowrap">{row.label}</td>
                {ROLES.map((role) => (
                  <td key={role} className="border-b px-4 py-2 text-center">
                    {row.roles.includes(role) ? (
                      <Check className="mx-auto size-3.5 text-primary" aria-label="allowed" />
                    ) : (
                      <Minus
                        className="mx-auto size-3.5 text-muted-foreground/50"
                        aria-label="denied"
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
