# Internal Tools Starter Kit

A code-first replacement for the primitives a fintech gets from Power Apps: server-side
authorization, an audit event written inside the same transaction as every change, explicit
state machines, and a tool registry that drives the navigation. The apps built on top are
deliberately thin — the rigor lives in `lib/` and `components/kit/`, so tool number four is
cheap. See [SPEC.md](SPEC.md) for the full brief.

This session built the foundation plus the **Refunds** tool. KYC and Feature Flags are added in
a second session by following [`devin/playbook-add-internal-tool.md`](devin/playbook-add-internal-tool.md).

## Run it

```bash
npm install
npm run db:setup   # applies migrations, generates the client, seeds SQLite
npm run dev        # http://localhost:3000
npm test           # Vitest, against a throwaway prisma/test.db
```

No environment variables are needed. `.env` is committed and contains only the SQLite path;
the database file itself is gitignored.

## How it hangs together

| Layer | Where | Rule |
|---|---|---|
| Identity | `lib/auth.ts` | Everything reads `getCurrentUser()`. Nothing else knows how you signed in. |
| Authorization | `lib/authorize.ts` | One `PERMISSIONS` list. The home page matrix renders from it at request time. |
| Writes | `lib/mutation.ts` | `runMutation()` authorizes, opens a transaction, runs the change, writes one `AuditEvent`, commits. Domain code has no other write path. |
| Audit reads | `lib/audit.ts` | `listAuditEvents()` gates every read with `audit.view`. One reader powers both the per-record `ActivityList` and the `/audit` page. |
| Domain rules | `lib/<tool>.ts` | State machines only, re-reading the record inside the transaction. |
| Pages | `app/<tool>/` | Server actions that call `lib/<tool>.ts`. UI never decides permissions. |
| Navigation | `lib/tools.ts` | Registering a tool adds the nav item and the home card. |

Roles: `ops_analyst`, `kyc_reviewer`, `finance_admin`, `eng_admin`. The live matrix is on `/`.

## Identity: dev mode and SSO mode

**Dev mode (default).** With none of the SSO variables set, the header shows a "Role selector"
menu over the five seeded users. The choice is stored in an HMAC-signed `view-as` cookie.
With no cookie set, the app signs in as the first seeded user holding `DEFAULT_ROLE`
(ops analyst, James Bond) — the least permissive view first. This is what reviewers of this repo use, and what the tests assume.

**SSO mode.** Copy `.env.example` to `.env.local` and set all four of `AUTH_SECRET`,
`AUTH_MICROSOFT_ENTRA_ID_ID`, `AUTH_MICROSOFT_ENTRA_ID_SECRET` and
`AUTH_MICROSOFT_ENTRA_ID_ISSUER`. Auth.js v5 with the Microsoft Entra ID provider then takes
over, `/api/auth/*` starts serving, and the dev switcher disappears. On first sign-in a `User`
row is created and its role is read from the `RoleAssignment` table by email, defaulting to
`ops_analyst`. Sign-in is configuration; authorization is architecture, and it does not change
between the two modes.

## Power Apps concept mapping

| Power Apps concept | Kit equivalent |
|---|---|
| Dataverse table | Prisma model |
| Canvas or model-driven screen | `DataTable` + `DetailPanel` + `ActionDialog` page |
| Security role | `authorize()` permission matrix |
| Power Automate approval flow | State machines in `lib/refunds.ts` and `lib/kyc.ts` |
| Dataverse auditing | `AuditEvent` written in-transaction |
| Environment and app list | `lib/tools.ts` registry driving `AppShell` |
| Entra ID sign-in | Auth.js Entra provider behind `getCurrentUser()` |
| Citizen maker building a new app | Playbook "Add a new internal tool" run by Devin |

## Tools

| Tool | Route | Rules |
|---|---|---|
| Refunds | `/refunds` | Two distinct `finance_admin` approvals at or above `REFUND_DUAL_APPROVAL_THRESHOLD_CENTS` ($500.00), one below. A requester cannot decide their own refund, the same approver cannot decide twice, rejection is terminal, and there is no transition out of `approved` or `rejected`. |
| Audit trail | `/audit` (header link, not nav) | Every event across every tool, newest first, with facets for resource type, actor and outcome. Each detail card also ends with a per-record Activity section. |

## Devin sessions

- Session 1 (foundation, Refunds, Playbook): https://app.devin.ai/sessions/3a448b5a084f4313aa494f53e20d9a0c
- Session 2 (KYC and Feature Flags via the Playbook): to be added by that session.

## Iteration cost

- **First pass: 4 commits.** Foundation plus Refunds per SPEC, with three fixes found by walking
  the app: the real refund id on the creation audit event, a self-referential font variable,
  and Server Actions rejected behind a preview proxy.
- **UI iteration: 8 commits.** Reviewer-driven restyle: detail page became a card beside the
  table, the audit page was dropped, personas renamed, the switcher rebuilt, and layout bugs
  (scrollbar shift, card clipping under 1440px) fixed.
- **Follow-up: 1 commit.** The audit trail returned in two forms: a per-record `ActivityList`
  in each detail card and a `/audit` page linked from the header rather than the nav.

## Known gaps

- **KYC and Feature Flags are not built.** Their Prisma models, seed rows and permission rows
  exist so session two adds code only, never a conflicting migration. Tests 9 to 13 are theirs.
- **SSO mode is code-complete but unverified.** There was no Entra tenant in this session, so
  the provider path has never actually issued a token. Dev mode is fully exercised.
- **Test 14 covers Refunds only.** The assertion shape is ready for the other two tools.
- **Concurrency is argued, not proven.** `runMutation()` re-reads inside the transaction, which
  is what makes two simultaneous approvals safe, but there is no test that races two writers;
  SQLite serializes writes, so such a test would not prove much here.
- **Server Actions behind a proxy need `ALLOWED_FORWARDED_HOSTS`.** Next.js rejects a request
  whose forwarded host differs from its origin, which breaks the dev user switcher when the app
  is served through a tunnel or shared preview URL. Set
  `ALLOWED_FORWARDED_HOSTS=my-tunnel.example.com` before `npm run dev`. Running on localhost
  needs nothing.
- **No sign-out or user management UI**, no CSV export, no mobile layout, no dark-mode toggle.
