# NawaHub — API Reference

All routes are under the global prefix **`/api`**. Unless noted, endpoints
require a valid access token (`Authorization: Bearer <token>`) and the listed
permission. Responses are JSON; list endpoints return either an array or a
`{ data, total, page, pages }` page envelope.

> The **public** API (`/api/public/v1`, key-authenticated) is documented at the
> end and in [../backend/PUBLIC_API.md](../backend/PUBLIC_API.md).

---

## Auth — `/api/auth`
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/auth/signin` | public | `{ email, password }` → access token + refresh cookie |
| POST | `/auth/refresh` | refresh cookie | rotates refresh token, returns new access token |
| POST | `/auth/logout` | refresh cookie | revokes the refresh token |

## Users — `/api/users`
| Method | Path | Permission |
|--------|------|-----------|
| GET | `/users` | users:view |
| GET | `/users/:id` | users:view |
| POST | `/users` | users:create |
| PUT | `/users/:id` | users:edit |
| PUT | `/users/active/:id` | users:edit |
| DELETE | `/users/:id` | users:delete |
| GET | `/users/me/sessions` · DELETE `/users/me/sessions/:id` | self |
| GET | `/users/me/login-history` | self |
| POST | `/users/me/change-password` | self |
| GET/PUT | `/users/me/notification-preferences` | self |

## Roles — `/api/roles`
| Method | Path | Permission |
|--------|------|-----------|
| GET | `/roles` | roles:view |
| POST | `/roles` · PUT `/roles/:id` · DELETE `/roles/:id` | roles:manage |

## CRM

### Customers — `/api/customers`
| Method | Path | Permission |
|--------|------|-----------|
| GET | `/customers` (paginated, `q`, filters, `cf_*`) | contacts:view |
| GET | `/customers/:id` | contacts:view |
| POST | `/customers` | contacts:create |
| PUT | `/customers/:id` | contacts:edit |
| DELETE | `/customers/:id` | contacts:delete |

### Leads — `/api/leads`
| Method | Path | Permission |
|--------|------|-----------|
| GET | `/leads` · GET `/leads/:id` | leads:view |
| POST | `/leads` | leads:create |
| PUT | `/leads/:id` | leads:edit |
| DELETE | `/leads/:id` | leads:delete |
| POST | `/leads/:id/convert` | leads:edit (lead → customer + seed deal) |

### Deals — `/api/deals`
| Method | Path | Permission |
|--------|------|-----------|
| GET | `/deals` · GET `/deals/:id` | deals:view |
| POST | `/deals` | deals:create |
| PUT | `/deals/:id` | deals:edit |
| DELETE | `/deals/:id` | deals:delete |
| POST | `/deals/:id/create-quote` | deals:edit / finance:create |

## Finance

### Quotes — `/api/finance/quotes`
| Method | Path | Permission |
|--------|------|-----------|
| GET | `/finance/quotes` · GET `/finance/quotes/:id` | finance:view |
| POST | `/finance/quotes` · PUT `/finance/quotes/:id` · DELETE `…/:id` | finance:create / edit |
| PATCH | `/finance/quotes/:id/approve` · `/reject` | finance:approve |
| POST | `/finance/quotes/:id/convert` | finance:create (→ invoice) |

### Invoices & payments — `/api/finance`
| Method | Path | Permission |
|--------|------|-----------|
| GET | `/finance/invoices` · GET `/finance/invoices/:id` | finance:view |
| POST | `/finance/invoices` · PUT `…/:id` · DELETE `…/:id` | finance:create / edit |
| PATCH | `/finance/invoices/:id/approve` · `/reject` · `/send` | finance:approve / edit |
| POST | `/finance/invoices/:id/payments` | finance:edit |
| PATCH/DELETE | `/finance/invoices/:invoiceId/payments/:paymentId` | finance:edit |
| GET | `/finance/payments` | finance:view |

### Accounts — `/api/accounts`
| Method | Path | Permission |
|--------|------|-----------|
| GET | `/accounts` · GET `/accounts/:id/statement` | finance:view / settings |
| POST/PATCH/DELETE | `/accounts[/:id]` | settings:manage |

## Procurement

### Suppliers — `/api/procurement/suppliers`
| Method | Path | Permission |
|--------|------|-----------|
| GET/POST/PUT/DELETE | `/procurement/suppliers[/:id]` | procurement:view / create / edit / delete |

### Purchase Orders — `/api/procurement/purchase-orders`
| Method | Path | Permission |
|--------|------|-----------|
| GET/POST/PATCH/DELETE | `/procurement/purchase-orders[/:id]` | procurement:* |
| PATCH | `…/:id/status` · `…/:id/approve` · `…/:id/reject` | procurement:edit / approve |
| POST | `…/:id/create-bill` | procurement:create |

### Vendor Bills — `/api/procurement/vendor-bills`
| Method | Path | Permission |
|--------|------|-----------|
| GET/POST/PATCH/DELETE | `/procurement/vendor-bills[/:id]` | procurement:* |
| PATCH | `…/:id/approve` · `…/:id/reject` | procurement:approve |
| POST/DELETE | `…/:id/payments[/:paymentId]` | procurement:edit |
| GET | `…/vendor-payments` | procurement:view |

## Projects, Tasks, Activities, Notes

### Projects — `/api/projects`
| Method | Path | Permission |
|--------|------|-----------|
| GET/POST/PATCH/DELETE | `/projects[/:id]` | projects:* |
| GET | `/projects/:id/finance` · `/invoices` · `/expenses` · `/tasks` | projects:view |
| POST/PATCH/DELETE | `/projects/:id/milestones[/:milestoneId]` | projects:edit |
| POST/PATCH/DELETE | `/projects/:id/members[/:userId]` | projects:edit |

### Tasks — `/api/tasks`
| Method | Path | Permission |
|--------|------|-----------|
| GET | `/tasks` · `/tasks/summary` · `/tasks/:id` | tasks:view |
| POST/PUT/DELETE | `/tasks[/:id]` | tasks:create / edit / delete |
| PATCH | `/tasks/:id/complete` | tasks:edit |

### Activities — `/api/activities` · Notes — `/api/notes` · Timeline — `/api/timeline`
| Method | Path | Notes |
|--------|------|-------|
| GET/POST/PUT/DELETE | `/activities[/:id]` | polymorphic `linkedTo`/`linkedModel` |
| GET/POST/PUT/DELETE | `/notes[/:id]` | polymorphic |
| GET | `/timeline?linkedTo=&linkedModel=` | read-only audit |

## Catalog & Inventory

### Products — `/api/products`
| Method | Path | Permission |
|--------|------|-----------|
| GET/POST/PUT/DELETE | `/products[/:id]` | products:* |

### Inventory — `/api/inventory`
| Method | Path | Permission |
|--------|------|-----------|
| GET | `/inventory` · `/inventory/low-stock` · `/inventory/movements` | products:view |
| POST | `/inventory/:productId/adjust` | products:edit |
| PATCH | `/inventory/:productId/reorder-level` · `/details` | products:edit |

## Expenses — `/api/expenses`
| Method | Path | Permission |
|--------|------|-----------|
| GET/POST/PUT/DELETE | `/expenses[/:id]` | expenses:* |
| PATCH | `/expenses/:id/approve` · `/reject` | expenses:approve |

## Analytics

### Reports — `/api/reports` (permission `reports:view`)
`/reports`, `/reports/revenue`, `/reports/pipeline`, `/reports/expenses-category`,
`/reports/outstanding`, `/reports/customer-acquisition`, `/reports/bookings`,
`/reports/leads` — most accept `startDate`/`endDate`.

### Summary — `/api/summary` · Search — `/api/search` · Logs — `/api/logs`
| Method | Path | Permission |
|--------|------|-----------|
| GET | `/summary?timePeriod=` · `/summary/pending-approvals` | authenticated |
| GET | `/search?q=` | authenticated (scope-filtered) |
| GET | `/logs` (filters: action, dates, user) | logs:view |

## Notifications — `/api/notifications`
| Method | Path |
|--------|------|
| GET | `/notifications` · `/notifications/unread-count` |
| PUT | `/notifications/:id/read` · `/notifications/read-all` |
| DELETE | `/notifications/:id` |

## Attachments — `/api/attachments`
| Method | Path | Notes |
|--------|------|-------|
| GET | `/attachments?linkedModel=&linkedToId=` | list |
| POST | `/attachments` (multipart) | upload |
| GET | `/attachments/:id/download` | blob |
| DELETE | `/attachments/:id` | |

## Approvals — `/api/approvals`
| Method | Path |
|--------|------|
| GET | `/approvals/:entityType/:entityId/steps` |

## Settings — `/api/settings` (mostly `settings:view` / `settings:manage`)
`workspace`, `organization`, `approvals`, `invoice-defaults`, `password-policy`,
`exchange-rates`, `number-sequences`, `tax-rates`, `email-config`
(+ `email-config/test`). GET/PUT (tax-rates also POST/PATCH/DELETE).

---

## Data tooling (Stage 1)

### Import — `/api/import`
| Method | Path | Notes |
|--------|------|-------|
| GET | `/import/:entity/fields` | field list incl. `cf_*` custom fields |
| POST | `/import/:entity` | `{ mapping, rows }` → `{ total, created, skipped, errors[] }`; per-entity create permission enforced. entity ∈ customers, leads, deals |

### Dedup — `/api/dedup`
| Method | Path | Notes |
|--------|------|-------|
| GET | `/dedup/:entity/duplicates` | groups by normalized phone/email (perm `:view`) |
| POST | `/dedup/:entity/merge` | `{ surviveId, mergeIds[] }` (perm `:edit`). entity ∈ customers, leads |

### Bulk — `/api/bulk`
| Method | Path | Notes |
|--------|------|-------|
| POST | `/bulk/:entity` | `{ ids[], action, value? }`; action ∈ `delete` (`:delete`), `assignOwner`/`setStatus` (`:edit`). entity ∈ customers, leads, deals |

### Saved views — `/api/saved-views`
| Method | Path | Notes |
|--------|------|-------|
| GET | `/saved-views?module=` | current user's views |
| POST | `/saved-views` | `{ module, name, query }` |
| DELETE | `/saved-views/:id` | owner only |

### API keys — `/api/api-keys` (permission `settings:manage`)
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api-keys` | list (no secret) |
| POST | `/api-keys` | `{ name, userId? }` → `{ key }` **shown once** |
| DELETE | `/api-keys/:id` | revoke |

---

## Public API — `/api/public/v1`
Authenticated by `x-api-key` (not JWT). The key acts as its owning user and
inherits that user's permissions + visibility scope. Read + create + update for
customers, leads, deals. Full details in
[../backend/PUBLIC_API.md](../backend/PUBLIC_API.md).

| Method | Path | Permission |
|--------|------|-----------|
| GET | `/public/v1/{customers,leads,deals}` | `<resource>:view` |
| GET | `/public/v1/{customers,leads,deals}/:id` | `<resource>:view` |
| POST | `/public/v1/{customers,leads,deals}` | `<resource>:create` |
| PUT | `/public/v1/{customers,leads,deals}/:id` | `<resource>:edit` |

## Internal — `/api/internal/cron`
| Method | Path | Auth |
|--------|------|------|
| POST | `/internal/cron/run` | bearer `CRON_SECRET` (serverless scheduler trigger) |
