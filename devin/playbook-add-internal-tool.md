# Playbook: Add a new internal tool

Inputs you need before starting: tool slug, title, the Prisma model, the permission rows, and
the list of mutations with their state rules. These steps are the ones actually followed to
build Refunds; read `lib/refunds.ts` and `app/refunds/` as the worked example of every step.

1. **Model.** Add the model to `prisma/schema.prisma` if it is not already there, then
   `npx prisma migrate dev --name add_<slug>`. JSON-ish columns are `String`; there are no
   enums on SQLite, so statuses are `String` and their allowed values live in step 4.
   Add rows to `prisma/seed.ts` covering every status, and re-run `npm run db:setup`.
2. **Permissions.** Add one row per user-visible action to `PERMISSIONS` in `lib/authorize.ts`
   and add the action names to the `Action` union. The home page matrix and every server check
   read this one list, so there is nothing else to update.
3. **Constants.** Any threshold or band goes in `lib/config.ts` with a name. Never inline it.
4. **Domain module.** Create `lib/<slug>.ts`. Export the status list, a `<Tool>RuleError`, read
   helpers (`list*`, `get*`), and one function per mutation. Every mutation is exactly one
   `runMutation({ actor, action, resourceType, resourceId, run })` call whose `run(tx)`:
   re-reads the record through `tx`, throws `<Tool>RuleError` if a state rule is violated,
   writes the change through `tx`, and returns `{ oldValue, newValue }` snapshots.
   This is the only write path; never import `prisma` for a write. Re-reading inside the
   transaction is what makes concurrent decisions safe.
5. **Server actions.** Create `app/<slug>/actions.ts` with `"use server"`. Each action resolves
   the actor with `requireCurrentUser()`, calls one `lib/<slug>.ts` function, converts
   `AuthorizationError` / `<Tool>RuleError` into a returned message string, and calls
   `revalidatePath` for the tool page. No rules live here.
6. **Pages.** `app/<slug>/page.tsx` uses `AppShell` + `DataTable` (build rows with `searchText`,
   `status`, and `cells`). The detail view is a card beside the table, not a page: each row's
   `href` is `/<slug>?<slug>=<id>`, the page reads that search param and renders
   `app/<slug>/detail.tsx` (`DetailPanel` with `compact`, `StatusBadge`, `RoleBadge`) in a
   right-hand `aside`, exactly as `app/refunds/page.tsx` does. Page-level actions (like
   Request refund) go in the `AppShell` `actions` slot. Confirm-worthy mutations are
   `ActionDialog`s; `ActionButton` runs an action on one click with no confirmation. Bind
   server actions with `.bind(null, id)` when they need the record id. Add
   `export const dynamic = "force-dynamic"`. Use `can(user.role, action)` only to hide
   controls; the server decides.
7. **Activity.** Render `ActivityList` for the record at the bottom of the detail card —
   `resourceType` and `resourceId` in, that record's events out, denied attempts included.
   The `/audit` page needs no per-tool work; it picks up new resource types as soon as
   events exist.
8. **Register.** Add `{ slug, title, description, icon }` to `TOOLS` in `lib/tools.ts`. That is
   the nav entry and the home page card.
9. **Tests.** Add `tests/<slug>.test.ts`: one allowed role, one denied role asserting the
   `denied` audit event, one test per state rule, and extend `tests/audit.test.ts` so the new
   mutations are counted. Use `tests/factories.ts`. Run `npm test` until green.
10. **Verify.** `npm run lint && npm run typecheck && npm run build`, then `npm run dev` and walk
   the tool in every role with the "Role selector" menu, including a denial. Screenshot.
11. **Document.** Add the tool to the README mapping table, then open the PR.
