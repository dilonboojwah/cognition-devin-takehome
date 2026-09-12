---
name: test-internal-tools
description: Run local browser tests of internal-tools workflows, role guards, KYC escalation, flags and audit correlation.
---

# Local runtime

Run from the repository root. Source `~/.nvm/nvm.sh` before Node commands. Dependencies use `npm install`; `npm run db:setup` migrates, generates Prisma and resets seed data, so use it only when resetting local data is authorized. Start `npm run dev` on port 3000. Check for an existing listener before starting another server.

## Devin Secrets Needed

None for local development identity switching. Do not infer that production authentication is configured from dev-mode tests.

## Browser paths and fixtures

Use the header `Role selector` / `Switch user` dropdown. Read current seed names rather than hard-coding identities: roles include ops analyst, KYC reviewer, two finance admins, and engineering admin. Sidebar routes include Home and registered tools; Audit trail is reached from the header. Click a row name to open its detail. Query-param cards close when the selected row is clicked again. Dropdowns support Home/End and arrow keys.

After seeding, eight refunds and zero audit events exist. Adventure Works ($500) has one finance admin's first approval; that admin must not see decision actions and the other can supply the second. Read the card history to identify the first approver. Northwind ($12.50) needs only one approval. Contoso is useful for non-mutating role checks.

Read the current SPEC and seed before deriving expected counts. Capture each distinct filter result before changing the filter again. Request visibility differs by role and shifts filter vertical position.

## Audit verification

Request a uniquely named refund through the dialog, open its detail and capture the full URL ID. Search that exact ID on Audit; require exactly one matching creation event and an unknown-ID query returning zero. Add a second actor's mutation when testing actor exclusion. Check total events equals performed mutations and newest-first order. If only Refund events are available, resource selection proves retention, not exclusion of other resource types.

After reseeding or process restart, earlier screenshot IDs and counts belong to the earlier dataset. Label retained lifecycle evidence accordingly rather than representing it as the current database state.

## KYC and feature flags

KYC cards use `/kyc?kyc=<id>` and flag cards use `/flags?flag=<id>`. Read seeds for a pending high-risk KYC case and pending low-risk case. High-risk pending cases expose only Escalate to a reviewer; switch to a finance admin after escalation. Blank and whitespace-only required notes should disable confirmation; a valid note should permit the terminal decision. Verify actor/date, documents, note, and the card's bottom Activity section, scrolling if necessary.

For flag edits use the engineering identity. A disabled flag at 0% makes toggle and rollout changes easy to distinguish. Submit 101 before a valid percentage and verify an inline range error with no mutation. Compare table, card, Activity and global audit; an Activity entry alone does not prove that the changed rollout value is visible.

If an action stays Working despite server completion, record the stale UI before reloading. Reload can distinguish persisted backend state from a failed client update, but does not make the live-update assertion pass. Development SQLite writes can coincide with Fast Refresh logs; capture server/browser output without assuming causality.

Audit text can be truncated. DOM content can corroborate stored values, but do not report values as visibly readable unless screenshots show them. Test available scrolling/hover/expansion rather than modifying styles for evidence.
