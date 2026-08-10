# Vertex Club — Mini ERP + CRM

A full-stack ERP/CRM system with Sales Challan management, inventory tracking, and customer relationship management.

## Live Links _(deployment — tomorrow)_

| Service    | URL                          |
|------------|------------------------------|
| Frontend   | _Vercel — TBD_               |
| Backend    | _Render — TBD_               |
| Database   | Neon PostgreSQL (provisioned)|

---

## Tech Stack

| Layer      | Technology                                                                 |
|------------|----------------------------------------------------------------------------|
| Frontend   | React 18 + Vite + TypeScript + Tailwind CSS 3 + Framer Motion + Lucide    |
| Backend    | Node.js 20 + Express 4 + TypeScript + Prisma ORM                          |
| Database   | PostgreSQL (Neon serverless in production, Docker locally)                  |
| Auth       | JWT (HS256) — role-based access control                                    |

---

## Test Credentials

| Role      | Email                    | Password      |
|-----------|--------------------------|---------------|
| Admin     | `admin@erp.com`          | `admin123`    |
| Sales     | `sales@erp.com`          | `sales123`    |
| Warehouse | `warehouse@erp.com`      | `warehouse123`|
| Accounts  | `accounts@erp.com`       | `accounts123` |

---

## Local Setup (Docker PostgreSQL)

### Prerequisites

- Node.js 20+
- Docker Desktop running

### 1. Clone & install

```bash
git clone <repo-url>
cd ERP_CRM

cd backend && npm install
cd ../frontend && npm install
```

### 2. Start local database

```bash
# From repo root — starts Postgres on port 5432
docker-compose up -d
```

### 3. Backend environment

```bash
cd backend
cp .env.example .env
# Defaults already match docker-compose — no edits needed for local dev
```

`.env` contents (already set by `.env.example`):

```env
DATABASE_URL="postgresql://erp_user:erp_pass@localhost:5432/erp_db"
JWT_SECRET="your-secret-key"
PORT=3000
NODE_ENV=development
```

To generate a strong JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Migrate & seed

```bash
cd backend
npx prisma migrate deploy   # apply migrations
npx ts-node src/seed.ts     # seed demo data
```

### 5. Run dev servers

```bash
# Terminal 1 — backend  →  http://localhost:3000
cd backend && npm run dev

# Terminal 2 — frontend →  http://localhost:5173
cd frontend && npm run dev
```

---

## Neon PostgreSQL Setup (production / alternative)

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the connection string (includes `?sslmode=require`)
3. Set in `backend/.env`:

```env
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"
```

4. Run migrations:

```bash
cd backend
npx prisma migrate deploy
npx ts-node src/seed.ts
```

---

## Project Structure

```
ERP_CRM/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Data models
│   │   └── migrations/            # SQL migration history
│   └── src/
│       ├── controllers/           # Business logic
│       │   ├── auth.controller.ts
│       │   ├── customer.controller.ts
│       │   ├── product.controller.ts
│       │   └── challan.controller.ts
│       ├── middleware/
│       │   ├── authenticate.ts    # JWT verification
│       │   ├── authorize.ts       # Role guard
│       │   └── errorHandler.ts    # Global error handler
│       ├── routes/                # Express routers
│       ├── utils/
│       │   └── asyncHandler.ts    # Async error propagation wrapper
│       ├── seed.ts                # Demo data seeder
│       └── index.ts               # App entry point
└── frontend/
    └── src/
        ├── components/
        │   ├── layout/            # AppLayout, Sidebar, Topbar
        │   └── ui/                # Button, Card, Input, Modal, Badge, Toast…
        ├── context/
        │   └── AuthContext.tsx    # JWT decode, login/logout
        ├── hooks/                 # useCustomers, useProducts, useChallans
        ├── pages/
        │   ├── auth/LoginPage.tsx
        │   ├── DashboardPage.tsx
        │   ├── customers/         # List, Detail, Form
        │   ├── products/          # List, Detail, Form, StockAdjust
        │   └── challans/          # List, Detail, Form (two-panel picker)
        └── types/index.ts         # Shared TypeScript interfaces
```

---

## Role Permissions

| Action                        | Admin | Sales | Warehouse | Accounts |
|-------------------------------|:-----:|:-----:|:---------:|:--------:|
| View customers / products / challans | ✅ | ✅ | ✅ | ✅ |
| Create / edit customers       | ✅    | ✅    | —         | —        |
| Delete customers              | ✅    | —     | —         | —        |
| Create / edit products        | ✅    | —     | ✅        | —        |
| Adjust stock                  | ✅    | —     | ✅        | —        |
| Delete products               | ✅    | —     | —         | —        |
| Create / edit Draft challans  | ✅    | ✅    | —         | —        |
| Confirm / cancel challans     | ✅    | ✅    | —         | —        |
| Delete Draft challans         | ✅    | —     | —         | —        |

---

## API Reference

Base URL: `http://localhost:3000`

All protected routes require: `Authorization: Bearer <token>`

### Auth

```
POST /api/auth/login
Body: { email, password }
Response: { token, user: { id, name, email, role } }

POST /api/auth/register
Body: { name, email, password, role }
```

### Customers

```
GET    /api/customers                  List (q, status, type, page, limit)
GET    /api/customers/:id              Get by ID (includes notes + challans)
POST   /api/customers                  Create    [Admin, Sales]
PUT    /api/customers/:id              Update    [Admin, Sales]
DELETE /api/customers/:id              Delete    [Admin]
GET    /api/customers/:id/notes        List notes
POST   /api/customers/:id/notes        Add note  [Admin, Sales]
```

**Customer body:**
```json
{
  "name": "Ravi Kumar",
  "mobile": "9876543210",
  "email": "ravi@example.com",
  "businessName": "Kumar Traders",
  "gstNumber": "29ABCDE1234F1Z5",
  "type": "Wholesale",
  "status": "Lead",
  "address": "MG Road, Bangalore"
}
```

Customer status values: `Lead | Active | Inactive`  
Customer type values: `Retail | Wholesale | Distributor`

### Products

```
GET    /api/products                   List (q, category, lowStock, page, limit)
GET    /api/products/:id               Get by ID
POST   /api/products                   Create    [Admin, Warehouse]
PUT    /api/products/:id               Update    [Admin, Warehouse]
DELETE /api/products/:id               Delete    [Admin]
GET    /api/products/:id/stock         Stock movement log (paginated)
POST   /api/products/:id/stock         Adjust stock  [Admin, Warehouse]
```

**Product body:**
```json
{
  "name": "M6 Bolt 50mm",
  "sku": "BOLT-M6-50",
  "category": "Fasteners",
  "unitPrice": 2.50,
  "currentStock": 500,
  "minStockAlert": 100,
  "location": "Rack A-3"
}
```

**Stock adjustment body:**
```json
{
  "type": "IN",
  "quantity": 200,
  "reason": "Purchase from supplier"
}
```

Stock movement types: `IN | OUT`

### Challans

```
GET    /api/challans                   List (status, customerId, q, page, limit)
GET    /api/challans/:id               Get by ID (includes items with snapshots)
POST   /api/challans                   Create    [Admin, Sales]
PUT    /api/challans/:id               Update Draft [Admin, Sales]
PATCH  /api/challans/:id/confirm       Confirm → deducts stock [Admin, Sales]
PATCH  /api/challans/:id/cancel        Cancel   [Admin, Sales]
```

**Create challan body:**
```json
{
  "customerId": "cuid-here",
  "status": "Draft",
  "items": [
    { "productId": "cuid-here", "quantity": 10 },
    { "productId": "cuid-here", "quantity": 5 }
  ]
}
```

**Challan response includes:**
- Auto-generated challan number (`CH-0001`, `CH-0002`, …)
- Price/name snapshots per line item (immutable after creation)
- `totalQuantity` computed field
- Customer + created-by user references

Challan status: `Draft → Confirmed | Cancelled`

---

## Key Design Decisions

- **Stock deduction on confirm** — `confirmChallan` runs in a Prisma transaction. Each item checks `currentStock >= quantity` before deducting; if any item fails the guard, the whole transaction rolls back.
- **Price snapshots** — `productNameSnapshot`, `skuSnapshot`, `unitPriceSnapshot` are stored at challan creation time. Changing a product's price later doesn't alter historical challans.
- **Async error propagation** — all Express route handlers are wrapped with `asyncHandler()` so async errors forward to the global error handler (Express 4 doesn't do this automatically).
- **Decimal serialization** — Prisma's `Decimal` type serializes as a string in JSON. All frontend price displays use `Number()` coercion before `.toFixed()` or arithmetic.
- **Empty-string param stripping** — list hooks strip `''` and `undefined` query params before the API call to avoid Zod enum validation failures on optional filter fields.

---

## Assumptions & Known Limitations

- Challan cancellation is allowed on both `Draft` and `Confirmed` status. Cancelling a `Confirmed` challan does **not** reverse the stock deduction (documented assumption — reversals would need a separate stock-return flow).
- No refresh token flow — JWTs last until expiry; re-login required when the token expires.
- No file uploads (PDF export, product images) — out of scope per assignment spec.
- Customer `followUpDate` is stored but no scheduled reminder/notification is implemented.
- Pagination max limit is 100 rows per request (backend enforced via Zod).

---

## Scripts Reference

```bash
# Backend
npm run dev          # ts-node-dev watch mode
npm run build        # tsc compile to dist/
npm start            # node dist/index.js

# Database
npx prisma migrate dev    # create + apply new migration (dev only)
npx prisma migrate deploy # apply existing migrations (production)
npx prisma studio         # browse database in browser UI
npx ts-node src/seed.ts   # run demo data seeder

# Frontend
npm run dev          # Vite dev server  →  http://localhost:5173
npm run build        # production build →  dist/
npm run preview      # preview production build locally
```
