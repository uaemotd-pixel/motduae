# Deploying MOTD on Vercel (frontend + backend + MongoDB Atlas)

Everything runs on **one Vercel project**:

| Part | How |
|---|---|
| Frontend (Next.js) | Built from `frontend/` |
| Backend (Express API) | Serverless function at `api/index.mjs` |
| Database (live only) | MongoDB Atlas via `MONGODB_URI` |
| Database (local) | Local MongoDB via `backend/.env` |

---

## Architecture

```mermaid
flowchart LR
  User[Browser] --> Vercel[Vercel]
  subgraph Vercel
    Next[Next.js frontend]
    API[Express serverless /api]
    Next --> API
  end
  API --> Atlas[(MongoDB Atlas)]
```

- `https://your-app.vercel.app/en` → Next.js pages
- `https://your-app.vercel.app/api/health` → Express API
- `https://your-app.vercel.app/uploads/...` → Express static files

Local dev is unchanged: Next.js on `:3000`, Express on `:5000`, local MongoDB.

---

## Step 1 — MongoDB Atlas

1. Sign in at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a **free M0 cluster**.
3. **Database Access** → add a user (username + password). Save the password.
4. **Network Access** → **Allow Access from Anywhere** (`0.0.0.0/0`).
5. **Database** → **Connect** → **Drivers** → copy the connection string.
6. Edit it — replace `<password>`, URL-encode special characters, add database name:

```
mongodb+srv://motduser:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/motd?retryWrites=true&w=majority
```

Use this as `MONGODB_URI` on Vercel (not in local `backend/.env`).

### Seed Atlas (optional)

```powershell
cd backend
$env:MONGODB_URI="mongodb+srv://..."
$env:NODE_ENV="development"
npm run seed
```

---

## Step 2 — Push code to GitHub

```bash
git add .
git commit -m "Configure Vercel deployment"
git push origin main
```

Do not commit `.env` or `.env.local`.

---

## Step 3 — Create Vercel project

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your GitHub repo.
2. **Root Directory:** leave as **`.`** (repository root).
3. Vercel reads `vercel.json` at the repo root, which builds both Next.js and the API.

---

## Step 4 — Environment variables on Vercel

In **Project → Settings → Environment Variables**, add these for **Production** (and Preview if you want):

### Required

| Variable | Example / notes |
|---|---|
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/motd?retryWrites=true&w=majority` |
| `JWT_SECRET` | Long random string |
| `NODE_ENV` | `production` |

### URLs (use your Vercel URL after first deploy, or a placeholder you update)

| Variable | Value |
|---|---|
| `CORS_ORIGIN` | `https://your-app.vercel.app` |
| `FRONTEND_URL` | `https://your-app.vercel.app` |

### Optional (copy from local `backend/.env`)

| Variable | Purpose |
|---|---|
| `GOOGLE_CLIENT_ID` | Google sign-in (backend) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Same Client ID (frontend) |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |
| `SMTP_USER` | Gmail address |
| `SMTP_PASS` | Gmail App Password |
| `SMTP_FROM` | Gmail address |
| `STRIPE_SECRET_KEY` | Stripe backend |
| `STRIPE_PUBLISHABLE_KEY` | Stripe frontend (if needed) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhooks |
| `BLOB_READ_WRITE_TOKEN` | Auto-set when Blob store is linked to the Vercel project |

You do **not** need `NEXT_PUBLIC_API_URL` on Vercel — frontend and API share the same domain, so requests go to `/api/...` automatically.

---

## Step 5 — Deploy

1. Click **Deploy**.
2. Wait for the build (installs root, backend, and frontend deps; builds Next.js).
3. Note your URL, e.g. `https://motd-project.vercel.app`.

### Verify

| URL | Expected |
|---|---|
| `https://your-app.vercel.app/api/health` | `{ "status": "ok", "service": "motd-backend" }` |
| `https://your-app.vercel.app/en` | Homepage loads |

---

## Step 6 — Post-deploy

1. **Update URLs** if you used placeholders:
   - Set `CORS_ORIGIN` and `FRONTEND_URL` to your real Vercel URL → redeploy.
2. **Google OAuth** — add `https://your-app.vercel.app` to **Authorized JavaScript origins** in Google Cloud Console.
3. **Test** sign-in, API calls (Network tab should show `/api/...` on same domain, not `localhost`).

---

## Local development (unchanged)

**`backend/.env`:**
```env
MONGODB_URI=mongodb://127.0.0.1:27017/motd
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

**`frontend/.env.local`:**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id
```

```bash
npm run install:all
npm run dev
```

---

## Uploads on Vercel

Uploaded images are stored in **Vercel Blob** when `BLOB_READ_WRITE_TOKEN` is set (automatically added when you link a Blob store to the project). The API saves paths like `/uploads/fabrics/xyz.webp` in MongoDB and serves them through the Express `/uploads/*` route, which reads from Blob in production.

| Environment | Storage |
|---|---|
| Production (Vercel + Blob linked) | Vercel Blob (`motduae-blob`, private) |
| Local dev (no token) | `backend/uploads/` on disk |
| Seed/static images | `frontend/public/images/` (unchanged) |

Link Blob: Vercel project → **Storage** → connect `motduae-blob` → redeploy.

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `Missing required environment variable: MONGODB_URI` | Add `MONGODB_URI` in Vercel env vars → redeploy |
| `ENOENT ... routes-manifest-deterministic.json` | Redeploy latest `main` — the frontend build now creates this file automatically after `next build` |
| API 404 | Ensure **Root Directory** is repo root (`.`), not `frontend` |
| CORS errors | Set `CORS_ORIGIN` to your exact Vercel URL |
| Atlas timeout | Allow `0.0.0.0/0` in Atlas Network Access; check URI password |
| Calls go to `localhost:5000` | You're in local dev, or `NEXT_PUBLIC_API_URL` is set incorrectly on Vercel |
| Uploaded images vanish | Link Vercel Blob store to the project and redeploy (sets `BLOB_READ_WRITE_TOKEN`) |
