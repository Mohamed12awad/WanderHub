# NawaHub Public API (v1)

Stable, key-authenticated REST API for core CRM entities. All routes are under
the global `/api` prefix.

## Authentication

Send your API key in the `x-api-key` header. Create/revoke keys in
**Settings → API Keys** (requires `settings:manage`).

```
x-api-key: nh_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

A key acts as its owning user and inherits that user's role permissions and
record visibility scope. The raw secret is shown **once** at creation (only its
SHA-256 hash is stored). Revoked or inactive-user keys are rejected.

## Endpoints

Base URL: `/api/public/v1`

| Method | Path | Permission |
|--------|------|------------|
| GET    | `/customers`      | `contacts:view`   |
| GET    | `/customers/:id`  | `contacts:view`   |
| POST   | `/customers`      | `contacts:create` |
| PUT    | `/customers/:id`  | `contacts:edit`   |
| GET    | `/leads`          | `leads:view`      |
| GET    | `/leads/:id`      | `leads:view`      |
| POST   | `/leads`          | `leads:create`    |
| PUT    | `/leads/:id`      | `leads:edit`      |
| GET    | `/deals`          | `deals:view`      |
| GET    | `/deals/:id`      | `deals:view`      |
| POST   | `/deals`          | `deals:create`    |
| PUT    | `/deals/:id`      | `deals:edit`      |

List endpoints accept the same query params as the app (`page`, `limit`, `q`,
status/owner filters, `cf_<id>` custom-field filters). Request bodies use the
same shape and validation as the app's create/update endpoints.

### Example

```bash
curl -s https://YOUR_HOST/api/public/v1/customers?limit=10 \
  -H "x-api-key: $NAWAHUB_API_KEY"

curl -s -X POST https://YOUR_HOST/api/public/v1/customers \
  -H "x-api-key: $NAWAHUB_API_KEY" \
  -H "content-type: application/json" \
  -d '{"name":"Acme Co","phone":"+201000000000","email":"hi@acme.test"}'
```

## Notes / not yet implemented

- **No interactive Swagger UI** yet — `@nestjs/swagger` is not a project
  dependency. Add it (`@nestjs/swagger`, `swagger-ui-express`) and a
  `SwaggerModule.setup()` in `main.ts` if you want hosted docs.
- DELETE is intentionally not exposed on the public API (phase 1).
- No per-key rate limiting beyond the app-wide throttler.
