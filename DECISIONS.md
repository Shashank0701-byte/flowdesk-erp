# Technical Decisions & Setup Notes

This doc covers the real decisions made building this project — what we chose, why, what blew up, and what we'd do differently. Written for evaluators and anyone trying to run this locally.

---

## Stack Choices

The assignment gave flexibility on stack. Here's what was picked and the honest reasoning behind each:

**Backend: Node.js + Express + TypeScript**  
NestJS was considered but dropped — it's great for large teams but the module/DI ceremony costs real time when you're moving fast. Express with a clean folder structure reads just as professional to a reviewer, and since the business logic here lives in maybe 4 controllers, there's no architectural reason to need Nest's overhead.

**ORM: Prisma**  
Prisma migrations mean schema changes are tracked and repeatable. More importantly, you get typed queries — if you mess up a field name, TypeScript tells you at compile time rather than at runtime when a grader tests it. For a project with deadline pressure and stock arithmetic that needs to be correct, that trade-off is worth it.

**Database: PostgreSQL**  
Nothing interesting here. It was in the spec. Used Neon (serverless Postgres) for production because it's free, spins up instantly, and the connection string just drops into `DATABASE_URL`. No setup friction.

**Frontend: React + Vite + TypeScript**  
No Next.js even though it's more familiar — this is a pure admin dashboard with zero SEO needs, and Vite's dev loop is faster. Added Tailwind CSS 3, Framer Motion for transitions, and Lucide for icons.

**Hosting: Vercel + Render + Neon**  
The spec said AWS is optional/bonus and "not expected to spend money." Burning time on IAM/EC2/RDS setup for a bonus point when the Challan logic could still have bugs is a bad trade. Vercel and Render are both git-push-to-deploy and free-tier, so the deploy story becomes: push to main, it's live. That's the right call at this scope.

---

## How the Server Is Set Up

The backend is a straightforward Express app in `backend/src/index.ts`. It's not fancy:

- CORS is configured to only allow requests from the frontend origin (set via `ALLOWED_ORIGINS` env var)
- All routes are behind `/api` — the root `/` returns a 404 (that's intentional, not a bug)
- There's a `/health` endpoint for uptime checks
- JWT middleware (`authenticate.ts`) verifies the token on protected routes; `authorize.ts` checks the role
- All async route handlers are wrapped with `asyncHandler()` so errors bubble to the global error handler instead of crashing the process — Express 4 doesn't do this automatically
- Prisma client is instantiated once and shared across controllers

The challan confirm/cancel routes use `PATCH` (not `POST`) because they're partial updates to an existing resource, which is the correct REST semantics.

---

## Environment Variables

### Backend

Create `backend/.env` from `backend/.env.example`:

```env
DATABASE_URL="postgresql://erp_user:erp_pass@localhost:5432/erp_db"
JWT_SECRET="your-secret-key-here"
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS="http://localhost:5173"
```

For local dev, the Docker Compose Postgres already matches the default `DATABASE_URL` — no edits needed. For Neon, paste the connection string they give you (it includes `?sslmode=require` which Prisma needs).

To generate a proper JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Frontend

Create `frontend/.env` from `frontend/.env.example`:

```env
VITE_API_URL=http://localhost:3000/api
```

**Important:** `VITE_*` variables are baked in at build time. If you change this on Vercel after deploying, you need to redeploy for it to take effect — updating the env var alone does nothing to the live site. This caught us during deployment (more on that below).

---

## Running Locally

### Prerequisites
- Node.js 20+
- Docker Desktop (for the local Postgres)

### Steps

```bash
# 1. Clone and install
git clone <repo-url>
cd ERP_CRM

cd backend && npm install
cd ../frontend && npm install

# 2. Start the database
docker-compose up -d

# 3. Set up backend env
cd backend
cp .env.example .env
# Defaults already work with docker-compose, no edits needed

# 4. Run migrations and seed demo data
npx prisma migrate deploy
npx ts-node src/seed.ts

# 5. Start both servers
# Terminal 1
cd backend && npm run dev   # → http://localhost:3000

# Terminal 2
cd frontend && npm run dev  # → http://localhost:5173
```

Login with any of the seeded accounts:
- `admin@erp.com` / `admin123`
- `sales@erp.com` / `sales123`
- `warehouse@erp.com` / `warehouse123`
- `accounts@erp.com` / `accounts123`

---

## Deployment

**Frontend → Vercel**  
Connect the repo, set root directory to `frontend`, set `VITE_API_URL` to your Render backend URL + `/api`. The `frontend/vercel.json` handles SPA client-side routing (without it, refreshing any route other than `/` returns a 404).

**Backend → Render**  
Connect the repo, set root directory to `backend`. The build and start commands are:

```
# Build
npm install --include=dev && npx prisma generate && npx prisma migrate resolve --applied "20260810095301_init" 2>/dev/null; npx prisma migrate deploy && npm run build && node dist/seed.js

# Start
node dist/index.js
```

The `--include=dev` flag on `npm install` is necessary because Render sets `NODE_ENV=production` by default, which makes npm skip devDependencies — and TypeScript + Prisma CLI live in devDeps, so the build would fail without it.

**Environment variables on Render:**
- `DATABASE_URL` — Neon connection string
- `JWT_SECRET` — same value you used in .env
- `NODE_ENV` — `production`
- `ALLOWED_ORIGINS` — your Vercel domain, no trailing slash, no path (just `https://yourapp.vercel.app`)

---

## Deployment Headaches (The Real Story)

**1. Prisma migration history didn't exist**  
The Neon database was first set up using `prisma db push` (which creates tables directly without creating migration history). When Render tried to run `prisma migrate deploy` later, it threw a `P3005` error because the tables existed but there was no `_prisma_migrations` record. The fix was to add `prisma migrate resolve --applied "migration_name"` to the build command, which marks the migration as already applied without re-running it.

**2. TypeScript build failed on Render because devDependencies weren't installed**  
`NODE_ENV=production` silently skips devDependencies during `npm install`. TypeScript is a devDependency, so `tsc` wasn't found and the build crashed. Changed to `npm install --include=dev` to force all deps.

**3. CORS blocked everything because of a path in the origin**  
Set `ALLOWED_ORIGINS` to `https://flowdesk-erp.vercel.app/login` by mistake (included the `/login` path). CORS checks origin headers exactly, so every request from pages other than `/login` got blocked. Removed the path, set it to just the domain.

**4. Login returned 404 even after fixing the env var**  
Set `VITE_API_URL` on Vercel but didn't redeploy. The old build was still live with the wrong URL baked in. Triggered a redeploy and it worked immediately. This is easy to miss if you don't know that Vite env vars are compile-time constants, not runtime config.

**5. Render doesn't give you shell access on the free tier**  
There's no way to run one-off commands (like `prisma migrate deploy` or the seed script) from the Render dashboard without paying for their Shell add-on. The solution was to bake both commands into the build step — they're both idempotent so running them on every deploy is safe.

---

## Assumptions Made

- **Challan cancellation doesn't reverse stock.** If a challan is confirmed (stock is decremented) and then cancelled, the stock stays decremented. A real system would need a separate stock-return flow. This felt out of scope for the assignment and is documented in the README.

- **No refresh tokens.** JWTs expire and users have to log in again. The spec said "simple JWT-based authentication is acceptable" so no refresh/rotation flow was built.

- **Price snapshots are set at creation, not confirmation.** When a challan is created, the current product price and name are stored on each line item. If the product price changes later, existing challans aren't affected. This is the correct behavior for an invoicing system.

- **Stock is checked again at confirmation time.** A challan can be created as a Draft with quantities that exceed stock. The actual stock guard runs inside a database transaction when the challan is confirmed — if any item doesn't have enough stock, the whole transaction rolls back and a `409` is returned.

- **`Customer` has a `Lead` status in addition to `Active` and `Inactive`.** This is a CRM concept — leads are potential customers who haven't transacted yet. New customers default to `Lead` and can be moved to `Active` once they've placed an order.

- **Register is open (no invite system).** The `/api/auth/register` endpoint doesn't require an existing token. In a real system you'd want admin-only user creation or an invite flow, but that's beyond the assignment scope.
