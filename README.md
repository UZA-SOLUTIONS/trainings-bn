# UZA Mobility API

Express REST backend for the UZA Mobility / Tunga Taxi platform.

## Stack

- Node.js + Express
- MongoDB + Mongoose
- JWT + bcryptjs
- Zod validation
- Helmet, CORS, rate limiting

## Setup

1. Run MongoDB locally (or use Atlas).
2. Copy `.env.example` to `.env` and set `MONGODB_URI` and `JWT_SECRET`.
3. Install and start:

```bash
npm install
npm start
```

Development with reload:

```bash
npm run dev
```

On first start, default cohorts and financing institutions are seeded automatically if the database is empty.

On every start, default **staff accounts** are created when their email is not already in the database (existing users are never overwritten).

### Default staff (seed)

| Role | Email | Password |
|------|-------|------------|
| Admin | `admin@uza.rw` | `SEED_STAFF_PASSWORD` (default `ChangeMe123!`) |
| Instructor | `instructor@uza.rw` | same |
| Bank partner | `partner@unguka.rw` | same (scoped to Unguka Bank) |

If you already created an admin via signup, that account remains. The seeded admin is only added when `admin@uza.rw` does not exist yet.

Sign in at the frontend `/auth` page with any of the accounts above.

## Environment

| Variable | Purpose |
|----------|---------|
| `PORT` | API port (default 5000) |
| `CLIENT_URL` | Frontend origin for CORS |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret |
| `JWT_EXPIRES_IN` | e.g. `1h` |
| `SEED_STAFF_PASSWORD` | Password for default seed staff accounts |
| `NODE_ENV` | `development` / `production` |

## Example MongoDB URIs

Local:

```
MONGODB_URI=mongodb://127.0.0.1:27017/uza_mobility
```

Atlas:

```
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/uza_mobility
```
