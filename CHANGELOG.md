# Changelog

All notable changes to the **py_wallet-front** application are documented here.

## [Unreleased]

### Added

- Add a global allocation-target editor and read-only rebalancing hints with an
  explicit warning when portfolio valuation data is incomplete.

### Changed

- Explain ticker-based live pricing for manual crypto and fiat balances, while
  keeping an entered USD price as an explicit override.
- Load page components on demand at route boundaries, with a visible initial
  loading state and a build-time entry-chunk budget.
- Retry transient GitHub API failures while opening automated GitOps deploy PRs.
