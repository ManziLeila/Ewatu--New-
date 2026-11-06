# Deploy E-Watu ERP on Coolify

This guide deploys the full stack (Postgres, MinIO, microservices, React SPA, API gateway) as a **single Docker Compose** application on [Coolify](https://coolify.io).

## Architecture

```
Internet → Coolify Proxy (HTTPS) → gateway:80
                                      ├── /          → React SPA (static)
                                      └── /api/v1/*  → microservices
postgres, minio (private, no public ports)
```

Only the **gateway** service is public. Everything else stays on the internal Docker network.

## Prerequisites

- A Coolify server (v4+) with Docker
- Git access to this repository (GitLab/GitHub)
- A domain pointed at your Coolify server (e.g. `erp.yourcompany.com`)
- Real email: SMTP or [Resend](https://resend.com) API key (see **Real email** below)

## 1. Generate secrets (on your laptop)

```bash
cd hc-erp
./scripts/generate-jwt-keys.sh
```

Copy the printed `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, and generate a long random `INTERNAL_API_KEY` (e.g. `openssl rand -hex 32`).

**New to deploying?** Follow [docs/deploy-step-by-step.md](docs/deploy-step-by-step.md) end-to-end (server + Coolify + GitHub without Actions).

## 2. Create the Coolify resource

1. **+ New** → **Docker Compose** → connect your Git repository.
2. **Branch:** `main` (or your deploy branch).
3. **Docker Compose location:** `docker-compose.coolify.yml`
4. **Build pack:** Docker Compose (not “Raw” unless you manage Traefik labels yourself).

## 3. Environment variables

Open **Environment Variables** and add everything from [`coolify/env.example`](coolify/env.example).

| Variable | Example | Notes |
|----------|---------|--------|
| `APP_URL` | `https://erp.example.com` | No trailing slash; used for CORS and Vite build |
| `JWT_ISSUER` | `https://erp.example.com/auth` | Must match token issuer |
| `JWT_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\n...` | Identity only; use literal mode in Coolify |
| `JWT_PUBLIC_KEY` | `-----BEGIN PUBLIC KEY-----\n...` | All services |
| `INTERNAL_API_KEY` | random 32+ chars | Same value everywhere |
| `POSTGRES_PASSWORD` | strong password | |
| `MINIO_ROOT_PASSWORD` | strong password | Also used as `S3_SECRET_KEY` |

Coolify shows variables defined as `${VAR:?}` in the compose file — fill all required ones before deploy.

**Tip:** For PEM keys and passwords with `$`, enable **Is Literal** in Coolify.

## 4. Assign the domain

After Coolify parses the compose file:

1. Open the **gateway** service.
2. Set **Domain** to `https://erp.example.com` (container listens on port **80**).
3. Enable **HTTPS** (Let’s Encrypt) in Coolify.

Do **not** publish host ports for postgres/minio unless you intentionally want them exposed.

## 5. Deploy

Click **Deploy**. On first boot:

- Postgres creates databases from `infra/docker/init-db.sql`.
- Each Prisma service runs `prisma migrate deploy` on startup.
- Document service creates the S3 bucket if missing.

Watch logs for `identity-service`, `platform-service`, `recruitment-service`, and `notification-service` until all show “listening”.

## 6. First tenant and admin user

Production images do not include dev seed tooling. Typical options:

1. **Onboarding** — If a platform tenant already exists, open `https://erp.example.com/onboarding` and complete tenant-owner setup (see platform-service docs).
2. **Seed from your laptop** (one-time, against production DB) — Tunnel to Postgres or temporarily expose port 5432, then from the repo:

   ```bash
   # Set DATABASE_URL to each DB, then:
   npm run db:seed:dev
   ```

3. **Manual SQL / API** — Create tenant in `platform_db` and user in `identity_db` per service READMEs.

Rotate `INTERNAL_API_KEY` and JWT keys before any production launch if they were ever committed or shared.

## Real email (verification, password reset, tenant approval)

All outbound mail goes through **notification-service** only. Other services call its internal `dispatch` API.

1. **Pick a provider**
   - **SMTP** — Gmail (App Password), Microsoft 365, Brevo, SendGrid, your host’s relay.
   - **Resend** — set `RESEND_API_KEY` on notification-service; verify your domain and set `RESEND_FROM_ADDRESS`. Without a verified domain, Resend sandbox only delivers to the email on your Resend account.

2. **Set variables on notification-service** (Coolify env or `services/notification-service/.env`):

   | Variable | Purpose |
   |----------|---------|
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | SMTP sending (or leave `SMTP_HOST` empty if using Resend) |
   | `RESEND_API_KEY`, `RESEND_FROM_ADDRESS` | Resend instead of SMTP |
   | `MAIL_FROM_NAME`, `MAIL_FROM_ADDRESS` / `EMAIL_FROM` | From header (must be allowed by your provider) |

3. **Link URLs in emails** must point at your live site:
   - **identity-service:** `CORS_ORIGIN=https://erp.yourdomain.com` (first value is used for verify + reset links)
   - **platform-service:** `WEB_APP_ORIGIN=https://erp.yourdomain.com` (approval / login links)

4. **Ensure dispatch works:** on identity and platform, `NOTIFICATION_SERVICE_URL` must reach notification-service (e.g. `http://notification-service:3015` on the Docker network) and `INTERNAL_API_KEY` must match everywhere.

5. **Redeploy** notification-service and watch logs for `[EmailService] SMTP configured` or `Resend configured`. Trigger a **Resend verification** or **Forgot password** to test.

Local dev: keep Mailpit (`SMTP_HOST=127.0.0.1`, `SMTP_PORT=1025` after `npm run db:up`) or paste the same production SMTP/Resend vars into `services/notification-service/.env` to test real delivery.

## 7. Verify

- `https://erp.example.com` — login page loads
- `https://erp.example.com/health` — `{"status":"ok","service":"e-watu-gateway"}`
- `https://erp.example.com/api/v1/identity/health` — identity health (via gateway)
- Public careers: `https://erp.example.com/apply/<tenant-slug>`

## Optional: external Postgres

To use Coolify’s managed Postgres instead of the bundled container:

1. Deploy a Postgres database in Coolify.
2. Remove or disable the `postgres` service in a forked compose file.
3. Set each service `DATABASE_URL` to the external connection string.
4. Run migrations once manually if you disable the entrypoint migrate.

## Optional: external S3

Replace MinIO by pointing `document-service` at AWS S3 or another provider:

```env
S3_ENDPOINT=https://s3.amazonaws.com
S3_REGION=eu-west-1
S3_BUCKET=your-bucket
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
```

Remove the `minio` service and update `depends_on` for `document-service`.

## Updating the app

Push to Git → Coolify **Redeploy**. Migrations run automatically on service restart.

## Troubleshooting

| Symptom | Check |
|---------|--------|
| 502 on domain | Gateway not healthy; `docker logs` on gateway and upstream services |
| Login fails / invalid token | `JWT_ISSUER` must match `APP_URL/auth`; keys identical on all services |
| CORS errors | `APP_URL` must exactly match browser URL (scheme + host) |
| Emails not sent | notification-service: set `SMTP_*` or `RESEND_API_KEY`; check `NOTIFICATION_SERVICE_URL` + `INTERNAL_API_KEY` on identity/platform; logs show `console` if unset |
| Uploads fail | MinIO up; `S3_BUCKET`; check document-service logs |
| DB connection refused | Postgres healthcheck; `POSTGRES_PASSWORD` in all `DATABASE_URL`s |

## Local production smoke test

```bash
cp deploy/coolify/env.example .env.coolify
# Edit .env.coolify with real values
docker compose --env-file .env.coolify -f docker-compose.coolify.yml up --build
```

Open `http://localhost` only if you map gateway ports locally (add `ports: ["8080:80"]` temporarily on `gateway` for testing).

## Files reference

| File | Purpose |
|------|---------|
| `docker-compose.coolify.yml` | Coolify compose source of truth |
| `gateway/Dockerfile.prod` | SPA build + nginx |
| `gateway/nginx.prod.conf` | Routes + static files |
| `deploy/coolify/env.example` | Variable template |
| `infra/docker/service-entrypoint.sh` | Auto-migrate on start |
