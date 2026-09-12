# Session 1 follow-up: audit visibility, layout, docs

Pull the branch first; there are new local commits (default dev user is now the ops analyst,
card stacks below 1440px). Four changes on this branch, then update the PR. Do them in this
order and push once at the end.

## 1. Audit trail, two views

The audit log page was removed because a nav-level event dump was clutter. Bring the trail
back in two forms, neither in the sidebar nav:

a. **Activity section in the detail card.** Add an `ActivityList` primitive to
   `components/kit/` that takes `resourceType` and `resourceId` and renders that record's
   `AuditEvent`s newest first: actor name and role badge, action, old status to new status
   where present, timestamp, and denied attempts marked clearly. Read through
   `listAuditEvents` in `lib/audit.ts` (extend its filters to accept `resourceId`). Render it at
   the bottom of `app/refunds/detail.tsx` under an "Activity" heading. This is per record and
   every future tool will reuse it.

b. **Cross-tool page at `/audit`.** Restore the full page: all events across all resource
   types, newest first, `DataTable` with facets for resource type and actor, gated by
   `audit.view`. Do not add it to `TOOLS` or the sidebar. Link to it from one small text link
   in the header, right of the role selector, labelled "Audit trail". It needs no changes
   when KYC and Flags arrive; it should already show their events once they exist.

## 2. Detail card layout

The latest commit stacks the card under the table below 1440px and keeps the `w-max` spill
above it. Finish the job: at 1440 and wider, use a real two-column layout where table and card
share the available width (card fixed at about 360px, table takes the rest) instead of
spilling past the column edge. Remove the `w-max` hack and the scrollbar-gutter workaround
that existed only to support it. Side by side should start at the `xl` breakpoint (1280px),
not 1440, since most laptops sit between. Check at 800, 1024, 1280 and 1440 wide.

## 3. Seed persona names

Replace the character names in `prisma/seed.ts` and `tests/factories.ts` with plain names,
one per role, for example Priya Nair (ops_analyst), Daniel Okafor (kyc_reviewer),
Sarah Chen and Marcus Webb (finance_admin), Tom Lindqvist (eng_admin). Keep emails simple.

## 4. Keep the docs consistent

- SPEC.md: change the Refunds and KYC route lines to describe the card-beside-table pattern
  and add the Activity section and the `/audit` page (linked, not in nav) to the Audit log
  section. Update the Definition of done page list to match.
- Playbook: add a step after the pages step: "Render `ActivityList` for the record at the
  bottom of the detail card." Note that `/audit` needs no per-tool work.
- README: add the two audit views to the "How it hangs together" table and the Tools table,
  remove the "audit log has no viewer" gap, and add one short paragraph under a heading
  "Iteration cost" stating how many commits the first pass took, how many the UI iteration
  took, and how many this follow-up took, with a one-line list of what changed and why. Be
  factual, not promotional.

## Verification

`npm run lint && npm run typecheck && npm run build && npm test`, then walk as ops_analyst
(default), then finance_admin: request a refund, attempt an approval as the requester (denied
appears in Activity), approve as the other finance admin, confirm the same events show on
`/audit`. Screenshots at 1024 and 1440 wide. Update the PR description with what changed.
