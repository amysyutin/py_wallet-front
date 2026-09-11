# Changelog

All notable changes to the **py_wallet-front** application are documented here.

## [Unreleased]

### Changed

- Add an optional 24-hour portfolio alert threshold to Telegram digest settings.
- Explain ticker-based live pricing for manual crypto and fiat balances, while
  keeping an entered USD price as an explicit override.
- Load page components on demand at route boundaries, with a visible initial
  loading state and a build-time entry-chunk budget.
- Retry transient GitHub API failures while opening automated GitOps deploy PRs.
