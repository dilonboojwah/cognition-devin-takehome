# Devin Cloud session 1: foundation + Refunds + Playbook

Read SPEC.md in this repo fully before planning. Ask any clarifying questions before you start,
not mid-run. Build the foundation and the Refunds tool. Do not build KYC or Feature Flags in this
session; a later session will add them by following the Playbook you write at the end.

Order of work:
1. Scaffold Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + Prisma (SQLite) + Vitest
   + Auth.js v5. Scripts: `db:setup` (migrate + seed), `dev`, `test`.
2. Prisma schema for every model in SPEC.md (including KycCase and FeatureFlag, so later
   sessions only add code, not migrations that conflict). Seed per SPEC.md.
3. Foundation in `lib/`: `auth.ts` (getCurrentUser, dev switcher by default, Entra SSO when env
   vars exist), `authorize.ts`, `mutation.ts` (runMutation exactly as specified), `tools.ts`,
   `config.ts`.
4. `components/kit/`: AppShell, DataTable, StatusBadge, ActionDialog, DetailPanel.
5. Home page `/` with the live permission matrix. `/audit` page with filters.
6. Refunds: `lib/refunds.ts` using runMutation only, then `/refunds` and `/refunds/[id]`.
   Register it in `lib/tools.ts`.
7. Tests 1 to 8 and 14 (for Refunds) from SPEC.md. Run them. Fix until green.
8. Start the dev server and check `/`, `/refunds`, a refund detail, and `/audit` in every role.
   Walk the two-approver flow using the two finance_admin users. Attach screenshots to the PR.
9. Rewrite `devin/playbook-add-internal-tool.md` to match the steps you actually followed for
   Refunds, generalized for any tool. Under 40 lines. Someone with no context should be able to
   add a tool by following it.
10. Write README.md: what this is, how to run, how SSO mode is enabled, the Power Apps concept
    mapping table from SPEC.md, a "Known gaps" section.

Constraints:
- Authorization, state transitions, and database writes live only in `lib/`. Domain code writes
  to the database only through runMutation.
- Build the UI only from the shared primitives. A new primitive needs one sentence of
  justification in the PR.
- No dependencies beyond the SPEC.md stack without a sentence of justification.
- Prefer a complete foundation and green tests over UI polish.

Open a PR against main titled "Starter kit foundation + Refunds" with what was built, test
output, and anything you were unsure about.
