# Prisma migrations

This project now uses **Prisma Migrate** (it was previously synced with `db push`).
`0_init` is a squashed baseline of the full current schema (GL + inventory accounting included).

## Workflow

- **New schema change (dev):** edit `schema.prisma`, then
  `npm --prefix backend run db:migrate` (→ `prisma migrate dev`) — creates a new
  timestamped migration and applies it to your dev DB.
- **Deploy (prod/staging):** `npm run db:deploy:prod` (→ `prisma migrate deploy`)
  applies pending migrations. Never run `migrate dev` against production.
- **Connection URLs** come from `prisma.config.ts` (`DIRECT_URL ?? DATABASE_URL`).
  Use the **direct** (non-pooled) URL for migrate commands.

## Baselining an existing database (already has the tables)

If a database already matches the schema (e.g. created via `db push`), don't run the
migration — mark it applied so Migrate records history without re-creating tables:

```
npx prisma migrate resolve --applied 0_init
```

A fresh database instead gets everything via `npx prisma migrate deploy`
(verified: `0_init` applies cleanly to an empty DB).
