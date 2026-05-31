# Mini ERP

A full-stack ERP system built with **NestJS + Prisma + PostgreSQL** (backend) and **React + Vite + Radix UI + Tailwind** (frontend).

## Modules

| Domain | Features |
|--------|---------|
| CRM | Leads → Customers → Deals pipeline |
| Finance | Quotes → Invoices → Payments, approval workflows |
| Procurement | Suppliers, Purchase Orders → Vendor Bills → Payments |
| Projects | Milestones, members, budget, linked deals |
| Expenses | Expense reports with approval |
| Tasks | Kanban board with priorities |
| Reports | Revenue, pipeline, AR/AP, expense breakdowns |

## Quick start

```bash
# 1. Install dependencies
npm install          # root (concurrently)
cd backend && npm install
cd ../frontend && npm install

# 2. Set up environment
cp backend/.env.example backend/.env   # fill in DATABASE_URL, JWT_SECRET
cp frontend/.env.example frontend/.env

# 3. Database
cd backend
npm run db:migrate   # run Prisma migrations
npm run seed         # seed roles, users, sample data

# 4. Run in dev
cd ..
npm run dev          # starts backend (port 3000) + frontend (port 5173) concurrently
```

## Default seed credentials

After running `npm run seed`, all demo users share the password printed to the console. **Change passwords before any production use.**

## Environment variables

See `backend/.env.example` and `frontend/.env.example` for all required variables. The server will fail fast at startup if `DATABASE_URL` or `JWT_SECRET` are missing.

## Tech stack

| Layer | Stack |
|-------|-------|
| Backend | NestJS 10, Prisma 6, PostgreSQL, JWT/Passport, Zod |
| Frontend | React 18, Vite, react-query v3, Radix UI, Tailwind |
| Auth | Short-lived JWT (15 min) + rotating refresh tokens (7 days) |
| Security | Helmet, CORS, rate limiting, bcrypt, soft-deletes |

## Project structure

```
├── backend/          NestJS API (src/modules per domain)
│   ├── prisma/       Schema + migrations
│   └── utils/        Seed scripts
└── frontend/         React SPA (src/components per domain)
```

## Review documents

- `ERP_REVIEW.md` — Principal-level security and architecture audit (prior pass)
- `LEAD_TO_CASH_REVIEW.md` — Lead-to-cash transition analysis and fix roadmap
