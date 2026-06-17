<div align="center">

```
███╗   ██╗ █████╗ ██╗    ██╗ █████╗ ██╗  ██╗██╗   ██╗██████╗
████╗  ██║██╔══██╗██║    ██║██╔══██╗██║  ██║██║   ██║██╔══██╗
██╔██╗ ██║███████║██║ █╗ ██║███████║███████║██║   ██║██████╔╝
██║╚██╗██║██╔══██║██║███╗██║██╔══██║██╔══██║██║   ██║██╔══██╗
██║ ╚████║██║  ██║╚███╔███╔╝██║  ██║██║  ██║╚██████╔╝██████╔╝
╚═╝  ╚═══╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝
```

**All-in-one ERP + CRM for growing businesses**

[![Node](https://img.shields.io/badge/Node-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Feature Modules](#feature-modules)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
  - [Docker (recommended)](#option-a--docker-recommended)
  - [Manual setup](#option-b--manual-setup)
- [Environment Variables](#environment-variables)
- [Default Seed Credentials](#default-seed-credentials)
- [Project Structure](#project-structure)
- [Settings & Configuration](#settings--configuration)
- [Documentation](#documentation)

---

## Overview

NawaHub is a production-grade business operations platform that combines **ERP and CRM** into a single, integrated workspace. It covers the complete business lifecycle — from the first lead to cash collected and inventory replenished.

**Designed for SMBs that need:**
- A single source of truth across sales, finance, procurement, and operations
- Granular role-based access with team-level visibility scoping
- Multi-currency support with configurable exchange rates
- Multi-step approval workflows on quotes, invoices, and expenses
- A full audit trail on every record change
- An AI assistant for per-record insights
- A public REST API for third-party integrations

---

## Feature Modules

### Dashboard

The home screen gives a real-time snapshot of the business:

| Widget | What it shows |
|--------|--------------|
| KPI cards | Total leads, open quotes, outstanding invoices, collected payments |
| Revenue chart | Monthly revenue trend (bar chart) |
| Deal stage chart | Deal distribution across pipeline stages (pie chart) |
| Pending approvals | Quotes / invoices / expenses awaiting your action |
| Outstanding invoices | Overdue and upcoming invoice amounts |
| Low stock alerts | Products below reorder threshold |
| Pipeline health | Weighted deal value by stage |

---

### CRM

Manage the full lead-to-customer lifecycle.

| Module | Route | Description |
|--------|-------|-------------|
| Leads | `/leads` | Capture and qualify leads with status tracking, rating, source, and conversion to customers |
| Customers | `/customers` | Full customer database — contacts, linked deals, activity history, custom fields |
| Deals | `/deals` | Track opportunities with value, stage, expected close date, and linked contacts |
| Pipeline | `/pipeline` | Kanban-style board view — drag deals across stages to update status instantly |

---

### Sales

The complete money-in cycle from quote to payment.

| Module | Route | Description |
|--------|-------|-------------|
| Quotes | `/finance/quotes` | Generate professional quotes with line items, discounts, and taxes — submit for approval |
| Invoices | `/finance/invoices` | Convert approved quotes to invoices or create standalone invoices; multi-currency; PDF export |
| Payments | `/finance/payments` | Record and track payments against invoices; see outstanding balances at a glance |
| Sales Orders | `/sales-orders` | Manage sales orders from creation through fulfillment |

---

### Procurement

Full money-out cycle from supplier to payment.

| Module | Route | Description |
|--------|-------|-------------|
| Suppliers | `/procurement/suppliers` | Manage vendor contacts, payment terms, and linked purchase orders |
| Purchase Orders | `/procurement/purchase-orders` | Create POs with line items and approval workflow; convert to vendor bills on receipt |
| Vendor Bills | `/procurement/bills` | Process incoming supplier invoices matched against purchase orders |
| Vendor Payments | `/procurement/vendor-payments` | Track payments made to suppliers; reconcile against bills |
| Expenses | `/expenses` | Employee expense reports with receipt attachments and multi-step approval |

---

### Work Management

| Module | Route | Description |
|--------|-------|-------------|
| Projects | `/projects` | Track projects with milestones, budget, team members, and linked deals |
| Tasks | `/tasks` | Kanban board (Todo → In Progress → Review → Done) with priority levels, assignees, and due dates |
| Activities | `/activities` | Log calls, meetings, emails, and notes against any CRM record |
| Calendar | `/calendar` | Visual calendar view of all scheduled activities |

---

### Catalog

| Module | Route | Description |
|--------|-------|-------------|
| Products | `/products` | Product catalog with pricing, description, and configurable custom fields (admin+) |
| Inventory | `/inventory` | Real-time stock levels per product; stock movements are append-only for a full audit ledger |

---

### Reports & Analytics

`/reports` — business intelligence dashboards:

- Revenue by period and customer
- Deal pipeline value and conversion rate
- Accounts Receivable (AR) and Accounts Payable (AP) aging
- Expense breakdown by category and department

---

### AI Assistant

An AI-powered insights panel available on individual records (customers, deals, leads). Configured in Settings → AI. Provides contextual summaries and suggested next actions.

---

### Public REST API

Key-authenticated REST API for third-party integrations. See [`backend/PUBLIC_API.md`](backend/PUBLIC_API.md) for full endpoint reference.

```
GET    /api/public/customers
GET    /api/public/customers/:id
POST   /api/public/customers
PUT    /api/public/customers/:id

GET    /api/public/leads
GET    /api/public/leads/:id
POST   /api/public/leads
PUT    /api/public/leads/:id

GET    /api/public/deals
GET    /api/public/deals/:id
POST   /api/public/deals
PUT    /api/public/deals/:id
```

Authenticate with `x-api-key: <key>` header. Keys are managed in Settings → API Keys.

---

## Tech Stack

### Backend

| Layer | Technology |
|-------|-----------|
| Framework | **NestJS 11** (TypeScript, Express) |
| ORM | **Prisma 6** |
| Database | **PostgreSQL 16** |
| Authentication | **Passport.js** + **JWT** (access token 15 min, refresh token 7 days) |
| Validation | **Zod** + class-validator |
| Scheduling | **@nestjs/schedule** — durable email outbox with retry |
| Security | Helmet, CORS, rate limiting (100 req/60 s), bcryptjs, soft-deletes |
| Email | Nodemailer + Pug templates |
| PDF Generation | Puppeteer + Chromium |
| Logging | Pino (pretty-printed in dev) |
| Error Tracking | Sentry (optional) |

### Frontend

| Layer | Technology |
|-------|-----------|
| Framework | **React 18** (TypeScript) |
| Build | **Vite 5** |
| Styling | **Tailwind CSS 4** |
| UI Components | **Radix UI** (accessible primitives) |
| Server State | **TanStack Query v5** |
| Routing | **React Router v7** |
| Forms | **React Hook Form** + **Zod** |
| Charts | **Recharts** |
| Drag & Drop | **dnd-kit** |
| Icons | **lucide-react** |
| HTTP | **Axios** with transparent JWT refresh (memory token + httpOnly cookie) |
| Fonts | Geist |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                            Browser                               │
└───────────────────────────────┬──────────────────────────────────┘
                                │ HTTP
                                ▼
                        ┌───────────────┐
                        │     Nginx     │  (serves frontend SPA)
                        │  reverse proxy│  (proxies /api/ → backend)
                        └───────┬───────┘
                ┌───────────────┴────────────────┐
                │                                │
                ▼                                ▼
       ┌─────────────────┐            ┌────────────────────┐
       │  React SPA      │            │   NestJS API       │
       │  (Vite build)   │            │   :3000            │
       └─────────────────┘            └────────┬───────────┘
                                               │
                        ┌──────────────────────┼─────────────────┐
                        │                      │                  │
                        ▼                      ▼                  ▼
               ┌──────────────┐      ┌──────────────┐   ┌───────────────┐
               │  PostgreSQL  │      │  Nodemailer  │   │  Chromium     │
               │  (Prisma 6)  │      │  SMTP relay  │   │  (PDF export) │
               └──────────────┘      └──────────────┘   └───────────────┘
```

### Key Patterns

| Pattern | Implementation |
|---------|---------------|
| **Auth** | Short-lived JWT (15 min) in memory + rotating refresh token (7 days) in httpOnly cookie. Roles and permissions re-validated from DB on every request. |
| **RBAC + Visibility** | `VisibilityService` applies `own / team / all` scoping at the database query level. Permissions are strings like `deals:view:own`. |
| **Approval Workflows** | Generic multi-step approval chain. Ordered steps with per-step approvers. Creator cannot approve their own submissions. |
| **Multi-currency** | All monetary values stored in document currency. `CurrencyService` converts to the workspace base currency (default EGP) for reporting. |
| **Soft Deletes** | All aggregate roots carry `deletedAt`. All queries automatically filter `deletedAt: null`. |
| **Audit Trail** | `TimelineService` logs every create / update / status change. `LoggingInterceptor` records every API request. |
| **Custom Fields** | Stored as JSON per entity. Filterable and searchable via query params. Configured per workspace in Settings. |
| **Deduplication** | `DedupService` normalizes phone/email to detect duplicates and merges records with child record reassignment. |

---

## Quick Start

### Prerequisites

- **Node.js 20+** and **npm 10+**
- **PostgreSQL 16+** — or use the Docker path below (no local Postgres needed)
- **Docker & Docker Compose** (optional but recommended)

---

### Option A — Docker (recommended)

The fastest path: one command brings up PostgreSQL, the API, and the frontend behind Nginx.

```bash
# Clone the repo
git clone <repo-url>
cd NawaHub

# Copy and configure environment
cp .env.example .env
# Edit .env — set DB_PASSWORD and JWT_SECRET at minimum

# Start all services
docker compose up -d

# Seed the database (first run only)
docker compose exec backend npm run seed

# Open the app
open http://localhost        # or the HTTP_PORT you configured
```

---

### Option B — Manual Setup

```bash
# 1. Install all dependencies
npm install
cd backend && npm install
cd ../frontend && npm install

# 2. Configure the backend
cd backend
cp .env.example .env
# Edit .env — fill in DATABASE_URL and JWT_SECRET (min 32 chars)

# 3. Run database migrations
npx prisma migrate dev

# 4. Seed roles, users, and sample data
npm run seed

# 5. Start both servers from the project root
cd ..
npm run dev
#   → backend  http://localhost:3000
#   → frontend http://localhost:5173
```

---

## Environment Variables

All variables are validated at startup by a Zod schema (`backend/src/config/env.validation.ts`). The server exits with a clear error message if required variables are missing or malformed.

| Variable | Required | Default | Description |
|----------|:--------:|---------|-------------|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string — `postgresql://USER:PASS@HOST:PORT/DB` |
| `JWT_SECRET` | ✅ | — | Token signing secret — **minimum 32 characters** |
| `NODE_ENV` | | `development` | `development` (allows HTTP) or `production` (requires HTTPS for cookies) |
| `FRONTEND_URL` | | `http://localhost:5173` | CORS allowed origin and cookie `SameSite` anchor |
| `APP_URL` | | `http://localhost:5173` | Public URL embedded in outgoing email links |
| `PORT` | | `3000` | NestJS listen port |
| `SMTP_HOST` | | — | SMTP server hostname — omit to disable email sending |
| `SMTP_PORT` | | `587` | SMTP port |
| `SMTP_USER` | | — | SMTP username |
| `SMTP_PASS` | | — | SMTP password |
| `SMTP_FROM` | | — | Sender display string, e.g. `NawaHub <noreply@example.com>` |
| `SENTRY_DSN` | | — | Sentry DSN for error tracking — omit to disable |
| `CRON_SECRET` | | — | Bearer token for internal cron endpoint `/api/internal/cron/run` |
| `UPLOAD_DIR` | | `./uploads` | Directory where file attachments are stored |
| `HTTP_PORT` | | `80` | Nginx frontend port (Docker only) |
| `DB_PASSWORD` | | `changeme` | PostgreSQL password (Docker Compose only — used to build `DATABASE_URL`) |

> For Docker deployments, set all variables in `.env` at the project root. For manual setups, set them in `backend/.env`.

---

## Default Seed Credentials

After running `npm run seed`, five demo users are created. **Change all passwords before any production deployment.**

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `superadmin@nawahub.com` | `Nawa@123` |
| Admin | `admin@nawahub.com` | `Nawa@123` |
| Manager | `manager@nawahub.com` | `Nawa@123` |
| Sales Rep | `sales@nawahub.com` | `Nawa@123` |
| Viewer | `viewer@nawahub.com` | `Nawa@123` |

Each role has different permission scopes — log in as Sales Rep to see the restricted view, or Super Admin for full access.

---

## Project Structure

```
NawaHub/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Full database schema (38+ models)
│   │   └── migrations/          # Ordered migration history
│   ├── src/
│   │   ├── auth/                # JWT strategy, guards, refresh token rotation
│   │   ├── common/              # WorkspaceConfig, Currency, Approval, CustomFields services
│   │   ├── config/              # Zod-based env validation
│   │   ├── customers/           # Customer CRUD + visibility scoping
│   │   ├── leads/               # Lead lifecycle, rating, conversion
│   │   ├── deals/               # Deal management, pipeline stages
│   │   ├── finance/             # Quotes + Invoices modules
│   │   ├── accounts/            # Chart of accounts (GL)
│   │   ├── sales-orders/        # Sales order workflow
│   │   ├── procurement/         # Suppliers, POs, vendor bills, vendor payments
│   │   ├── expenses/            # Expense reports + approval
│   │   ├── products/            # Product catalog
│   │   ├── inventory/           # Stock items + append-only movement ledger
│   │   ├── projects/            # Projects, milestones, team members
│   │   ├── tasks/               # Tasks with Kanban status + priority
│   │   ├── activities/          # Calls, meetings, notes, emails per record
│   │   ├── notes/               # Standalone notes per entity
│   │   ├── attachments/         # File upload (Multer)
│   │   ├── reports/             # Business intelligence endpoints
│   │   ├── summary/             # Dashboard summary aggregates
│   │   ├── search/              # Full-text search across CRM entities
│   │   ├── import/              # CSV import with column mapping (CRM, catalog, projects, tasks, COA)
│   │   ├── export/              # Streamed full-dataset CSV export per module
│   │   ├── bulk/                # Bulk delete / assign-owner / set-status across modules
│   │   ├── dedup/               # Duplicate detection and merge
│   │   ├── saved-views/         # User-defined saved filter sets
│   │   ├── emails/              # SMTP send + open/click tracking
│   │   ├── notifications/       # In-app notification dispatch
│   │   ├── scheduler/           # Cron jobs (overdue invoices, reminders)
│   │   ├── number-sequence/     # Auto-incrementing doc numbers (INV-0001, etc.)
│   │   ├── timeline/            # Per-record event log (global module)
│   │   ├── logs/                # Audit log viewer
│   │   ├── users/               # User profiles + reporting hierarchy
│   │   ├── roles/               # Role definitions + permission strings
│   │   ├── settings/            # Workspace configuration
│   │   ├── api-keys/            # API key management
│   │   ├── public-api/          # Key-authenticated public REST endpoints
│   │   └── ai/                  # AI assistant integration
│   ├── utils/
│   │   ├── seed.ts              # Master seed (roles → users → sample data)
│   │   └── ...                  # Additional migration utilities
│   ├── Dockerfile               # Multi-stage build (builder → production)
│   └── PUBLIC_API.md            # Public REST API reference
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/          # Sidebar, NavBar, NavLinks, NotificationBell
│   │   │   ├── common/          # GenericTable, ApprovalTimeline, AiInsights,
│   │   │   │                    #   AttachmentsPanel, EmailsPanel, NotesPanel,
│   │   │   │                    #   ImportDialog, DedupDialog, SearchPalette …
│   │   │   ├── ui/              # Radix UI-based design system (Button, Dialog, …)
│   │   │   ├── Customers/       # Customer list, add, edit, view
│   │   │   ├── Leads/           # Lead management
│   │   │   ├── Deals/           # Deal management
│   │   │   ├── Pipeline/        # Kanban pipeline board
│   │   │   ├── Finance/         # Quotes + Invoices
│   │   │   ├── SalesOrders/     # Sales order management
│   │   │   ├── Procurement/     # Suppliers, POs, bills, vendor payments
│   │   │   ├── Expenses/        # Expense reports
│   │   │   ├── Products/        # Product catalog
│   │   │   ├── Inventory/       # Stock management
│   │   │   ├── Projects/        # Project tracking
│   │   │   ├── Tasks/           # Kanban task board
│   │   │   ├── Activities/      # Activity timeline
│   │   │   ├── Reports/         # Analytics dashboards
│   │   │   ├── Users/           # User management
│   │   │   └── Roles/           # Role + permission management
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx    # Home page
│   │   │   ├── Login.tsx        # Auth page
│   │   │   ├── Settings.tsx     # Settings hub + sub-route layout
│   │   │   └── settings/        # 20 settings sub-pages (see below)
│   │   ├── contexts/            # AuthContext, i18nContext, ThemeContext, ModulesContext
│   │   ├── hooks/               # Custom React hooks (useAuth, usePermission, …)
│   │   ├── i18n/                # Translations (en, ar + aliases: fr, es, de, tr, zh)
│   │   ├── utils/               # Axios client (with silent refresh), helpers
│   │   ├── types/               # TypeScript type definitions
│   │   └── validations/         # Zod schemas for all forms
│   └── config/
│       └── permissions.ts       # Permission string registry
│
├── docs/
│   ├── README.md                # Architecture & conventions deep-dive
│   └── API.md                   # Internal API endpoint documentation
│
├── docker-compose.yml           # PostgreSQL + backend + frontend (Nginx)
├── .env.example                 # Environment variable template
└── package.json                 # Root scripts — `npm run dev` starts everything
```

---

## Settings & Configuration

The Settings panel (`/settings`) is organized into five groups:

<details>
<summary><strong>Personal</strong></summary>

| Page | Description |
|------|-------------|
| Profile | Name, email, phone, avatar |
| Security | Change password, active sessions |
| Appearance | Light / dark theme, UI density |
| Notifications | Per-event notification preferences |

</details>

<details>
<summary><strong>Workspace</strong></summary>

| Page | Description |
|------|-------------|
| Organization | Workspace name, logo, base currency, timezone |
| Exchange Rates | Live or manual currency rates |
| Modules | Enable / disable feature modules per workspace |

</details>

<details>
<summary><strong>Data & Finance</strong></summary>

| Page | Description |
|------|-------------|
| Custom Fields | Add / remove fields per entity (customers, deals, products, …) |
| Pipeline Stages | Configure deal pipeline stages |
| Categories | Manage categories for expenses, products, activities |
| Number Sequences | Auto-number format for quotes, invoices, POs (e.g. `INV-{YYYY}-{SEQ}`) |
| Accounts (GL) | Chart of accounts configuration |
| Tax Rates | VAT and other tax rates used on quotes and invoices |
| Invoice Defaults | Default payment terms, notes, and footer for new invoices |
| Approvals | Configure approval chains per document type |

</details>

<details>
<summary><strong>Team & Access</strong> (admin+)</summary>

| Page | Description |
|------|-------------|
| Users | Invite users, set roles, manage reporting hierarchy |
| Roles | Create roles with fine-grained permission strings |
| Audit Logs | Full request and change log |
| Password Policy | Min length, complexity, expiry rules |

</details>

<details>
<summary><strong>Advanced</strong> (admin+)</summary>

| Page | Description |
|------|-------------|
| Email Config | SMTP configuration for outgoing notifications |
| API Keys | Create and revoke keys for the public REST API |
| AI | Configure AI provider and enable per-record insights |
| Data Export | Export workspace data as CSV |
| Danger Zone | Delete workspace, reset data |

</details>

---

## Documentation

| Document | Description |
|----------|-------------|
| [`docs/README.md`](docs/README.md) | Deep-dive: architecture patterns, RBAC model, development conventions, database design decisions |
| [`backend/PUBLIC_API.md`](backend/PUBLIC_API.md) | Public REST API — authentication, endpoints, query params, examples |
| [`docs/API.md`](docs/API.md) | Internal API endpoint reference |

---

<div align="center">

Built with NestJS · React · Prisma · PostgreSQL

</div>
