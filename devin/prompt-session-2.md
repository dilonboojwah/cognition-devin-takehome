# Devin Cloud session 2: add KYC and Feature Flags by following the Playbook

Read `devin/playbook-add-internal-tool.md` and SPEC.md. Add the two remaining tools described in
SPEC.md under "KYC review queue" and "Feature flags" by following the Playbook exactly, once per
tool. Use only the shared primitives in `components/kit/` and `lib/`. Domain code writes to the
database only through runMutation.

Note: detail views are cards beside the list (the pattern Refunds now uses), not separate pages,
even where SPEC.md shows `/<tool>/[id]` routes. The Playbook describes the current pattern.

Do not modify the shared primitives or the Playbook unless a tool cannot be finished without it.
If you must, make the minimum change and list every deviation in the PR description under a
heading "Playbook gaps". That list is important; do not smooth it over.

Add tests 9 to 13 from SPEC.md and extend test 14 to cover the new tools. Run the full suite.
Start the dev server and verify `/kyc`, a KYC detail (including the escalation path from
kyc_reviewer to finance_admin with a required note), and `/flags` in every role. Screenshots on
the PR.

Update README.md: add both tools to the mapping table and a section "Adding tools two and three"
stating what the Playbook covered, what it missed, and roughly how long each tool took.

Open a PR against main titled "Add KYC and Feature Flags via Playbook".
