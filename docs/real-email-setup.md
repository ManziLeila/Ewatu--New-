# Real email (activation, password reset, approvals)

E-Watu sends mail only through **notification-service**. Company signup and **Resend activation email** on the login page require this to be configured.

## 1. Choose a provider

| Provider | Best for | Notes |
|----------|----------|--------|
| **[Resend](https://resend.com)** | Fastest setup | Free tier; verify domain for any recipient. Sandbox (`onboarding@resend.dev`) only delivers to **your Resend account email**. |
| **Gmail SMTP** | Quick personal testing | [App password](https://myaccount.google.com/apppasswords); `MAIL_FROM_ADDRESS` = that Gmail address. |
| **Microsoft 365 / Brevo / SendGrid** | Production | SMTP on port 587 typical. |

## 2. Configure `services/notification-service/.env`

Copy from `env.example` if you do not have `.env` yet.

### Option A — Resend (recommended)

```env
# Remove or comment out Mailpit lines:
# SMTP_HOST=127.0.0.1
# SMTP_PORT=1025

RESEND_API_KEY=re_xxxxxxxx
RESEND_FROM_ADDRESS=onboarding@resend.dev
MAIL_FROM_NAME=E-Watu
MAIL_FROM_ADDRESS=onboarding@resend.dev
EMAIL_FROM=onboarding@resend.dev
```

Until you verify a domain in Resend, activation emails only arrive at the **email on your Resend account**. After domain verification, set `RESEND_FROM_ADDRESS=noreply@yourdomain.com`.

### Option B — Gmail SMTP

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@gmail.com
SMTP_PASS=xxxx-xxxx-xxxx-xxxx
MAIL_FROM_NAME=E-Watu
MAIL_FROM_ADDRESS=you@gmail.com
EMAIL_FROM=you@gmail.com
```

## 3. Identity must reach notification-service

In `services/identity-service/.env` (and platform-service for approval emails):

```env
NOTIFICATION_SERVICE_URL=http://127.0.0.1:3015
INTERNAL_API_KEY=<same value as notification-service>
```

## 4. Verification links must match the web app

In `services/identity-service/.env`:

```env
CORS_ORIGIN=http://127.0.0.1:5173
```

Links in emails look like: `http://127.0.0.1:5173/verify-email?token=...`

On a deployed server, use your real HTTPS app URL (see [COOLIFY.md](../COOLIFY.md) → Real email).

## 5. Restart dev

```powershell
cmd /c "npm run dev"
```

Watch notification-service logs for `[EmailService] Resend configured` or `SMTP configured`.

## 6. How notifications work

- **Auth** (verify email, password reset) always sends email.
- **HR / payroll / recruitment** events send email when the recipient has an **email address** (employee, candidate, or user account).
- The app **also** keeps in-app notifications when the recipient has a login.
- Notification-service resolves missing addresses from `userId` via identity-service (`IDENTITY_SERVICE_URL`).

Every user should have a **work email** on their employee profile (or login email) so alerts are delivered.

## 7. Test

1. Register a company with a **real inbox you can open**.
2. Or on login, use **Resend activation email** for an unverified account.
3. Open the link in the email, then sign in.

If nothing arrives: check spam, Resend dashboard logs, and notification-service terminal for errors.

## Mailpit (optional)

Use only when you **do not** want real mail:

```env
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
```

Inbox: http://localhost:8025 (requires `npm run db:up`).
