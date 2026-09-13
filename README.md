# Internal Tools Starter Kit

- **Working prototype:** https://cognition-devin-takehome.vercel.app/
- **Presentation:** https://cognition-takehome-presentation.vercel.app/

An internal tools start kit to allow scaling to 10 apps fast with Devin. See [SPEC.md](SPEC.md) for full brief.

## Prototype Scope

Internal Tools Starting Kit: build the 3 existing Power Apps on a shared primitive foundation (KYC review queue, refunds dashboard, feature-flag panel)

- Role-based permissions, audit log, reusable UI components
- 3 apps because that proves the foundation holds. 1 app proves Devin can write a web app, but apps 2 and 3 show that the playbook from 1 is reusable.

## Architecture

Each layer only talks to the one below it.

| Layer | Where | What it does |
|---|---|---|
| Pages | `app/<tool>/`, `components/kit/` | Frontend. |
| Server actions | `app/<tool>/actions.ts` | Gets user, calls business function, returns error. |
| Domain rules | `lib/<tool>.ts` | Product logic: who can approve a refund, when a KYC case must escalate. |
| Write path | `lib/mutation.ts`, `lib/authorize.ts`, `lib/audit.ts` | `runMutation()` resolves the user, checks permission, opens a transaction, applies the change, writes one audit event in the same commit. If audit fails, the change rolls back. |

## How to Use This Prototype

- **Home (`/`).** One card per tool, plus the permission matrix rendered live from the same
  `PERMISSIONS` list the server enforces — "who can do what" is a screenshot, not a wiki page.
- **Refunds (`/refunds`).** Ops analysts request, finance admins decide. $500+ needs two
  distinct admin approvals; a requester can't decide their own. Missing buttons on a detail
  card tell you which rule excluded you.
- **KYC (`/kyc`).** Oldest-first queue; risk is derived from the score. Reviewers decide
  low-risk cases; 70+ can only be escalated to a finance admin, who must attach a note.
- **Flags (`/flags`).** The deliberately awkward tool — no status field, just `enabled` and
  a rollout percent, which is where the shared components' assumptions get stressed.
- **Audit (`/audit`).** Every attempted change, including denied ones — actor, role, action,
  old → new, outcome. The same reader powers each card's Activity section.
- **Roles.** The header selector swaps between five seeded people. Fastest tour: open the
  $500 refund as ops analyst (no approve button), approve as one finance admin, finish as the
  other — then find it all in Audit Trail.

## Build Process

**Session 1** built the spec, the foundation (permissions, audit, layout,
tables), the Playbook, and Refunds page. **Session 2** built KYC and Flags pages by following the
Playbook end to end.

The Playbook reduces a new tool to: one line in the tool registry, a domain module, and a
page (table + detail card + action dialog) with tests.

## Limitations/Tradeoffs

Didn't build: real sign-in, production database config, deployment plumbing.

Tradoffs:

- **Power Apps gives identity, permissions, audit, and governance without an engineer.**
  Here they are code we own (we must review and maintain).
- **No drag-and-drop for non-engineers.** Every tool is a spec + Devin session + PR review.

## What Needs to Happen in Prod

- **Real sign-in**: Entra SSO end-to-end, group-to-role mapping, `view-as` switcher removed
- **Postgres instead of SQLite**
- **Platform plumbing**: monitoring, alerting, rate limiting, security headers
- **Secrets management**: rotation, separate values per environment
- **Deployment pipeline**: dev/staging/prod, protected `main`, tests before merge
- **Audit retention and export**: retention windows, CSV/warehouse export for compliance