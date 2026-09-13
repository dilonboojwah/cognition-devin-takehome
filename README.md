# Internal Tools Starter Kit

A code-first replacement for the primitives a fintech gets from Power Apps: server-side
authorization, an audit event written inside the same transaction as every change, explicit
state machines, and a tool registry that drives the navigation. The apps built on top are
deliberately thin — the rigor lives in `lib/` and `components/kit/`, so tool number four is
cheap. See [SPEC.md](SPEC.md) for the full brief.

Session one built the foundation plus the **Refunds** tool. Session two added **KYC review** and
**Feature flags** by following [`devin/playbook-add-internal-tool.md`](devin/playbook-add-internal-tool.md),
with no new migrations and no change to the shared primitives.

## Try it

**Hosted demo:** https://cognition-devin-takehome.vercel.app — nothing to install. Use the
role selector in the header to switch between the five seeded people; every screen and every
button changes with the role.

**Run it locally:**

```bash
npm install
npm run db:setup   # applies migrations, generates the client, seeds SQLite
npm run dev        # http://localhost:3000
npm test           # Vitest, against a throwaway prisma/test.db
```

No environment variables are needed. `.env` is committed and contains only the SQLite path;
the database file itself is gitignored.

### A five-minute tour

1. Land on **Refunds** as the ops analyst. Open *Adventure Works* ($500). There is no approve
   button: an ops analyst cannot decide refunds, and the card says why.
2. Switch to **Mr Bean** (finance admin) and open the same refund. He already gave the first of
   two approvals, so he still cannot decide it. Switch to **Giyu Tomioka**, the other finance
   admin, and approve. The status moves to approved and the Activity section at the bottom of
   the card records both approvals.
3. Open **KYC Review Queue** as **Dwight Schrute** (KYC reviewer). A low-risk case can be
   approved outright. A case scoring 70 or above offers only *Escalate*.
4. Switch to a finance admin to decide an escalated case. Leaving the note blank is refused.
5. Open **Feature Flags** as **Rain Man** (engineering admin) and change a rollout. Try 101 and
   it is rejected. Every other role sees the same table read-only.
6. Open **Audit Trail**. Every action above is there with the old and new value, including the
   attempts that were denied.

## Deploying it

The schema is authored for SQLite so a clean clone runs with no setup. A hosted deployment needs
a real database, so `npm run vercel-build` swaps the datasource provider to PostgreSQL, pushes
the schema, seeds it, and then builds. Every model uses types both providers share, so nothing
else changes. On Postgres the in-transaction re-reads in `runMutation()` do real work, which they
cannot on a single-writer SQLite file.

To deploy:

1. Import the repository at [vercel.com/new](https://vercel.com/new).
2. In the project, open **Storage**, add a **Neon** Postgres database, and connect it. That sets
   `DATABASE_URL` automatically.
3. In **Settings → Environment Variables**, add `DEMO_MODE=1`.
4. Redeploy.

`DEMO_MODE=1` adds a **Reset demo data** button to the header. The hosted demo is a shared
database, so whatever one visitor approves the next visitor sees already approved; the button
restores the seeded dataset without a redeploy. It is the one write path that deliberately sits
outside `runMutation()`, because it is an operator action on the demo rather than a business
action. Leave it unset for anything real.

Note that a deploy reseeds the database, so preview deployments pointed at the same
`DATABASE_URL` will reset the demo.

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
| KYC review queue | `/kyc` | Oldest submission first, risk level derived from `riskScore` (low under `KYC_RISK_MEDIUM_MIN`, high at `KYC_RISK_HIGH_MIN` and above). A `kyc_reviewer` decides cases below the high band and may only escalate the ones at or above it; a `finance_admin` decides escalated cases; deciding a high-risk case requires a note; `approved` and `rejected` are terminal. |
| Feature flags | `/flags` | Only an `eng_admin` may switch a flag or set its rollout; rollout must be a whole number between `ROLLOUT_PERCENT_MIN` and `ROLLOUT_PERCENT_MAX`; every change audits old and new values. |
| Audit trail | `/audit` (header link, not nav) | Every event across every tool, newest first, with facets for resource type, actor and outcome. Each detail card also ends with a per-record Activity section. |

## Devin sessions

- Session 1 (foundation, Refunds, Playbook): https://app.devin.ai/sessions/3a448b5a084f4313aa494f53e20d9a0c
- Session 2 (KYC and Feature Flags via the Playbook): https://app.devin.ai/sessions/3a448b5a084f4313aa494f53e20d9a0c

## Iteration cost

- **First pass: 4 commits.** Foundation plus Refunds per SPEC, with three fixes found by walking
  the app: the real refund id on the creation audit event, a self-referential font variable,
  and Server Actions rejected behind a preview proxy.
- **UI iteration: 8 commits.** Reviewer-driven restyle: detail page became a card beside the
  table, the audit page was dropped, personas renamed, the switcher rebuilt, and layout bugs
  (scrollbar shift, card clipping under 1440px) fixed.
- **Follow-up: 1 commit.** The audit trail returned in two forms: a per-record `ActivityList`
  in each detail card and a `/audit` page linked from the header rather than the nav.

## Adding tools two and three

Both tools were added by following the Playbook once each, end to end: roughly **40 minutes for
KYC** (three mutations, a state-dependent permission, derived risk and age columns) and **20
minutes for Feature flags** (one mutation, no state machine). No migration, no new shared
primitive, and no change to `components/kit/`.

**What the Playbook covered.** Everything structural. The file list it dictates (`lib/<slug>.ts`,
`app/<slug>/actions.ts`, `page.tsx`, `detail.tsx`, a registry entry, `tests/<slug>.test.ts`) was
exactly the file list both tools needed, and the `runMutation` shape in step 4 was copy-and-fill:
re-read through `tx`, throw a `<Tool>RuleError`, write through `tx`, return snapshots. Steps 5 to 8
(actions, page, Activity, registry) needed no thought at all — the Refunds files are the template
and the primitives took both tools unchanged.

**What it missed.**

- **One action per mutation.** Step 4 assumes the permission is known before the record is read,
  but a KYC decision is `kyc.decide` or `kyc.decide_escalated` depending on the case's current
  status. `lib/kyc.ts` reads the row once outside the transaction just to choose the action, then
  re-reads it inside. `runMutation()` has no seam for a state-dependent permission.
- **No home for derived display values.** Risk level is domain logic (it drives the escalation
  rule) so it lives in `lib/kyc.ts`, but the age column is presentation and lives in
  `app/kyc/page.tsx`, because adding it to `lib/format.ts` would have edited a shared file.
- **Statuses that are not really statuses.** `DataTable`'s status filter and `ActivityList`'s
  transition line both key off a `status` string, which a flag does not have; `lib/flags.ts`
  synthesises `enabled at 35%` into its snapshot so a rollout change is legible as a transition.
  A tool whose records have no lifecycle is off the Playbook's map.
- **`ActionButton` hangs.** Its one-click path calls `router.refresh()` inside the same
  transition as the action, and the button stayed on "Working…" after a successful flag toggle
  even though the write had committed. The toggle now uses `ActionDialog`, which relies on
  `revalidatePath` alone; `ActionButton` is unused by all three tools and was left untouched
  rather than edited.
- **Status colours are closed.** `StatusBadge` owns one tint map, so new statuses (`low`,
  `disabled`) silently fall back to grey. Left alone rather than edit a shared primitive.
- **Named constants.** Step 3 says to add constants to `lib/config.ts` — which is itself a shared
  file, so "do not touch shared code" and "put constants in config" pull against each other. The
  rollout bounds went into `lib/config.ts`: two added exports, nothing changed.

## Known gaps

- **No escalation-specific permission.** `escalateKycCase` reuses `kyc.decide`, so the permission
  matrix shows one row where a reviewer really has two distinct powers.
- **A flag's rollout is set through a dialog, not a slider**, and there is no bulk switch.
- **SSO mode is code-complete but unverified.** There was no Entra tenant in this session, so
  the provider path has never actually issued a token. Dev mode is fully exercised.
- **Concurrency is argued, not proven.** `runMutation()` re-reads inside the transaction, which
  is what makes two simultaneous approvals safe, but there is no test that races two writers;
  SQLite serializes writes, so such a test would not prove much here.
- **Server Actions behind a proxy need `ALLOWED_FORWARDED_HOSTS`.** Next.js rejects a request
  whose forwarded host differs from its origin, which breaks the dev user switcher when the app
  is served through a tunnel or shared preview URL. Set
  `ALLOWED_FORWARDED_HOSTS=my-tunnel.example.com` before `npm run dev`. Running on localhost
  needs nothing.
- **No sign-out or user management UI**, no CSV export, no mobile layout, no dark-mode toggle.
