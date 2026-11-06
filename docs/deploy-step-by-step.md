# Step-by-step deploy (your server, no GitHub Actions)

This guide assumes you are **not** a DevOps expert. You use **GitHub for code** and **Coolify on your VPS** to run the app. GitHub Actions is **not** required.

---

## Big picture

```text
Your PC                          GitHub                         Your VPS (Coolify)
────────                         ──────                         ──────────────────
npm run dev  ──push──►  development  (daily work)
                        │
                        └── merge ──►  UAT  ──webhook/deploy──►  UAT site (test)
                                      │
                                      └── merge ──►  main ──►  Production site
```

| Branch on GitHub | Who uses it | Server |
|------------------|-------------|--------|
| `development` | Developers | Laptops only |
| `UAT` | QA / you before go-live | Staging URL on your VPS |
| `main` | Real users | Production URL on your VPS |

**Database:** Postgres and MinIO (files) live **on the VPS**, inside Docker — not on your laptop.

---

## Recommended path (no purchased domain yet)

Use this until you buy a real domain. It stays **secure enough for UAT** and switching later is **only env + redeploy** (no code rewrite).

### What we recommend

| Phase | URL | HTTPS | Purpose |
|-------|-----|-------|---------|
| **Now (UAT)** | Free **DuckDNS** hostnames → your VPS IP | Yes (Coolify + Let’s Encrypt) | Team testing |
| **Later (production)** | `app.yourcompany.com` you buy | Yes | Customers / go-live |

**Do not** rely on “free TLD” domains (`.tk`, `.ml`, etc.) — poor deliverability, often revoked, bad for email reputation.

**Do not** expose Postgres, MinIO, or Coolify `:8000` to the whole internet without protection (see security checklist below).

### DuckDNS setup (free, good for UAT)

1. Create account at [duckdns.org](https://www.duckdns.org).
2. Create two subdomains pointing to your VPS IP, e.g.:
   - `ewatu-uat` → `ewatu-uat.duckdns.org`
   - `ewatu-uat-api` → `ewatu-uat-api.duckdns.org`
3. In Coolify, assign domains:
   - **web** → `https://ewatu-uat.duckdns.org`
   - **gateway** → `https://ewatu-uat-api.duckdns.org`
4. Set env (UAT):

   ```env
   CORS_ORIGIN=https://ewatu-uat.duckdns.org
   WEB_APP_ORIGIN=https://ewatu-uat.duckdns.org
   VITE_API_URL=https://ewatu-uat-api.duckdns.org
   JWT_ISSUER=https://ewatu-uat-api.duckdns.org/auth
   ```

5. Redeploy **web** after any `VITE_API_URL` change.

When you **buy a domain**, change those four (+ email DNS if using Resend), enable HTTPS on the new names in Coolify, redeploy. You can **retire DuckDNS**; no need to “transfer” the free name.

### Security checklist (with or without a bought domain)

1. **Firewall (VPS):** allow **22** (SSH), **80**, **443**; deny public access to **5432**, **9000**, Coolify **8000** unless you IP-restrict admin.
2. **SSH:** keys only, disable password login when comfortable.
3. **Secrets:** generate fresh `INTERNAL_API_KEY`, JWT keys, DB passwords on the server — never reuse `ewatu_dev` from local Docker.
4. **Coolify admin:** strong password; ideally open `:8000` only from your office IP or VPN.
5. **Branches:** keep **`main`** off the public internet until you have a real domain and production secrets; use **`UAT`** on DuckDNS first.
6. **Email:** use Resend/SMTP with a verified domain when you go live; until then sandbox or Mailpit-style testing is OK on UAT.

### If you skip DuckDNS temporarily

Plain `http://YOUR_IP` works for a **private** smoke test only — no proper HTTPS, awkward JWT/CORS, not suitable for real users. Prefer DuckDNS (or buy the domain early) instead of staying on raw IP.

---

## Part 1 — One-time: prepare domain and server

### Step 1 — Point DNS to your server (when you have a bought domain)

At your domain registrar (Namecheap, Cloudflare, etc.):

| Type | Name | Value |
|------|------|--------|
| A | `@` or `app` | Your VPS public IP |
| A | `api` | Same IP (for the API gateway) |
| A | `uat` | Same IP (optional UAT frontend) |
| A | `api-uat` | Same IP (optional UAT API) |

Wait 5–30 minutes for DNS to propagate.

Example URLs:

- UAT app: `https://uat.yourcompany.com`
- UAT API: `https://api-uat.yourcompany.com`
- Production app: `https://app.yourcompany.com`
- Production API: `https://api.yourcompany.com`

### Step 2 — Server requirements

- Ubuntu 22.04 or 24.04 VPS (2 GB RAM minimum; **4 GB+** recommended for first deploy)
- Root or sudo SSH access
- Ports **80** and **443** open in the cloud firewall

### Step 3 — Install Coolify (on the server, once)

SSH in from PowerShell:

```powershell
ssh root@YOUR_SERVER_IP
```

On the server:

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash
```

Open Coolify in the browser: `http://YOUR_SERVER_IP:8000`, create the admin account, and finish the wizard.

### Step 4 — Connect GitHub to Coolify (no Actions)

1. In Coolify: **Sources** → **GitHub** → connect (OAuth or deploy key).
2. Grant access to repo: `ManziLeila/e-watu-hr` (or your fork).

Coolify will **clone and build** on deploy. That replaces GitHub Actions.

---

## Part 2 — One-time: database and file storage on the VPS

The file `docker-compose.coolify.yml` runs **apps only**. You add **Postgres** and **MinIO** (or S3) once per environment (UAT vs production).

### Step 5 — PostgreSQL in Coolify

1. **+ New** → **Database** → **PostgreSQL** (version 16 if offered).
2. Name it e.g. `ewatu-postgres-uat`.
3. Save the **internal hostname**, **user**, and **password** from Coolify (not the public IP).

Create all app databases (one-time). In Coolify, open the Postgres **Terminal** or SSH and run the SQL from the repo [`docker/init-db.sql`](../docker/init-db.sql):

```sql
CREATE DATABASE platform_db;
CREATE DATABASE identity_db;
CREATE DATABASE recruitment_db;
CREATE DATABASE talent_pool_db;
CREATE DATABASE payroll_db;
CREATE DATABASE notifications_db;
CREATE DATABASE lending_db;
```

Build connection strings (repeat for each `*_DATABASE_URL`):

```text
postgresql://USER:PASSWORD@INTERNAL_POSTGRES_HOST:5432/identity_db
postgresql://USER:PASSWORD@INTERNAL_POSTGRES_HOST:5432/platform_db
… (same host/user/pass, different database name)
```

Use Coolify’s **internal** hostname (e.g. `postgres-abc123`), not `localhost`.

For **production**, create a **second** Postgres resource (or separate server) so UAT never shares prod data.

### Step 6 — MinIO (file uploads) in Coolify

1. **+ New** → **Service** → **Docker Image** (or small compose): `minio/minio`.
2. Command: `server /data --console-address ":9001"`.
3. Set root user/password; attach a **volume** for `/data`.
4. On **document-service** env:

```env
S3_ENDPOINT=http://INTERNAL_MINIO_HOST:9000
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_BUCKET=ewatu-prod
S3_REGION=us-east-1
```

Later you can switch to AWS S3 by changing these variables only.

---

## Part 3 — One-time: deploy the UAT app in Coolify

Do this twice later (UAT project + Production project). Start with **UAT**.

### Step 7 — Create Docker Compose application

1. **+ New** → **Docker Compose** → select GitHub repo `e-watu-hr`.
2. **Branch:** `UAT`.
3. **Compose file:** `docker-compose.coolify.yml`.
4. **Build:** Coolify builds each service Dockerfile on deploy.

### Step 8 — Environment variables (copy from template)

Open [`coolify/env.example`](../coolify/env.example) and set **every** value in Coolify **Environment Variables** for this app.

Critical groups:

| Group | Examples |
|-------|----------|
| URLs | `CORS_ORIGIN=https://uat.yourcompany.com`, `WEB_APP_ORIGIN` same, `VITE_API_URL=https://api-uat.yourcompany.com` |
| JWT | `JWT_ISSUER=https://api-uat.yourcompany.com/auth`, `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY` (see below) |
| Security | `INTERNAL_API_KEY` (long random), `ENCRYPTION_KEY` (payroll) |
| Databases | `IDENTITY_DATABASE_URL`, `PLATFORM_DATABASE_URL`, … |
| Email | `SMTP_*` or `RESEND_API_KEY` on notification-service vars |
| S3 | `S3_*` for document-service |

Generate JWT keys on your PC (Git Bash or WSL):

```bash
cd /path/to/e-watu
bash scripts/generate-jwt-keys.sh
```

Generate internal API key:

```bash
openssl rand -hex 32
```

In Coolify, mark PEM keys and passwords as **Is Literal** so `$` is not interpreted.

Service URLs inside Docker (defaults in compose often work):

```env
IDENTITY_SERVICE_URL=http://identity-service:3011
PLATFORM_SERVICE_URL=http://platform-service:3012
NOTIFICATION_SERVICE_URL=http://notification-service:3015
```

**identity-service** must also have `NOTIFICATION_SERVICE_URL` and `PLATFORM_SERVICE_URL` — add them in Coolify if not in compose (extend env in dashboard per service).

### Step 9 — Public domains (two services)

`docker-compose.coolify.yml` exposes:

- **gateway** — all `/api/v1/*` traffic → assign `https://api-uat.yourcompany.com`, port **80**, HTTPS on.
- **web** — React UI → assign `https://uat.yourcompany.com`, port **80**, HTTPS on.

Do **not** expose Postgres or MinIO to the public internet.

### Step 10 — First deploy

1. Click **Deploy** in Coolify.
2. First build can take **15–30 minutes**.
3. Watch logs: `identity-service`, `platform-service`, `postgres migrations`, `document-service` (S3).

Check:

- `https://api-uat.yourcompany.com/health` → gateway OK
- `https://uat.yourcompany.com` → login page
- Real email: see [COOLIFY.md](../COOLIFY.md) → **Real email**

Create first tenant via onboarding or one-time seed (see COOLIFY.md §6).

---

## Part 4 — Every time you ship a change (easy routine)

### On your Windows PC

1. Work on branch `development`, test locally:

   ```powershell
   cmd /c "npm run db:up"
   cmd /c "npm run dev"
   ```

2. Before merging to UAT, quick sanity check:

   ```powershell
   cmd /c "npm run db:generate:all"
   cmd /c "npm run build:web"
   ```

3. Push `development` to GitHub.

4. On GitHub: **Pull request** `development` → `UAT` → **Merge**.

### On the server (UAT)

**Option A — Coolify button (easiest)**  
Open the UAT app in Coolify → **Deploy** (or enable **Auto Deploy** on push).

**Option B — GitHub webhook (automatic)**  
Coolify → your app → **Webhooks** → copy URL → GitHub repo **Settings → Webhooks** → push events to `UAT`.  
No GitHub Actions involved.

**Option C — SSH one-liner from your PC**

```powershell
ssh deploy@YOUR_SERVER_IP "cd /var/www/e-watu-uat && git pull origin UAT && ..."
```

Prefer Coolify rebuild (Options A/B) over raw git pull unless you use [deploy-on-server.sh](../scripts/deploy-on-server.sh) with Docker on the host.

5. Test on `https://uat.yourcompany.com`.

6. When UAT is good: PR **UAT** → **main**, then **Deploy** the **production** Coolify app (branch `main`).

---

## Part 5 — Production duplicate

Repeat Part 2–3 with:

- New Postgres + MinIO (or isolated buckets)
- Coolify app name `e-watu-production`, branch **`main`**
- Production domains and secrets (**never** reuse UAT `INTERNAL_API_KEY` / JWT keys if you can avoid it)

---

## Part 6 — What GitHub Actions was supposed to do

| CI job | You do instead |
|--------|----------------|
| Build | Coolify on deploy |
| Migrate DB | Service containers run `prisma migrate deploy` on start |
| Deploy | Coolify **Deploy** or webhook |
| Lint/test | Run locally before merging to UAT (optional) |

---

## Troubleshooting

| Problem | What to check |
|---------|----------------|
| 502 Bad Gateway | Coolify logs for `gateway` and upstream service |
| Login / token errors | `JWT_ISSUER` = `https://YOUR-API-DOMAIN/auth` on **all** services |
| CORS | `CORS_ORIGIN` = exact browser URL (https, no trailing slash) |
| API calls fail from browser | `VITE_API_URL` must be **API** domain; rebuild **web** after changing it |
| Emails | notification-service SMTP/Resend; identity `NOTIFICATION_SERVICE_URL` |
| Uploads | MinIO running; `S3_*` on document-service |

More detail: [COOLIFY.md](../COOLIFY.md), [deploy-without-github-actions.md](./deploy-without-github-actions.md).

---

## Cheat sheet (print this)

```text
Develop     →  push development
Release UAT →  merge PR to UAT  →  Coolify Deploy (UAT app)
Go live     →  merge PR to main →  Coolify Deploy (prod app)
Secrets     →  Coolify env only, never commit .env
DB          →  on VPS Postgres, not your laptop
```
