---
name: run-nawahub
description: run, start, launch, screenshot, build, drive, test, open the NawaHub ERP/CRM app — backend API and React frontend dev servers
---

NawaHub is a NestJS backend + React/Vite frontend monorepo. The browser-interaction harness is `driver.mjs` in this skill directory, which uses **puppeteer's bundled Chromium** (no system Chrome needed — puppeteer is a backend dependency). The driver logs into the app and screenshots the result.

Both servers must be running before the driver is invoked. The backend connects to Postgres; the dev `.env` assumes local Postgres on port 5432 but the host runs its own Postgres 18 on that port — use a Docker container on **5433** as the throwaway dev DB.

Paths below are relative to the repo root (`D:/Personal/NawaHub`).

---

## Prerequisites

- Node.js 20+ and Docker Desktop running
- All dependencies already installed:
  ```
  npm install          # root
  cd backend && npm install
  cd ../frontend && npm install
  ```
- puppeteer installs its own Chromium via `postinstall` — no system Chrome needed.

---

## 1. Start Postgres (port 5433 — avoids the host Postgres 18 on 5432)

```bash
docker run -d --name nawahub-pg \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=nawahub \
  -e POSTGRES_DB=nawahub \
  -p 5433:5432 \
  postgres:16-alpine

# wait for ready
until docker exec nawahub-pg pg_isready -U postgres; do sleep 2; done
```

Then apply the schema and seed once:

```bash
cd backend
export DATABASE_URL="postgresql://postgres:nawahub@localhost:5433/nawahub?schema=public"
export DIRECT_URL="$DATABASE_URL"
npx prisma migrate deploy   # applies migrations/20260610214410_init
npm run seed                # creates demo data; admin: admin@nawahub.com / Nawa@123
cd ..
```

---

## 2. Start the backend

```bash
cd backend
export DATABASE_URL="postgresql://postgres:nawahub@localhost:5433/nawahub?schema=public"
export DIRECT_URL="$DATABASE_URL"
export NODE_ENV=development
export PORT=3000
export FRONTEND_URL="http://localhost:5173"
export APP_URL="http://localhost:5173"
npm run dev &   # or: nest start --watch
```

Startup takes ~15s. Ready when you see:
```
Nest application successfully started
```

Verify:
```bash
curl -s -X POST http://localhost:3000/api/auth/signin \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@nawahub.com","password":"Nawa@123"}' | head -c 100
# → {"token":"eyJ...
```

---

## 3. Start the frontend

```bash
cd frontend
npm run dev &
# → http://localhost:5173 (ready in ~2s)
```

---

## 4. Drive with the harness (agent path)

```bash
# Dashboard (default)
node .claude/skills/run-nawahub/driver.mjs

# Any route — omit the leading slash on Windows/Git Bash to prevent shell
# path-expansion (driver prepends "/" automatically):
node .claude/skills/run-nawahub/driver.mjs finance/invoices invoices
node .claude/skills/run-nawahub/driver.mjs crm/leads leads
node .claude/skills/run-nawahub/driver.mjs dashboard dashboard
```

Screenshots land in `.claude/skills/run-nawahub/screenshots/<name>.png`.

**Arguments:**
- `argv[2]` — route without leading slash (e.g. `finance/invoices`, `deals`, `reports`). Omit for dashboard.
- `argv[3]` — screenshot filename stem (default: derived from route).

**Env overrides:**
```bash
BASE=http://localhost:5173 EMAIL=manager@nawahub.com PASSWORD=Nawa@123 \
  node .claude/skills/run-nawahub/driver.mjs deals
```

Exit code is non-zero on any failure (login didn't complete, page error, navigation failed).

### Key routes

| Route arg (no leading slash) | What you see |
|---|---|
| `dashboard` | Revenue KPIs, recent deals |
| `crm/leads` | Leads list |
| `deals` | Deals pipeline list |
| `pipeline` | Kanban pipeline |
| `finance/invoices` | Invoices with status tabs |
| `finance/quotes` | Quotes |
| `procurement/purchase-orders` | POs |
| `procurement/bills` | Vendor bills |
| `sales-orders` | Sales orders |
| `projects` | Projects |
| `reports` | Reports & analytics |
| `settings` | Settings |

---

## 5. Human path

Open two terminals and run:
```
cd backend && npm run dev
cd frontend && npm run dev
```
Open `http://localhost:5173` — login with `admin@nawahub.com` / `Nawa@123`.

---

## Gotchas

- **Windows/Git Bash path expansion:** Bash expands arguments starting with `/` to Windows absolute paths (`/invoices` → `C:/Program Files/Git/invoices`). Always pass routes *without* the leading slash to the driver. The driver prepends `/` internally.

- **Host Postgres conflicts on port 5432:** The machine runs `postgresql-x64-18` (Windows service) on `localhost:5432`. Running Prisma against the native DB leaves a partially-applied migration record that blocks future `migrate deploy`. Use port 5433 for the Docker container and export `DATABASE_URL`/`DIRECT_URL` to override the `backend/.env` values before running Prisma CLI commands or `npm run dev`.

- **`prisma migrate reset` is blocked by Prisma's AI-agent guard:** Instead, recreate the Docker container (`docker rm -f nawahub-pg`) to start from a clean DB, then re-run `migrate deploy`.

- **`prisma.config.ts` picks up `APP_ENV`/`NODE_ENV`:** The CLI loads `.env.${profile}` first. If those files exist with different DB URLs, set `DATABASE_URL` explicitly in the shell to override.

- **Puppeteer Chromium is in `backend/node_modules`:** The driver resolves it with `createRequire` rooted at `backend/package.json`. This means `backend/node_modules` must be installed.

- **The seed script respects `backend/.env`:** It reads the DB URL from there (via `dotenvx`). If you want it to use the 5433 container, export `DATABASE_URL` before running `npm run seed`.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `migrate deploy` → `P3009 failed migration` | Recreate the container (`docker rm -f nawahub-pg && docker run ...`) and re-run deploy. The previous partial apply left a poisoned record in `_prisma_migrations`. |
| `driver.mjs` → `net::ERR_FILE_NOT_FOUND at c:/Program Files/Git/...` | You passed a route with a leading `/`. Remove it: `finance/invoices` not `/finance/invoices`. |
| Backend starts but `/api/auth/signin` → 401 | DB URL resolves to the wrong Postgres; seed ran against native PG, not the container. Re-seed against the right URL. |
| `Error: JWT_SECRET is required` on backend start | JWT_SECRET is read from `backend/.env`. Check it's non-empty. |
| Docker daemon not running | Launch Docker Desktop (Windows tray), wait ~10s, then retry `docker run`. |
