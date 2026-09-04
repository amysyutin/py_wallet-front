# py_wallet Frontend

A web frontend for **py_wallet** — a crypto portfolio monitoring dashboard built for tracking wallets, snapshots, asset allocation, and portfolio history.

The component version is stored in both `VERSION` and `package.json`. A
`vX.Y.Z` tag must match both files; the release workflow promotes the tested
SHA image to that immutable release name and creates a GitHub Release.

`py_wallet` is a read-only portfolio tool. It does **not** store private keys, sign transactions, or act as a custodial wallet. The goal is to give users a clean dashboard for understanding their crypto portfolio across EVM wallets, manual balances, and future integrations.

## Project Context

This repository is one part of the larger `py_wallet` project:

| Repository | Purpose |
| --- | --- |
| `py_wallet` | FastAPI backend, PostgreSQL, JWT auth, wallet management, snapshots, portfolio aggregation |
| `py_wallet-infra` | Kubernetes/GitOps infrastructure with k3s, Argo CD, cert-manager, Ingress, and deployment flow |
| `py_wallet-front` | Web UI for portfolio management and visualization |

## What This App Does

The frontend provides a personal portfolio dashboard where users can:

- create an account and log in with JWT auth
- add EVM and manual wallets
- organize wallets into groups
- archive inactive wallets without deleting their history
- enter manual balances for assets that are not fetched automatically
- trigger portfolio snapshots
- view total portfolio value in USD
- inspect top assets by share
- analyze historical portfolio value
- use public demo endpoints for safe preview data

## Current Status

This is an early MVP frontend. The current implementation includes:

- React + TypeScript + Vite app scaffold
- protected routing with login/register pages
- JWT token storage in `localStorage`
- dashboard layout with sidebar and topbar
- wallet groups screen
- wallets screen
- wallet detail screen
- manual balances editor
- snapshot action for EVM wallets
- portfolio summary widgets
- portfolio history chart
- live address exploration page
- demo Binance preview block
- admin-only Binance route placeholder
- Vite proxy configured for the deployed backend at `https://pywallet.dev`

## Main Features

### Authentication

Users can register, log in, and access protected portfolio data through JWT-based authentication.

Implemented routes:

- `/login`
- `/register`
- `/auth/me` profile loading through the backend
- protected application layout after login

### Portfolio Dashboard

The dashboard is designed to show the current state of the user's portfolio:

- total portfolio value in USD
- number of wallets included in the summary
- top assets by portfolio share
- asset allocation chart
- persisted global allocation targets and deviation-based rebalancing hints
- portfolio value history chart
- empty states when no snapshots exist yet
- a shared web/Telegram data-health drawer with freshness, coverage, price
  quality, affected networks, and portfolio refresh progress
- one-click portfolio refresh that preserves the last saved total while polling
  the owner-scoped job to success, partial success, or failure
- an owner-safe affected-network retry action that polls the child job and
  refreshes portfolio data without exposing provider errors or identifiers

Portfolio summary combines the latest persisted EVM snapshots and manual
balances. The UI does not treat live diagnostics or partial refresh failures as
a replacement for the last readable persisted total.

The global allocation view lets the user distribute exactly 100% across stable
asset keys. Saved targets are account-scoped in the backend. The dashboard shows
the current and target shares plus a USD amount to increase or reduce, with a
one-percentage-point tolerance. These are informational calculations only:
PyWallet never creates orders, signs transactions, or moves assets. Target
editing is intentionally unavailable for group-filtered views because the saved
distribution applies to the global portfolio.

Wallet detail follows the same rule: its saved value is paired with scoped
freshness, source, price quality, active-refresh state, and affected networks.
The EVM live lookup is opt-in and explicitly diagnostic; opening a wallet page
does not call RPC providers or replace the saved value/history.

### Wallet Management

Users can create and manage wallets.

Supported wallet types:

- EVM wallets
- manual wallets

Wallet fields include:

- label
- wallet type
- chain type
- address
- group
- notes
- active/archive state

EVM wallets can be used for on-chain snapshots. Manual wallets are useful for balances that are not fetched from an EVM address, such as BTC, exchange balances, cash-like balances, or custom assets.

### Wallet Groups

Wallet groups help keep portfolios readable when users manage many wallets across different purposes.

Example groups:

- Long-term holdings
- Trading
- DeFi
- Exchanges
- Manual balances
- Test wallets

### Manual Balances

Manual wallets allow users to enter balances manually:

- symbol
- chain
- amount
- optional USD price override

When the price is blank, the next snapshot resolves supported crypto tickers
through CoinGecko and three-letter ISO fiat tickers through Frankfurter. A
filled USD price remains a manual override.

### Snapshots

Snapshots store portfolio state at a point in time.

The frontend supports:

- snapshot action for a single EVM wallet
- cache invalidation for portfolio data after snapshots
- loading and error states for slow snapshot requests

### Portfolio History

Historical data is shown with a chart based on saved snapshots.

Planned improvements:

- selectable time ranges
- wallet-level filtering
- richer asset breakdown by snapshot
- clearer latest snapshot metadata

### Explore and Demo Data

The frontend includes public-friendly views for safe previews:

- live EVM balance lookup through `/assets?address=...`
- demo Binance data through `/demo/binance/balance`

Real exchange endpoints are admin-only and should not expose private portfolio data in public demos.

## Backend API Integration

The frontend talks to the FastAPI backend through Vite dev proxy.

Configured backend target:

```ts
https://pywallet.dev
```

Main API areas:

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `GET /wallet-groups`
- `POST /wallet-groups`
- `GET /wallets`
- `POST /wallets`
- `GET /wallets/{id}`
- `GET /wallets/{id}/summary`
- `PATCH /wallets/{id}`
- `DELETE /wallets/{id}`
- `GET /wallets/{id}/balances`
- `PUT /wallets/{id}/balances`
- `DELETE /wallets/{id}/balances/{asset_id}`
- `POST /snapshot`
- `GET /portfolio`
- `GET /portfolio/summary`
- `GET /assets?address=...`
- `GET /demo/binance/balance`
- `GET /binance/balance` admin-only

## Tech Stack

- React
- TypeScript
- Vite
- React Router
- TanStack Query
- Zustand
- Recharts
- BigNumber.js
- Lucide React
- ESLint

Page modules are loaded on demand at React Router boundaries. Production builds
also enforce a 500 kB uncompressed budget for the initial JavaScript entry chunk
so a new eager page import cannot silently collapse the route chunks back into a
single bundle.

## Local Development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

The app runs at:

```text
http://127.0.0.1:5173
```

The dev server proxies API requests to:

```text
https://pywallet.dev
```

## Available Scripts

```bash
npm run dev
```

Start the local Vite development server.

```bash
npm run build
```

Run TypeScript build checks and create a production build.

```bash
npm run lint
```

Run ESLint checks.

```bash
npm run test
```

Run the Vitest API, route-guard, and account-form regression suite once. Use
`npm run test:watch` while developing.

```bash
npm run preview
```

Preview the production build locally.

## Project Structure

```text
src/
  api/             API client and endpoint modules
  app/             router setup
  components/      shared layout and UI components
  lib/             formatting helpers
  pages/           application pages
  routes/          protected/admin route guards
  store/           auth store
  styles.css       global styles
```

## Planned Work

Short-term:

- improve wallet create/edit UX
- add group editing
- add wallet editing and restore from archive
- improve dashboard responsive layout
- add toast notifications for mutations
- generate TypeScript types from `/openapi.json`
- add better empty/error states across all screens

Later:

- Telegram WebApp version
- mobile-first dashboard polish
- richer asset allocation charts
- alerting for portfolio changes
- production Docker image
- CI checks for lint/build
- SLO or health-status page for the deployed service

## Product Goal

The goal of `py_wallet` is to be both a useful crypto portfolio dashboard and a complete production-style engineering project:

- real backend service
- database persistence
- JWT authentication
- frontend application
- CI/CD-ready structure
- containerized deployment path
- Kubernetes/GitOps infrastructure
- monitoring and production-like operations

This makes the project useful as an application and as a practical DevOps/SRE portfolio project.

## Security Notes

- The app does not request or store private keys.
- The frontend stores only the JWT access token in browser `localStorage`.
- Public demo views should use demo endpoints only.
- Admin/exchange endpoints should remain protected by backend authorization.
