# Internal Tools Starter Kit: prototype spec

Built with Devin Cloud for a Series C fintech (about 60 engineers) evaluating whether to keep
paying for Power Apps or build internal tools as code. They run three Power Apps today (KYC review
queue, refunds dashboard, feature-flag admin) and plan at least ten more.

## Goal

Replicate the primitives a fintech actually gets from Power Apps, as a small code-first
foundation, and rebuild the three existing apps on it. Each app is deliberately thin. The
foundation is where the rigor lives: server-side authorization, in-transaction audit, explicit
state machines, a tool registry, and a Playbook so the next ten tools are cheap.

## Non-goals

No Postgres, no Docker, no microservices, no deployment pipeline, no AI features inside the app,
no pixel-perfect UI, no mobile layout. Anything not listed below is out of scope.

## Stack

- Next.js (App Router), TypeScript, Tailwind, shadcn/ui
- Prisma with SQLite (database file is gitignored, created by `npm run db:setup`)
- Auth.js (NextAuth v5) for the identity seam, see Identity below
- Vitest for tests
- Run locally with `npm install && npm run db:setup && npm run dev`, nothing else required

## Identity

Two modes behind one seam. All server code reads the user through `getCurrentUser()` in
`lib/auth.ts`. Nothing else in the codebase knows how the user was identified.

1. **Dev mode (default, no env vars).** A "View as" dropdown in the header switches between the
   seeded users. Selection is stored in a signed cookie. This is what reviewers of this repo will
   use.
2. **SSO mode (when `AUTH_MICROSOFT_ENTRA_ID_ID`, `AUTH_MICROSOFT_ENTRA_ID_SECRET`,
   `AUTH_MICROSOFT_ENTRA_ID_ISSUER`, and `AUTH_SECRET` are set).** Auth.js with the Microsoft
   Entra ID provider. On first sign-in, a `User` row is created and its role is assigned from the
   `RoleAssignment` table by email, defaulting to `ops_analyst`. The dev switcher is hidden.

The point of the two modes: sign-in is configuration, authorization is architecture. The client
already has an Entra tenant because they run Power Apps, so this is the provider they would use.
Devin should implement SSO mode but not need real credentials to finish; tests run in dev mode.

## Roles and permissions

| Action | ops_analyst | kyc_reviewer | finance_admin | eng_admin |
|---|---|---|---|---|
| View any tool | yes | yes | yes | yes |
| Request refund | yes | no | yes | no |
| Approve or reject refund | no | no | yes | no |
| Decide KYC case | no | yes | no | no |
| Decide escalated KYC case | no | no | yes | no |
| Change feature flag | no | no | no | yes |
| View audit log | yes | yes | yes | yes |

Enforced only in server code. Domain functions never touch the database directly. They go
through `runMutation()` (see Shared primitives), which authorizes, opens a transaction, runs the
change, and writes the audit event as one unit. A failed check throws and writes a `denied`
audit event. Components may hide buttons for convenience but never decide permissions.

## Data model (Prisma)

- `User(id, name, email, role)`
- `RoleAssignment(email, role)` used by SSO mode
- `Refund(id, customer, amountCents, reason, status, requestedById, createdAt, updatedAt)`
- `RefundApproval(id, refundId, approverId, decision, note, createdAt)`
- `KycCase(id, applicantName, country, riskScore, documents, status, submittedAt, decidedById, decidedAt, note)`
- `FeatureFlag(id, key, description, enabled, rolloutPercent, updatedById, updatedAt)`
- `AuditEvent(id, actorId, action, resourceType, resourceId, oldValue, newValue, outcome, createdAt)`

`oldValue`, `newValue`, and `documents` are JSON strings. `outcome` is `success` or `denied`.

## Audit log (applies to every tool)

- Every mutation writes exactly one `AuditEvent` inside the same database transaction as the
  change. This is guaranteed by `runMutation()`, not by convention.
- Denied authorization attempts write an event with `outcome = denied`.
- No code path updates or deletes an `AuditEvent`.
- Every record's detail card ends with an Activity section (`ActivityList`): that record's
  events, newest first, including denied attempts.
- `/audit` lists events across every tool, newest first, with filters for resource type and
  actor. It is linked from the header as "Audit trail", not from the nav registry, and needs
  no per-tool work.

## Shared primitives (the reusable part)

In `components/kit/` and `lib/`:

- `AppShell`: left nav built from the tool registry, header with current user and the dev switcher
- `DataTable`: column config, text filter, optional status filter
- `StatusBadge`, `ActionDialog` (confirm with optional note), `ActionButton` (one click, no
  confirmation), `DetailPanel`, `ActivityList` (per-record audit trail)
- `getCurrentUser()` in `lib/auth.ts`, `authorize()` in `lib/authorize.ts`
- `runMutation({ actor, action, resourceType, resourceId, run })` in `lib/mutation.ts`. It calls
  `authorize()`, opens a Prisma transaction, calls `run(tx)` which must re-read the current record
  inside the transaction and return `{ oldValue, newValue }`, writes the `AuditEvent`, and commits.
  Domain code has no other write path to the database. Re-reading inside the transaction is what
  makes two simultaneous approvals safe.
- `lib/tools.ts` registry: `{ slug, title, description, icon }`. Adding an entry adds the nav item.
- `lib/config.ts` for named business constants, starting with `REFUND_DUAL_APPROVAL_THRESHOLD_CENTS = 50000`.

Every tool must be built from these. New primitives require a sentence of justification in the PR.

## Home page `/`

Short paragraph on what the kit is, one card per registered tool, and the permission matrix
rendered from the `authorize()` definition at request time (not hand-typed), so reviewers see
who may do what and can trust it matches the code.

## Apps

### Refunds

- `/refunds`: table with status filter. Selecting a row opens a detail card beside the table
  (`?refund=<id>`) with approval history and an Activity section; the card stacks below the
  table on narrow windows.
- Statuses: `pending`, `partially_approved`, `approved`, `rejected`.
- Refunds at or above `REFUND_DUAL_APPROVAL_THRESHOLD_CENTS` ($500.00) need two distinct
  `finance_admin` approvals. Below that, one. Detail card shows "N of M approvals".
- Rules in `lib/refunds.ts`: requester cannot approve own refund; same approver cannot approve
  twice; any rejection is terminal; no transitions out of `approved` or `rejected`. All checks
  run against the record as re-read inside the transaction.

### KYC review queue

- `/kyc`: table sorted oldest submission first, with a risk level column derived from
  `riskScore` (low under 40, medium 40 to 69, high 70 and above) and an age column.
  Selecting a row opens a detail card beside the table (`?kyc=<id>`): applicant, country,
  score, documents list, submitted date, decision history and an Activity section.
- Statuses: `pending_review`, `escalated`, `approved`, `rejected`.
- Rules in `lib/kyc.ts`: `kyc_reviewer` may approve or reject cases with risk below 70; cases with
  risk 70 or above may only be escalated by a reviewer; `finance_admin` decides escalated cases;
  a decision on a high-risk case requires a non-empty note; approved and rejected are terminal.

### Feature flags

- `/flags`: table of flags. `eng_admin` can toggle `enabled` and set `rolloutPercent` 0 to 100.
- Rule in `lib/flags.ts`: rollout percent outside 0 to 100 is rejected; every change audits old
  and new values.

## Tests (Vitest, `npm test`)

Authorization and foundation
1. Each role is denied one action it should not have, and the denial is audited.
2. `runMutation()` rolls back the change when the audit write fails (inject a failure), and
   writes nothing when `authorize()` denies.

Refunds
3. Under threshold: one finance_admin approval moves to `approved`.
4. At threshold: first approval gives `partially_approved`, second distinct approver gives `approved`.
5. Requester cannot approve own refund. 6. Same approver cannot approve twice.
7. Rejection from `partially_approved` is terminal. 8. No transition out of `approved`.

KYC
9. Reviewer decides a low-risk case. 10. Reviewer cannot decide a high-risk case, may only escalate.
11. finance_admin decides an escalated case; a missing note is rejected.

Flags
12. eng_admin changes a flag and the audit event has correct old and new values.
13. Rollout percent 101 is rejected.

Audit
14. Every successful mutation across the three tools produces exactly one audit event.

## Seed data

`prisma/seed.ts`: five users (one per role, plus a second `finance_admin` so the two-approver
flow can be exercised from the switcher) with `RoleAssignment` rows, eight refunds across all
statuses including two at or over threshold, eight KYC cases across risk levels and statuses
with document lists, five feature flags including one partial rollout.

## Build plan and Playbook

Two Devin Cloud sessions, on purpose.

1. Session one (`devin/prompt-session-1.md`): foundation, Refunds, tests 1 to 8 and 14, README.
   At the end Devin rewrites `devin/playbook-add-internal-tool.md` to match the steps it actually
   followed, under 40 lines.
2. Session two (`devin/prompt-session-2.md`): a cold-start session that adds KYC and Feature
   Flags by following the Playbook, using only the shared primitives. Any deviation from the
   Playbook is listed in the PR. This session is the evidence that tool number four is cheap.

## Definition of done

- `npm install && npm run db:setup && npm run dev` works on a clean clone
- `npm test` passes
- Pages render in every role: `/`, `/refunds` (list and `?refund=<id>` card), `/kyc` (list
  and `?kyc=<id>` card), `/flags`, `/audit`
- README covers: what this is, how to run, the Power Apps concept mapping below, how SSO mode is
  enabled, Devin session links, and a "Known gaps" section listing anything not finished

## Power Apps concept mapping (goes in the README)

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
