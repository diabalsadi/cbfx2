# CBFX — Replit Project

## Architecture

- **Frontend**: Next.js 16 (React 19, MUI, Tailwind CSS, SCSS) — runs on port 5000
- **Backend**: FastAPI (Python) with SQLAlchemy ORM — runs on port 8000
- **Database**: Replit PostgreSQL (provisioned automatically via DATABASE_URL secret)

## Running the App

Two workflows are configured:

| Workflow | Command | Port |
|---|---|---|
| Start application | `cd frontend && npm run dev` | 5000 (webview) |
| Backend API | `cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload` | 8000 (console) |

## Environment Variables / Secrets

| Key | Description |
|---|---|
| `JWT_SECRET` | Secret key for signing JWT tokens (required) |
| `DATABASE_URL` | PostgreSQL connection string (auto-set by Replit DB) |
| `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` | Individual DB connection params |
| `NEXT_PUBLIC_BACKEND_URL` | Backend URL for frontend to call (set to http://localhost:8000) |

## Key Changes from Vercel

- Removed Docker/docker-compose dependency — services run natively
- Frontend port changed from 3000 → 5000 (required by Replit webview)
- Backend bound to `0.0.0.0` for Replit proxy compatibility
- `output: 'standalone'` removed from `next.config.ts` (not needed without Docker)
- `JWT_SECRET` moved from hardcoded placeholder to environment variable
- Database switched from local Docker PostgreSQL to Replit's built-in PostgreSQL

## Security Notes

- JWT secret is stored as a Replit Secret (never in code)
- Database credentials are managed by Replit (never hardcoded)
- Backend will refuse to start if `JWT_SECRET` is missing
