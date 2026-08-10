# ERP + CRM

A mini ERP and CRM system with Sales Challan management, inventory tracking, and customer management.

## Stack

- **Backend**: Node.js + TypeScript + Express + Prisma
- **Database**: PostgreSQL (Neon in production, Docker locally)
- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Auth**: JWT with role-based access (Admin / Sales / Warehouse / Accounts)
- **Deploy**: Vercel (frontend) + Render (backend) + Neon (database)

## Local Setup

### Prerequisites
- Node.js 20+
- Docker (for local Postgres)

### 1. Clone and install

```bash
git clone <repo-url>
cd ERP_CRM

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Start local database

```bash
# From repo root
docker-compose up -d
```

### 3. Configure environment

```bash
cd backend
cp .env.example .env
# Edit .env if needed — defaults match docker-compose
```

### 4. Run migrations and seed

```bash
cd backend
npm run db:migrate
npm run db:seed
```

### 5. Start dev servers

```bash
# Terminal 1 — backend (http://localhost:3000)
cd backend && npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd frontend && npm run dev
```

## Test Credentials

| Role      | Email                   | Password   |
|-----------|-------------------------|------------|
| Admin     | admin@erp.com           | admin123   |
| Sales     | sales@erp.com           | sales123   |
| Warehouse | warehouse@erp.com       | warehouse123 |
| Accounts  | accounts@erp.com        | accounts123 |

## API

Base URL: `http://localhost:3000`

Health check: `GET /health`

Full Postman collection: _coming soon_

## Environment Variables

| Variable       | Description                          |
|----------------|--------------------------------------|
| `DATABASE_URL` | PostgreSQL connection string         |
| `JWT_SECRET`   | Secret key for signing JWTs          |
| `PORT`         | Backend port (default: 3000)         |
| `NODE_ENV`     | `development` or `production`        |

## Deployment

- **Database**: Create a Neon project, copy the connection string to `DATABASE_URL`
- **Backend**: Deploy to Render — set env vars, run `npm run db:migrate` on first deploy
- **Frontend**: Deploy to Vercel — set `VITE_API_URL` to your Render backend URL

## Assumptions & Known Limitations

- Challan cancellation is allowed on both Draft and Confirmed status; Confirmed cancellations do **not** reverse stock (documented assumption)
- No refresh token flow — JWTs expire per `JWT_SECRET` config; re-login required
- PDF export and S3 image upload are not implemented (out of scope)
