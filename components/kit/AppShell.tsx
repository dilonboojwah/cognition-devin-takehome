import Link from "next/link";
import type { ReactNode } from "react";
import { Home } from "lucide-react";
import { getCurrentUser, isSsoEnabled, listSwitchableUsers } from "@/lib/auth";
import { can } from "@/lib/authorize";
import { TOOLS } from "@/lib/tools";
import { RoleBadge } from "@/components/kit/RoleBadge";
import { UserSwitcher } from "@/components/kit/UserSwitcher";

type Props = {
  title: string;
  description?: ReactNode;
  /** Rendered at the top right of the page, level with the title. */
  actions?: ReactNode;
  children: ReactNode;
};

const NAV_LINK =
  "flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground";

/** Nav comes from the tool registry, so registering a tool is all it takes. */
export async function AppShell({ title, description, actions, children }: Props) {
  const user = await getCurrentUser();
  const switchable = await listSwitchableUsers();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 border-r px-4 py-6 md:block">
        <Link href="/" className="block px-3 text-[13px] font-medium tracking-tight">
          Internal Tools
        </Link>
        <nav className="mt-8 space-y-0.5">
          <Link href="/" className={NAV_LINK}>
            <Home className="size-3.5" />
            Home
          </Link>
          {TOOLS.map((tool) => (
            <Link key={tool.slug} href={`/${tool.slug}`} className={NAV_LINK}>
              <tool.icon className="size-3.5" />
              {tool.title}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b px-8 py-6">
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="text-[22px] font-medium">{user.name}</span>
                <RoleBadge role={user.role} className="px-3 py-1 text-sm" />
              </>
            ) : (
              <span className="text-muted-foreground">Not signed in</span>
            )}
          </div>
          <div className="flex items-center gap-5">
            {isSsoEnabled() ? (
              <span className="eyebrow">Entra ID SSO</span>
            ) : (
              user && <UserSwitcher users={switchable} currentId={user.id} />
            )}
            {user && can(user.role, "audit.view") && (
              <Link
                href="/audit"
                className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
              >
                Audit trail
              </Link>
            )}
          </div>
        </header>

        <main className="flex-1 px-8 py-10">
          <div className="mx-auto w-full max-w-5xl space-y-10">
            <div className="flex items-start justify-between gap-4">
              <div className="max-w-2xl">
                <h1 className="text-[28px] leading-tight">{title}</h1>
                {description && (
                  <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                )}
              </div>
              {actions && <div className="pt-1">{actions}</div>}
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
