# Approval request formal-method samples

These samples back the blog article
<https://kazuph.github.io/blog/2026/11/04/formal-methods-executable-specs/>.
They all model the same small contract: a pending request can be approved or
cancelled, and a cancelled request must never grant access.

`broken/` holds the same samples with one line changed so that a cancelled
request grants access. Each tool is expected to reject the broken version;
the article shows which ones do, and with which exit code.

`broken/ApprovalOriginalTheorem.lean` is the broken step function with only
the original, narrower theorem (`cancelledNeverGrants`). Lean accepts it,
which is the point: that theorem does not cover the transition that broke.
`Approval.lean` adds the stronger theorem, and `broken/Approval.lean` fails it.

dspec is not in this folder. The article breaks an implementation reference in
dspec's own model instead, because dspec checks spec-to-code links rather than
the approval behaviour.

`approval.cedar-tests.json` is the expected-decision test file for
`cedar run-tests`.
