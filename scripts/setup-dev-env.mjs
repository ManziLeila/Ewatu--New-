#!/usr/bin/env node
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pubPem = join(root, 'public.pem');
const privPem = join(root, 'private.pem');

if (!existsSync(pubPem) || !existsSync(privPem)) {
  console.error('Missing public.pem / private.pem at repo root.');
  console.error('Generate with: openssl genrsa -out private.pem 2048 && openssl rsa -in private.pem -pubout -out public.pem');
  process.exit(1);
}

const pub = readFileSync(pubPem, 'utf8').trim().replace(/\n/g, '\\n');
const priv = readFileSync(privPem, 'utf8').trim().replace(/\n/g, '\\n');
const internalKey = 'dev-internal-api-key-change-in-prod';
const db = (name) => `postgresql://ewatu:ewatu_dev@127.0.0.1:15432/${name}`;

const files = {
  'services/identity-service/.env': `PORT=3011
SERVICE_NAME=identity-service
DATABASE_URL=${db('identity_db')}
JWT_PRIVATE_KEY=${priv}
JWT_PUBLIC_KEY=${pub}
JWT_ISSUER=http://localhost:3011/auth
JWT_EXPIRES_IN=15m
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
INTERNAL_API_KEY=${internalKey}
PLATFORM_SERVICE_URL=http://127.0.0.1:3012
`,
  'services/platform-service/.env': `PORT=3012
SERVICE_NAME=platform-service
DATABASE_URL=${db('platform_db')}
JWT_PUBLIC_KEY=${pub}
JWT_ISSUER=http://localhost:3011/auth
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
INTERNAL_API_KEY=${internalKey}
IDENTITY_SERVICE_URL=http://127.0.0.1:3011
NOTIFICATION_SERVICE_URL=http://127.0.0.1:3015
WEB_APP_ORIGIN=http://localhost:5173
ONBOARDING_DEV_HINTS=true
`,
  'services/recruitment-service/.env': `PORT=3013
SERVICE_NAME=recruitment-service
DATABASE_URL=${db('recruitment_db')}
JWT_PUBLIC_KEY=${pub}
JWT_ISSUER=http://localhost:3011/auth
JWT_EXPIRES_IN=15m
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
PLATFORM_SERVICE_URL=http://127.0.0.1:3012
INTERNAL_API_KEY=${internalKey}
NOTIFICATION_SERVICE_URL=http://127.0.0.1:3015
DOCUMENT_SERVICE_URL=http://127.0.0.1:3018
`,
  'services/notification-service/.env': `PORT=3015
SERVICE_NAME=notification-service
DATABASE_URL=${db('notifications_db')}
JWT_PUBLIC_KEY=${pub}
JWT_ISSUER=http://localhost:3011/auth
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
INTERNAL_API_KEY=${internalKey}
EMAIL_FROM=noreply@ewatu.local
MAIL_FROM_NAME=E-Watu
MAIL_FROM_ADDRESS=noreply@ewatu.local
# Local dev: Mailpit (npm run db:up) — inbox at http://localhost:8025
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_SECURE=false
# Production: replace with real SMTP (e.g. Gmail, SendGrid)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
`,
  'services/document-service/.env': `PORT=3018
SERVICE_NAME=document-service
JWT_PUBLIC_KEY=${pub}
JWT_ISSUER=http://localhost:3011/auth
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
S3_ENDPOINT=http://127.0.0.1:19000
S3_REGION=us-east-1
S3_BUCKET=ewatu-dev
S3_ACCESS_KEY=ewatu
S3_SECRET_KEY=ewatu_dev_minio
`,
  'services/talent-pool-service/.env': `DATABASE_URL=${db('talent_pool_db')}
JWT_PUBLIC_KEY=${pub}
JWT_ISSUER=http://localhost:3011/auth
SERVICE_NAME=talent-pool-service
NODE_ENV=development
PORT=3014
INTERNAL_API_KEY=${internalKey}
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
`,
  'services/payroll-service/.env': `DATABASE_URL=${db('payroll_db')}
JWT_PUBLIC_KEY=${pub}
JWT_ISSUER=http://localhost:3011/auth
SERVICE_NAME=payroll-service
NODE_ENV=development
PORT=3016
INTERNAL_API_KEY=${internalKey}
NOTIFICATION_SERVICE_URL=http://127.0.0.1:3015
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
`,
};

for (const [rel, body] of Object.entries(files)) {
  writeFileSync(join(root, rel), body);
  console.log(`wrote ${rel}`);
}

const webEnv = join(root, 'web/.env');
const webEnvBody = `# Gateway mode (docker compose full stack only). Leave unset for npm run dev.
# VITE_API_URL=http://localhost

# Direct service ports (local npm run dev):
VITE_PLATFORM_API=http://localhost:3012
VITE_IDENTITY_API=http://localhost:3011
VITE_RECRUITMENT_API=http://localhost:3013
VITE_TALENT_POOL_API=http://localhost:3014
VITE_PAYROLL_API=http://localhost:3016
VITE_NOTIFICATION_API=http://localhost:3015
VITE_DOCUMENT_API=http://localhost:3018
`;
writeFileSync(webEnv, webEnvBody);
console.log('wrote web/.env');

console.log('\nDone. Next: npm run db:up && npm run db:generate:all && npm run db:migrate:all && npm run db:seed:dev && npm run dev');
