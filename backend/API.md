# NawaHub API Reference

Complete HTTP endpoint reference for the NawaHub backend. For setup, scripts and
architecture see **[README.md](./README.md)**.

## Conventions

- **Base URL:** every route is served under the global prefix `/api`
  (e.g. `https://<host>/api/customers`). Paths below omit the `/api` prefix.
- **Auth:** send the access token as `Authorization: Bearer <token>`. Tokens are
  obtained from `POST /auth/signin` and rotated via `POST /auth/refresh` (the
  refresh token lives in an httpOnly cookie). All routes require authentication
  unless marked _public_.
- **Permissions:** most write routes require a permission of the form
  `module:action` (`view`, `create`, `edit`, `delete`, `approve`, `export`,
  `manage`). The super-admin role holds the wildcard `*`. A `403` means the
  authenticated user lacks the required permission.
- **List queries:** list endpoints accept `q` (search), `page`/`pageSize`,
  `sort`/`dir`, and module-specific filters (e.g. `status`, `ownerId`).
- **Soft delete:** `DELETE` on aggregate resources sets `deletedAt`; rows stay in
  the database and are filtered out of normal reads.
- **Errors:** non-2xx responses return `{ "statusCode", "message", "error" }`.
- **Rate limiting:** a global throttler applies; auth endpoints are stricter.

---

## Authentication — `/auth`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/signin` | Authenticate; returns an access token + sets the refresh cookie. _public_ |
| POST | `/auth/refresh` | Rotate the refresh token and issue a new access token. _public (cookie)_ |
| POST | `/auth/logout` | Revoke the current refresh token. |

## Users — `/users`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/users` | List users. |
| GET | `/users/:id` | Get a user. |
| POST | `/users` | Create a user (`users:create`). |
| PUT | `/users/:id` | Update a user (`users:edit`). |
| PATCH | `/users/:id/toggle-active` | Activate/deactivate a user. |
| DELETE | `/users/:id` | Delete a user (`users:delete`). |
| POST | `/users/me/change-password` | Change own password. |
| GET | `/users/me/sessions` | List own active sessions. |
| DELETE | `/users/me/sessions/:sessionId` | Revoke a session. |
| GET | `/users/me/login-history` | Own login history. |
| GET | `/users/me/notification-preferences` | Get notification preferences. |
| PUT | `/users/me/notification-preferences` | Update notification preferences. |

## Roles — `/roles`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/roles` | List roles + permissions. |
| POST | `/roles` | Create a role (`roles:manage`). |
| PUT | `/roles/:id` | Update a role (`roles:manage`). |
| DELETE | `/roles/:id` | Delete a role (`roles:manage`). |

---

## Customers — `/customers`  ·  permissions `contacts:*`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/customers` | List customers. |
| GET | `/customers/:id` | Get a customer. |
| POST | `/customers` | Create a customer. |
| PUT | `/customers/:id` | Update a customer. |
| DELETE | `/customers/:id` | Soft-delete a customer. |

## Leads — `/leads`  ·  permissions `leads:*`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/leads` | List leads. |
| GET | `/leads/:id` | Get a lead. |
| POST | `/leads` | Create a lead. |
| PUT | `/leads/:id` | Update a lead. |
| DELETE | `/leads/:id` | Soft-delete a lead. |
| POST | `/leads/:id/convert` | Convert a lead into a customer. |

## Deals — `/deals`  ·  permissions `deals:*`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/deals` | List deals. |
| GET | `/deals/:id` | Get a deal. |
| POST | `/deals` | Create a deal. |
| PUT | `/deals/:id` | Update a deal. |
| DELETE | `/deals/:id` | Soft-delete a deal. |
| POST | `/deals/:id/create-quote` | Generate a quote from the deal. |

## Activities — `/activities`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/activities` | List activities (filter by linked record). |
| POST | `/activities` | Create an activity. |
| PUT | `/activities/:id` | Update an activity. |
| DELETE | `/activities/:id` | Delete an activity. |

## Notes — `/notes`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/notes` | List notes for a linked record. |
| POST | `/notes` | Create a note. |
| PUT | `/notes/:id` | Update a note. |
| DELETE | `/notes/:id` | Delete a note. |

## Timeline — `/timeline`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/timeline` | Audit/event timeline for a linked record. |

---

## Products — `/products`  ·  permissions `products:*`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/products` | List products. |
| GET | `/products/:id` | Get a product. |
| POST | `/products` | Create a product. |
| PUT | `/products/:id` | Update a product. |
| DELETE | `/products/:id` | Soft-delete a product. |

## Inventory — `/inventory`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/inventory` | Stock levels per product. |
| GET | `/inventory/low-stock` | Products at/below reorder level. |
| GET | `/inventory/movements` | Stock movement ledger. |
| POST | `/inventory/:productId/adjust` | Record a manual stock adjustment. |
| PATCH | `/inventory/:productId/details` | Update stock location/details. |
| PATCH | `/inventory/:productId/reorder-level` | Set the reorder level. |

---

## Quotes — `/finance/quotes`  ·  permissions `quotes:*`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/finance/quotes` | List quotes. |
| GET | `/finance/quotes/:id` | Get a quote. |
| POST | `/finance/quotes` | Create a quote. |
| PUT | `/finance/quotes/:id` | Update a quote. |
| DELETE | `/finance/quotes/:id` | Soft-delete a quote. |
| PATCH | `/finance/quotes/:id/approve` | Approve a quote (`quotes:approve`). |
| PATCH | `/finance/quotes/:id/reject` | Reject a quote (`quotes:approve`). |
| POST | `/finance/quotes/:id/convert` | Convert a quote to an invoice. |
| POST | `/finance/quotes/:id/convert-to-sales-order` | Convert a quote to a sales order. |

## Sales Orders — `/sales-orders`  ·  permissions `sales-orders:*`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/sales-orders` | List sales orders. |
| GET | `/sales-orders/:id` | Get a sales order. |
| GET | `/sales-orders/:id/purchase-order-prefill` | Prefill data for a linked PO. |
| POST | `/sales-orders` | Create a sales order. |
| PUT | `/sales-orders/:id` | Update a sales order. |
| PATCH | `/sales-orders/:id/status` | Change status. |
| PATCH | `/sales-orders/:id/approve` | Approve (`sales-orders:approve`). |
| PATCH | `/sales-orders/:id/reject` | Reject (`sales-orders:approve`). |
| POST | `/sales-orders/:id/create-invoice` | Generate an invoice. |
| DELETE | `/sales-orders/:id` | Soft-delete a sales order. |

## Invoices & Payments — `/finance`  ·  permissions `invoices:*`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/finance/invoices` | List invoices. |
| GET | `/finance/invoices/:id` | Get an invoice. |
| POST | `/finance/invoices` | Create an invoice. |
| PUT | `/finance/invoices/:id` | Update an invoice. |
| DELETE | `/finance/invoices/:id` | Soft-delete an invoice. |
| PATCH | `/finance/invoices/:id/send` | Mark an invoice as sent. |
| PATCH | `/finance/invoices/:id/approve` | Approve (`invoices:approve`). |
| PATCH | `/finance/invoices/:id/reject` | Reject (`invoices:approve`). |
| POST | `/finance/invoices/:id/payments` | Record a payment. |
| PATCH | `/finance/invoices/:invoiceId/payments/:paymentId` | Update a payment. |
| DELETE | `/finance/invoices/:invoiceId/payments/:paymentId` | Delete a payment. |
| GET | `/finance/payments` | List all customer payments. |

## Accounts — `/accounts`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/accounts` | List cash/bank accounts. |
| POST | `/accounts` | Create an account. |
| PATCH | `/accounts/:id` | Update an account. |
| DELETE | `/accounts/:id` | Soft-delete an account. |
| GET | `/accounts/:id/statement` | Account statement (ledger). |

## Expenses — `/expenses`  ·  permissions `expenses:*`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/expenses` | List expense reports. |
| GET | `/expenses/:id` | Get an expense report. |
| POST | `/expenses` | Create an expense report. |
| PUT | `/expenses/:id` | Update an expense report. |
| PATCH | `/expenses/:id/approve` | Approve (`expenses:approve`). |
| PATCH | `/expenses/:id/reject` | Reject (`expenses:approve`). |
| DELETE | `/expenses/:id` | Soft-delete an expense report. |

---

## Suppliers — `/procurement/suppliers`  ·  permissions `suppliers:*`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/procurement/suppliers` | List suppliers. |
| GET | `/procurement/suppliers/:id` | Get a supplier. |
| POST | `/procurement/suppliers` | Create a supplier. |
| PUT | `/procurement/suppliers/:id` | Update a supplier. |
| DELETE | `/procurement/suppliers/:id` | Soft-delete a supplier. |

## Purchase Orders — `/procurement/purchase-orders`  ·  permissions `purchase-orders:*`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/procurement/purchase-orders` | List purchase orders. |
| GET | `/procurement/purchase-orders/:id` | Get a purchase order. |
| POST | `/procurement/purchase-orders` | Create a purchase order. |
| PUT | `/procurement/purchase-orders/:id` | Update a purchase order. |
| PATCH | `/procurement/purchase-orders/:id/status` | Change status. |
| PATCH | `/procurement/purchase-orders/:id/approve` | Approve (`purchase-orders:approve`). |
| PATCH | `/procurement/purchase-orders/:id/reject` | Reject (`purchase-orders:approve`). |
| POST | `/procurement/purchase-orders/:id/create-bill` | Generate a vendor bill. |
| DELETE | `/procurement/purchase-orders/:id` | Soft-delete a purchase order. |

## Vendor Bills — `/procurement/vendor-bills`  ·  permissions `vendor-bills:*`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/procurement/vendor-bills` | List vendor bills. |
| GET | `/procurement/vendor-bills/vendor-payments` | List vendor payments. |
| GET | `/procurement/vendor-bills/:id` | Get a vendor bill. |
| POST | `/procurement/vendor-bills` | Create a vendor bill. |
| PUT | `/procurement/vendor-bills/:id` | Update a vendor bill. |
| PATCH | `/procurement/vendor-bills/:id/approve` | Approve (`vendor-bills:approve`). |
| PATCH | `/procurement/vendor-bills/:id/reject` | Reject (`vendor-bills:approve`). |
| POST | `/procurement/vendor-bills/:id/payments` | Record a payment. |
| DELETE | `/procurement/vendor-bills/:billId/payments/:paymentId` | Delete a payment. |
| DELETE | `/procurement/vendor-bills/:id` | Soft-delete a vendor bill. |

---

## Projects — `/projects`  ·  permissions `projects:*`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects` | List projects. |
| GET | `/projects/:id` | Get a project. |
| GET | `/projects/:id/invoices` | Invoices linked to the project. |
| GET | `/projects/:id/expenses` | Expenses linked to the project. |
| GET | `/projects/:id/tasks` | Tasks linked to the project. |
| POST | `/projects` | Create a project. |
| PUT | `/projects/:id` | Update a project. |
| DELETE | `/projects/:id` | Soft-delete a project. |
| GET | `/projects/:id/milestones` | List milestones. |
| POST | `/projects/:id/milestones` | Add a milestone. |
| PUT | `/projects/:id/milestones/:milestoneId` | Update a milestone. |
| DELETE | `/projects/:id/milestones/:milestoneId` | Delete a milestone. |
| GET | `/projects/:id/members` | List members. |
| POST | `/projects/:id/members` | Add a member. |
| DELETE | `/projects/:id/members/:userId` | Remove a member. |

## Tasks — `/tasks`  ·  permissions `tasks:*`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/tasks` | List tasks. |
| GET | `/tasks/summary` | Task counts by status/assignee. |
| GET | `/tasks/:id` | Get a task. |
| POST | `/tasks` | Create a task. |
| PUT | `/tasks/:id` | Update a task. |
| PATCH | `/tasks/:id/complete` | Mark a task complete. |
| DELETE | `/tasks/:id` | Soft-delete a task. |

---

## Approvals — `/approvals`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/approvals/:entityType/:entityId/steps` | Approval-chain steps for an entity. |

## Notifications — `/notifications`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/notifications` | List notifications. |
| GET | `/notifications/unread-count` | Unread count. |
| PUT | `/notifications/:id/read` | Mark one read. |
| PUT | `/notifications/read-all` | Mark all read. |
| DELETE | `/notifications/:id` | Delete a notification. |

## Search & Summary
| Method | Path | Description |
|--------|------|-------------|
| GET | `/search` | Global cross-module search (`q`). |
| GET | `/summery` | Dashboard summary metrics. |
| GET | `/summery/pending-approvals` | Items awaiting the user's approval. |

## Reports — `/reports`  ·  permissions `reports:*`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/reports` | Report index/metadata. |
| GET | `/reports/revenue` | Revenue over time. |
| GET | `/reports/pipeline` | Deal pipeline breakdown. |
| GET | `/reports/expenses-category` | Expenses by category. |
| GET | `/reports/outstanding` | Outstanding receivables/payables. |
| GET | `/reports/customer-acquisition` | New customers over time. |
| GET | `/reports/bookings` | Bookings/sales report. |
| GET | `/reports/leads` | Lead funnel report. |

## Logs — `/logs`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/logs` | Audit log of user actions (`logs:view`). |

---

## Saved Views — `/saved-views`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/saved-views` | List the user's saved list views. |
| POST | `/saved-views` | Save a list view (filters + sort). |
| DELETE | `/saved-views/:id` | Delete a saved view. |

## Attachments — `/attachments`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/attachments` | Upload a file linked to a record. |
| GET | `/attachments` | List attachments for a linked record. |
| GET | `/attachments/:id/download` | Download a file. |
| DELETE | `/attachments/:id` | Delete an attachment. |

## Import / Bulk / Dedup
| Method | Path | Description |
|--------|------|-------------|
| GET | `/import/:entity/fields` | Importable fields for an entity. |
| POST | `/import/:entity` | Import records from CSV. |
| POST | `/bulk/:entity` | Bulk update/delete operations. |
| GET | `/dedup/:entity/duplicates` | Find potential duplicates. |
| POST | `/dedup/:entity/merge` | Merge duplicate records. |

## Emails — `/emails` & tracking — `/track`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/emails` | Send a tracked email to a record. |
| GET | `/emails` | List sent emails for a record. |
| GET | `/track/o/:id` | Open-tracking pixel. _public_ |
| GET | `/track/c/:id` | Click-tracking redirect. _public_ |

## AI — `/ai`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/ai/config` | Get AI provider config. |
| PUT | `/ai/config` | Update AI config (`settings:manage`). |
| PUT | `/ai/keys/:provider` | Set an encrypted provider key (`settings:manage`). |
| DELETE | `/ai/keys/:provider` | Remove a provider key (`settings:manage`). |
| POST | `/ai/summarize` | Summarize a record with AI. |
| POST | `/ai/score` | AI lead/deal scoring. |

---

## Settings — `/settings`  ·  reads: authenticated · writes: `settings:manage`
| Method | Path | Description |
|--------|------|-------------|
| GET / PUT | `/settings/approvals` | Approval-chain configuration. |
| GET / PUT | `/settings/workspace` | Custom fields, modules, pipeline stages. |
| GET / PUT | `/settings/organization` | Base currency + locale. |
| GET / PUT | `/settings/exchange-rates` | Manual FX rates. |
| GET | `/settings/number-sequences` | Document number sequences (`settings:view`). |
| PUT | `/settings/number-sequences/:key` | Update a number sequence. |
| GET / PUT | `/settings/invoice-defaults` | Default invoice/quote terms. |
| GET | `/settings/tax-rates` | List tax rates. |
| POST / PATCH / DELETE | `/settings/tax-rates[/:id]` | Manage tax rates. |
| GET / PUT | `/settings/password-policy` | Password policy. |
| GET / PUT | `/settings/email-config` | SMTP config. |
| POST | `/settings/email-config/test` | Send a test email. |

## Sample Data — `/settings/sample-data`  ·  `settings:manage`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/settings/sample-data/load` | Load (or top up) demo data across all modules. Idempotent. |
| POST | `/settings/sample-data/clear` | Remove every seeded sample record (`smpl-` prefixed). Real data untouched. |

## API Keys — `/api-keys`  ·  `settings:manage`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api-keys` | List API keys (prefixes only). |
| POST | `/api-keys` | Create a key (raw value shown once). |
| DELETE | `/api-keys/:id` | Revoke a key. |

---

## Public API — `/public/v1`  ·  authenticated by API key
External integrations authenticate with an API key (created above) instead of a
JWT; the key inherits its owner's role and permissions. Same `Authorization:
Bearer <key>` header.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/public/v1/customers` · `/customers/:id` | List / get customers. |
| POST / PUT | `/public/v1/customers[/:id]` | Create / update a customer. |
| GET | `/public/v1/leads` · `/leads/:id` | List / get leads. |
| POST / PUT | `/public/v1/leads[/:id]` | Create / update a lead. |
| GET | `/public/v1/deals` · `/deals/:id` | List / get deals. |
| POST / PUT | `/public/v1/deals[/:id]` | Create / update a deal. |

## Internal — `/internal/cron`  ·  `CRON_SECRET`
| Method | Path | Description |
|--------|------|-------------|
| GET / POST | `/internal/cron/run` | Sweep overdue documents + flush the email outbox. Guarded by the `CRON_SECRET` bearer token; called on a schedule by Vercel Cron. |
