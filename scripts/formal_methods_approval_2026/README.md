# Approval request formal-method samples

These samples back the blog article
<https://kazuph.github.io/blog/2026/11/04/formal-methods-executable-specs/>.
They all model the same small contract: a pending request can be approved or
cancelled, and a cancelled request must never grant access.

`broken/` holds the same samples with one line changed so that a cancelled
request grants access. Each tool is expected to reject the broken version;
the article shows which ones do, and with which exit code.

`approval.cedar-tests.json` is the expected-decision test file for
`cedar run-tests`.
