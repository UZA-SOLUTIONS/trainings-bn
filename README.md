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

## Environment

| Variable | Purpose |
|----------|---------|
| `PORT` | API port (default 5000) |
| `CLIENT_URL` | Frontend origin for CORS |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret |
| `JWT_EXPIRES_IN` | e.g. `1h` |
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
