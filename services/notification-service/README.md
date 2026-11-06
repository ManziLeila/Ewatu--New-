# Notification Service

## What this service does

SMTP email (verify, approve, reject templates) and in-app notifications. Internal `dispatch` is processed asynchronously.

## Port

Runs on port: **3015**

## Running locally

```bash
cd services/notification-service
npm install
npx prisma migrate deploy
npm run start:dev
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | Yes | PostgreSQL |
| JWT_PUBLIC_KEY | Yes | RS256 public PEM |
| INTERNAL_API_KEY | Yes | Internal dispatch auth |
| SMTP_HOST | No* | Real SMTP; if empty and no Resend key, emails log to console |
| SMTP_PORT / SMTP_SECURE / SMTP_USER / SMTP_PASS | With SMTP | Typical: 587, `false`, user + app password |
| RESEND_API_KEY | No* | Alternative to SMTP; verify domain + `RESEND_FROM_ADDRESS` for production |
| MAIL_FROM_NAME / MAIL_FROM_ADDRESS / EMAIL_FROM | Yes | From header (must match verified domain) |

\* Configure **either** SMTP **or** Resend on this service only.

## API endpoints

- `POST /api/v1/internal/dispatch`
- `GET /api/v1/notifications` (JWT)
- `PATCH /api/v1/notifications/:id/read`
- `GET /api/v1/notifications/health`

## Running tests

```bash
npm test
```
