<div align="center">

# 📦 Order & Inventory Monorepo

**Turborepo · React + TS · Express + TS · Drizzle · PostgreSQL (Docker)**

![Turborepo](https://img.shields.io/badge/Turborepo-2.x-EF4444?logo=turborepo&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![Drizzle](https://img.shields.io/badge/Drizzle_ORM-0.36-C5F74F?logo=drizzle&logoColor=black)
![Postgres](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3-3E67B1?logo=zod&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)

</div>

## 🚀 Quick start

```bash
cp .env.example .env        # Windows: copy .env.example .env
pnpm install
pnpm db:up                  # starts Postgres in Docker
pnpm db:migrate             # applies the Drizzle migration (or: pnpm db:push)
pnpm db:seed                # 14 products (1 inactive, 1 zero-stock)
pnpm dev                    # web → :5173   api → :4000
```

> Need pnpm? `npm i -g pnpm` (Node 20+ required).

## 🧱 What's inside

| Path | What it is |
|---|---|
| 🌐 `apps/web` | React 18 + Vite + Tailwind + shadcn/ui, TanStack Query & Table, react-hook-form |
| 🛠️ `apps/api` | Express 5 + Drizzle ORM + Zod, Postgres |
| 🔗 `packages/shared` | Zod schemas, DTO types and constants used by **both** apps |
| ⚙️ `packages/tsconfig` | Shared `base` / `node` / `react` tsconfigs |
| 🐳 `docker-compose.yml` | Postgres 16 with a healthcheck and a persistent volume |

```
.
├── apps
│   ├── api/src
│   │   ├── db/                 schema.ts · client.ts · seed.ts
│   │   ├── modules/products/   routes → facade → repository
│   │   ├── modules/orders/     routes → facade → repository
│   │   ├── middleware/         error handler (Zod, AppError, JSON)
│   │   └── app.ts · server.ts
│   └── web/src
│       ├── facades/            products.facade.ts · orders.facade.ts   ← only place that calls fetch
│       ├── hooks/              TanStack Query hooks (queries.ts)
│       ├── features/           products/ · orders/  (pages + RHF dialogs)
│       └── components/ui/      shadcn-style primitives
└── packages/shared/src         schemas.ts · types.ts
```

## 🎭 Facade pattern

| Layer | Facade | Hides |
|---|---|---|
| Backend | `productFacade`, `orderFacade` | repositories, transactions, row locking, DTO mapping, DB error → HTTP error |
| Frontend | `api.products`, `api.orders` | URLs, fetch, headers, response unwrapping, `ApiError` |

Routes only call facades. Components only call hooks, and hooks only call the frontend facades.

## 🔌 API

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/products?search=&status=&page=` | search + status + pagination together (page size 10) |
| GET | `/api/products/options` | all active products (for the order form) |
| POST / PUT | `/api/products`, `/api/products/:id` | create / edit |
| PATCH | `/api/products/:id/status` | deactivate / reactivate |
| GET | `/api/orders?page=` | list |
| GET | `/api/orders/:id` | detail with items |
| POST | `/api/orders` | create (transaction + row lock) |
| POST | `/api/orders/:id/cancel` | cancel (second call → `409 ALREADY_CANCELLED`, no double restore) |

Errors always look like `{ "error": { "code", "message", "details" } }`.

## 🛡️ Business rules built in

- ✅ Server-side validation (Zod, shared with the frontend)
- ✅ Totals are calculated from **DB prices**; the client's numbers are ignored
- ✅ `unit_price` and `line_total` are snapshotted in `order_items`
- ✅ Create = one transaction (`SELECT … FOR UPDATE` → validate → insert → decrement)
- ✅ Cancel = conditional `UPDATE … WHERE status='CREATED'` plus stock restore in one transaction
- ✅ DB `CHECK` constraints are the last safety net against negative stock

## 🧰 Scripts

| Command | Does |
|---|---|
| `pnpm dev` | web + api in watch mode |
| `pnpm build` · `pnpm typecheck` · `pnpm test` | run across the whole workspace |
| `pnpm db:up` / `db:down` | start / stop Postgres |
| `pnpm db:generate` | create a migration after editing `schema.ts` |
| `pnpm db:migrate` / `db:push` | apply migrations / sync schema directly |
| `pnpm db:seed` | reset and seed products |
| `pnpm db:studio` | Drizzle Studio |

### ➕ Add more shadcn components

```bash
cd apps/web && npx shadcn@latest add select tabs toast
```

## 📝 Assumptions / ideas to extend

- Order status is `CREATED` or `CANCELLED` only; orders can't be edited.
- A repeated cancel returns `409` with a clear message.
- Concurrency: two buyers for the last unit are serialized by the row lock, so the second one fails validation instead of overselling.
- Fill in the "Tools / effort" section of your own submission README (time spent and AI usage).
