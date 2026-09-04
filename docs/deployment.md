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
| `CRON_SECRET` | Long random string. Vercel Cron and Postman send `Authorization: Bearer <CRON_SECRET>` (or `x-cron-secret`). Required in production even for Postman. |

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
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4 measurement ID (`G-…`); loads only after cookie consent |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL for SEO (`https://your-domain.com`) |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |
| `SMTP_USER` | Gmail address |
| `SMTP_PASS` | Gmail App Password |
| `SMTP_FROM` | Gmail address |
| `STRIPE_SECRET_KEY` | Stripe backend |
| `STRIPE_PUBLISHABLE_KEY` | Stripe frontend (if needed) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (see Stripe webhooks below) |
| `BLOB_READ_WRITE_TOKEN` | Auto-set when Blob store is linked to the Vercel project |

**Cron retention** lives in `backend/jobs/purgePolicy.js` (not env). Those numbers are “delete if older than N days”, not “run every N days”. The job already runs daily at 02:00 UTC. `pendingCheckoutSettledDays` (30) only removes **completed** checkout snapshots after an order exists. Abandoned `pending` / `failed` / `expired` rows are recovered against Stripe first, then deleted after `pendingCheckoutDays` (15). Guest OTP leftovers (no live code) are removed after `guestOtpDays` (2); expired codes still drop as soon as `otpExpires` passes. Each run is stored in the `cronruns` collection.

You do **not** need `NEXT_PUBLIC_API_URL` on Vercel — frontend and API share the same domain, so requests go to `/api/...` automatically.

Each purge is its own GET/POST route so you can run them from Postman:

| Method | Path |
|---|---|
| GET/POST | `/api/cron` (lists jobs) |
| GET/POST | `/api/cron/purge-pending-emails` |
| GET/POST | `/api/cron/purge-expired-otps` |
| GET/POST | `/api/cron/purge-reset-tokens` |
| GET/POST | `/api/cron/purge-guest-otps` |
| GET/POST | `/api/cron/purge-pending-checkouts` |
| GET/POST | `/api/cron/purge-email-logs` |
| GET/POST | `/api/cron/purge-notifications` |
| GET/POST | `/api/cron/purge-old-data` (all of the above) |

Pass `?dryRun=1` or JSON `{ "dryRun": true }` to count without deleting. Vercel runs `/api/cron/purge-old-data` daily at 02:00 UTC. Local Postman needs no secret when `CRON_SECRET` is empty; production always needs `CRON_SECRET`.

On multiple backend instances (Node cluster, PM2, Kubernetes), **only one instance runs a given job**. Vercel Cron sends a single HTTP request. If several processes still try to run at once, a Mongo lock skips the extras (`skipped: true`). Dry-runs do not take the lock.

### Stripe webhooks (required for live card / Apple Pay)

MOTD saves a **PendingCheckout** snapshot when a PaymentIntent is created. If the customer’s browser closes after Stripe charges them but before the order POST finishes, the webhook (or `/api/payments/reconcile`) still creates the order.

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**
2. URL: `https://your-app.vercel.app/api/payments/webhook`
3. Events to send:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded` (optional logging)
4. Copy the endpoint **Signing secret** → set `STRIPE_WEBHOOK_SECRET` on Vercel → redeploy

**Local testing:**
```bash
stripe listen --forward-to localhost:5000/api/payments/webhook
```
Put the CLI `whsec_…` value into `backend/.env` as `STRIPE_WEBHOOK_SECRET`.

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
