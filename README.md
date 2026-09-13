# Internal Tools Starter Kit

- **Working prototype:** https://cognition-devin-takehome.vercel.app/ — nothing to install, use the role selector in the header to switch between the five seeded people
- **Loom walkthrough:** _link goes here_
- **Presentation:** https://cognition-takehome-presentation.vercel.app/ — the four-slide build-vs-buy summary

A code-first replacement for the primitives a fintech gets from Power Apps: server-side
authorization, an audit event written inside the same transaction as every change, explicit
state machines, and a tool registry that drives navigation. See [SPEC.md](SPEC.md) for the
full brief.

## Prototype Scope

Build the 3 existing Power Apps on a shared primitive foundation — KYC review queue, refunds
dashboard, feature-flag panel — plus an audit trail page.

- Role-based permissions enforced on the server, a transactional audit log, reusable UI
  components, and a tool registry that drives navigation.
- Why I chose this: to show that app #10 will be easy to scale to. One app proves Devin can
  write a web app; three prove the foundation holds, and the second and third are where the
  foundation's silent assumptions surfaced.

## Architecture

Each layer only talks to the one below it.

| Layer | Where | What it does |
|---|---|---|
| Pages | `app/<tool>/`, `components/kit/` | Frontend. Tables, detail cards, action dialogs. The UI never decides permissions; it only renders what the server allows. |
| Server actions | `app/<tool>/actions.ts` | Get the user, call the business function, return the error. Thin wrappers with no logic. |
| Domain rules | `lib/<tool>.ts` | Product logic: who can approve a refund, when a KYC case must escalate, what a valid rollout is. |
| Foundation write path | `lib/mutation.ts`, `lib/authorize.ts`, `lib/audit.ts` | Shared by all tools. `runMutation()` resolves who the user is, checks their permission, opens a transaction, re-reads the record, applies the change, and writes one audit event in the same commit. |

Two consequences worth stating:

- If the audit write fails, the business change rolls back. There is no path where a decision
  lands without a record of it.
- The single write path is a convention enforced by review and the Playbook, not by the
  compiler — a developer could still import Prisma in a page. Hardening that is listed under
  "What needs to happen in prod."

## How to Use This Prototype

**Home (`/`).** One card per registered tool, and below it the permission matrix rendered
live from `PERMISSIONS` — the same list the server enforces. It exists so "who can do what"
is something you can screenshot for an auditor, not a wiki page that drifts.

**Refunds (`/refunds`).** The money flow. Ops analysts request refunds; finance admins decide
them. At or above $500 a refund needs two distinct finance-admin approvals, a requester can
never decide their own, and approved/rejected are terminal. Open a detail card and the actions
you're missing tell you which rule excluded you.

**KYC review (`/kyc`).** The state-dependent flow. Cases are ordered oldest-first and risk
level is derived from the risk score: a KYC reviewer decides cases under the high band, a case
scoring 70+ can only be escalated, and a finance admin decides escalated cases — with a
required note. The permission being checked depends on the record's current status.

**Feature flags (`/flags`).** The deliberately awkward tool: flags have no status, only
`enabled` and a rollout percent, which stresses the assumptions the first two apps baked into
the shared components. Only the eng admin can toggle or set rollout; 101 is rejected at the
domain layer.

**Audit trail (`/audit`).** One line per attempted change across every tool — actor, role,
action, old value to new value, outcome, including denied attempts. The same reader powers
the Activity section at the bottom of each detail card. Seeded records were created through
the real mutation path, so the history is real.

**Choosing roles.** The role selector in the header swaps between five seeded people (two
finance admins, an ops analyst, a KYC reviewer, an eng admin). Fastest tour: open the $500
Adventure Works refund as the ops analyst (no approve button), switch to either finance
admin, then approve as the other — then find all of it in Audit Trail.

## Build Process

Two sessions.

**Session 1** built the spec, the app foundation (permissions, audit, layout, tables) plus
the Playbook (domain module, page config, action wrappers), and the Refunds tool.

**Session 2** built the KYC and Flags tools by following the Playbook from session 1, end to
end — roughly 40 minutes for KYC and 20 for Flags, with no new migrations and no changes to
the shared primitives.

The Playbook reduces a new tool to:

1. Add 1 line to the tool registry
2. Write the domain module
3. Build the page (table, detail cards, action dialog) and write tests

- Session 1: https://app.devin.ai/sessions/3a448b5a084f4313aa494f53e20d9a0c
- Session 2: https://app.devin.ai/sessions/3a448b5a084f4313aa494f53e20d9a0c

**What the Playbook missed.** The most useful output of building apps two and three. None of
these broke the build, but each is a silent assumption that becomes an inconsistent
re-implementation by app #15:

- **One permission per mutation.** The Playbook assumes the permission is known before the
  record is read; KYC picks `kyc.decide` vs `kyc.decide_escalated` based on the case's current
  status, so it reads the row once to choose, then re-reads inside the transaction.
- **Shared components assume a status.** The table's status filter and the Activity
  transition line both key off a `status` string a flag doesn't have, so `lib/flags.ts`
  synthesises `enabled at 35%` to stay legible.
- **No rule for derived values.** Risk level lives in `lib/` because it drives a rule; the
  age column lives in the page because it's display-only. Right split, unwritten convention.
- **`ActionButton` hangs** on its one-click path (`router.refresh()` inside the action's
  transition); the flag toggle uses `ActionDialog` instead.
- **`StatusBadge` colours are closed** — new statuses fall back to grey silently.

## Limitations/Tradeoffs

Didn't build:

- Sign-in — the role switcher in the top right is demo tooling, not an identity system
- A production database — SQLite locally, the deploy runs on Neon Postgres
- Deployment plumbing — no pipeline, environments, or secrets management

The honest tradeoffs:

- **Power Apps gives identity, permissions, audit, and governance without an engineer.** This
  prototype implements them as code, which means we now own their correctness, review, and
  upkeep.
- **No drag-and-drop for non-engineers.** Every new tool is a spec, a Devin session, and a
  PR review by an engineer. That's the human cost that never amortizes away — it's the line
  item the pilot exists to measure.
- Other gaps: no escalation-specific permission (`escalateKycCase` reuses `kyc.decide`), the
  rollout control is a dialog not a slider, SSO mode is code-complete but never issued a real
  token, concurrency is argued (in-transaction re-reads) rather than proven by a racing test.

## What Needs to Happen in Prod

- **Real sign-in/identity.** Entra SSO configured and exercised, group-to-role mapping, the
  `view-as` switcher removed or restricted outside production.
- **Postgres instead of SQLite.** Already true on the hosted demo; production adds backups,
  migration discipline, and tenant isolation if multiple teams share the platform.
- **Platform plumbing.** Monitoring, alerting, rate limiting, security headers, CSP.
- **Secrets management.** Rotation, and separate values per environment.
- **Deployment pipeline.** Dev, staging, prod; protected `main`; tests required before merge.
- **Audit retention and export.** Retention windows and CSV/warehouse export for compliance.
- **Foundation hardening.** Make `runMutation()` the only write path for real (a lint rule
  banning `prisma` imports outside `lib/`), and fix the three Playbook misses above:
  authorization resolved inside the transaction, display-state adapters for tools without a
  status, and a written rule for where derived values live.

## Run it locally

```bash
npm install
npm run db:setup   # applies migrations, generates the client, seeds SQLite
npm run dev        # http://localhost:3000
npm test           # Vitest, against a throwaway prisma/test.db
```

No environment variables are needed. `.env` is committed and contains only the SQLite path;
the database file itself is gitignored.

## Deploying it

`npm run vercel-build` swaps the datasource provider to PostgreSQL, pushes the schema, seeds
it, and builds. To deploy: import the repo on Vercel, attach a Neon Postgres database (sets
`DATABASE_URL`), add `DEMO_MODE=1`, deploy.

`DEMO_MODE=1` adds a **Reset demo data** button — the hosted demo is a shared database, so
the button restores the seeded dataset without a redeploy. It is the one write path that sits
outside `runMutation()`, deliberately: an operator action on the demo, not a business action.
A deploy also reseeds.

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
