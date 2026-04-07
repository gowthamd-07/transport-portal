# TransFleet Pro - Transport Management System

A full-stack web application for managing daily transport trips with vehicle route planning, user authentication, and role-based access control.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router, Vite |
| Backend | Node.js, Express |
| Database | PostgreSQL (Neon for production) |
| Auth | JWT + bcryptjs |
| Export | ExcelJS, PDFKit |
| Deploy | Vercel (frontend + API) / Docker (local) |

## Default Login

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Admin |

> Change the admin password after first login.

---

## Local Development (without Docker)

### 1. Start PostgreSQL

If you have PostgreSQL running locally, create the database and run the seed:

```bash
createdb transport
psql -d transport -f seed.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env    # edit DATABASE_URL if needed
npm install
npm run dev
```

Backend runs on http://localhost:3001

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173 (Vite proxies `/api` to the backend).

---

## Local Testing with Docker

Start the full stack (PostgreSQL + backend + frontend) with one command:

```bash
docker compose up --build
```

- **Frontend**: http://localhost (port 80)
- **Backend API**: http://localhost:3001
- **PostgreSQL**: localhost:5432 (user: `postgres`, password: `postgres`, db: `transport`)

The `seed.sql` file is automatically executed on first PostgreSQL container start.

To reset the database:

```bash
docker compose down -v   # removes volumes
docker compose up --build
```

---

## Production Deployment (Vercel + Neon)

### 1. Set up Neon Database

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the connection string (looks like `postgresql://user:pass@ep-xxx.region.neon.tech/dbname?sslmode=require`)
3. Run the seed SQL against your Neon database:
   ```bash
   psql "your-neon-connection-string" -f seed.sql
   ```
   Or paste the contents of `seed.sql` into the Neon SQL Editor in the dashboard.

### 2. Deploy to Vercel

1. Push this repo to GitHub
2. Import the project at [vercel.com](https://vercel.com)
3. Set these environment variables in Vercel project settings:

   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | Your Neon connection string |
   | `JWT_SECRET` | A random secure string (e.g. `openssl rand -hex 32`) |
   | `NODE_ENV` | `production` |
   | `VERCEL` | `1` (set automatically by Vercel) |
   | `CORS_ORIGINS` | Your Vercel domain (e.g. `https://your-app.vercel.app`) |

4. Deploy. Vercel will:
   - Build the frontend with Vite → static files
   - Bundle the backend as a serverless function at `/api/*`
   - Serve the React SPA for all other routes

### 3. After Deployment

- Visit your Vercel URL and log in with `admin` / `admin123`
- Immediately change the admin password via the profile page

---

## Project Structure

```
transport-portal/
├── seed.sql                  # Database schema + seed data
├── docker-compose.yml        # Full-stack Docker setup
├── vercel.json               # Vercel deployment config
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js             # Express app
│   ├── database.js           # PostgreSQL connection pool
│   ├── api/
│   │   └── index.js          # Vercel serverless entry
│   ├── middleware/
│   │   └── auth.js           # JWT auth + admin guard
│   └── routes/
│       ├── auth.js           # Login, profile
│       ├── trips.js          # Trip CRUD, status, stats
│       ├── masters.js        # Vehicle types, vendors, etc.
│       ├── downloads.js      # Excel/PDF export
│       └── users.js          # Admin user management
└── frontend/
    ├── Dockerfile
    ├── nginx.conf            # Docker nginx config
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api.js            # HTTP client
        ├── index.css
        ├── context/
        │   └── AuthContext.jsx
        ├── components/
        │   ├── Layout.jsx
        │   ├── ProtectedRoute.jsx
        │   ├── ConfirmModal.jsx
        │   └── ErrorBoundary.jsx
        └── pages/
            ├── LoginPage.jsx
            ├── DashboardPage.jsx
            ├── CreateTripPage.jsx
            ├── TripsPage.jsx
            ├── UsersPage.jsx
            └── MasterDataPage.jsx
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | User login |
| GET | /api/auth/me | Get current user |
| PUT | /api/auth/profile | Update profile |

### Trips (requires auth)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/trips | List trips (with filters, pagination) |
| GET | /api/trips/stats | Dashboard statistics |
| GET | /api/trips/:id | Get single trip |
| POST | /api/trips | Create trip |
| PUT | /api/trips/:id | Update trip |
| PATCH | /api/trips/:id/status | Change status |
| DELETE | /api/trips/:id | Delete trip (admin only) |

### Users (admin only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/users | List all users |
| POST | /api/users | Create user |
| PUT | /api/users/:id | Update user |
| DELETE | /api/users/:id | Deactivate user |

### Downloads (requires auth via query token)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/downloads/excel | Export trips as Excel |
| GET | /api/downloads/pdf | Export trips as PDF |

### Masters (requires auth)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST/DELETE | /api/masters/vehicle-types | Vehicle types |
| GET/POST/DELETE | /api/masters/vendors | Vendors |
| GET/POST/DELETE | /api/masters/plants | Plants |
| GET/POST/DELETE | /api/masters/locations | Locations |
| GET/POST/DELETE | /api/masters/branches | Branches |
| GET/POST/DELETE | /api/masters/trip-bases | Trip bases |
| GET/POST/DELETE | /api/masters/trip-types | Trip types |
| GET/POST/PUT/DELETE | /api/masters/vehicles | Vehicles |
| GET/POST/PUT/DELETE | /api/masters/drivers | Drivers |
| GET | /api/masters/expiry-alerts | Vehicle document expiry alerts |
