# PAJOY Smart Business System

A complete, production-ready enterprise business management system for a clothing, school uniform, and embroidery business in Nairobi, Kenya. Full-stack: React + Vite frontend, Express backend, PostgreSQL + Drizzle ORM.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, served at /api)
- `pnpm --filter @workspace/pajoy run dev` — run the frontend (port 25783, served at /)
- `pnpm --filter @workspace/scripts run seed` — seed the database with sample data
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — session secret

## Default Login Credentials

- **Admin:** admin@pajoy.co.ke / admin123
- **Cashier:** jane@pajoy.co.ke / cashier123

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, shadcn/ui, TanStack Query, Wouter routing
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks
- `lib/api-zod/src/generated/api.ts` — generated Zod validation schemas
- `lib/db/src/schema/` — Drizzle ORM table definitions (users, products, customers, sales, invoices, jobs, expenses)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/pajoy/src/pages/` — React page components
- `artifacts/pajoy/src/components/` — Shared UI components
- `scripts/src/seed.ts` — Database seed script

## Architecture Decisions

- Session auth via `session_uid` cookie (set on login, read on every request) — simple and stateless enough for the use case
- All API routes mounted under `/api` with Express router per resource
- Passwords hashed with SHA-256 + a fixed salt (suitable for internal staff system; upgrade to bcrypt for production)
- All monetary values stored as `numeric(12,2)` in Postgres and converted to `Number` in responses
- Orval generates both React Query hooks and Zod schemas from one OpenAPI spec — no duplication

## Product

- **Dashboard** — Today's revenue (KSh), sales count, pending jobs, low stock alerts, revenue charts, top products
- **POS Terminal** — Full-screen sales interface with product search, cart, M-Pesa/Cash/Card payment, receipt
- **Products** — Inventory management with stock adjustments and movement history
- **Customers** — Customer profiles, purchase history, loyalty points
- **Sales** — Sales history with void capability
- **Invoices** — B2B invoicing with partial payment tracking
- **Quotations** — Quote creation with one-click conversion to invoice
- **Embroidery Jobs** — Kanban board for school badge/uniform embroidery workflow
- **Printing Jobs** — Kanban board for screen/digital/DTF/cap/bag printing workflow
- **Expenses** — Business expense tracking with categories
- **Reports** — P&L, sales by day/month, top products, payment method breakdown, inventory valuation
- **Settings** — Business profile, user management, system config

## User Preferences

- Currency: KSh (Kenya Shillings), VAT 16%
- Date format: DD/MM/YYYY
- Business: Clothing, school uniforms, embroidery — Nairobi, Kenya

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after changing `openapi.yaml`
- Always run `pnpm --filter @workspace/db run push` after changing schema files in `lib/db/src/schema/`
- The `session_uid` cookie is HttpOnly — frontend checks auth via `/api/auth/me`
- Rerun `pnpm --filter @workspace/scripts run seed` only on a fresh DB (seed uses `onConflictDoNothing`)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
