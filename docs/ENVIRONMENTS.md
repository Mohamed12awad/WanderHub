# Environment Profiles

This project supports three environment profiles: `development`, `production`, and `test`.

Profile files are ignored by git:

- `backend/.env.development`
- `backend/.env.production`
- `frontend/.env.development`
- `frontend/.env.production`

Create them from the tracked examples:

```powershell
npm run env:init
```

Run development:

```powershell
npm run dev
```

Build production:

```powershell
npm run build:prod
```

Apply production Prisma migrations:

```powershell
npm run db:deploy:prod
```

For Supabase, keep the pooled connection in `DATABASE_URL` and the direct/session connection in `DIRECT_URL`. If the database password contains special URL characters such as `+` or `?`, percent-encode them in both URLs.
