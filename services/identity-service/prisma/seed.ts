import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const DEV_PASSWORD = 'DevPassword12!';
const BCRYPT_ROUNDS = 12;

async function demoTenantId(): Promise<string | null> {
  try {
    const platformPrisma = new PrismaClient({
      datasources: {
        db: {
          url: 'postgresql://ewatu:ewatu_dev@127.0.0.1:15432/platform_db',
        },
      },
    });
    const result = await platformPrisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Tenant" WHERE slug = 'demo-tenant' LIMIT 1
    `;
    await platformPrisma.$disconnect();
    return result[0]?.id || null;
  } catch (err) {
    return null;
  }
}

async function main() {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, BCRYPT_ROUNDS);

  await prisma.user.upsert({
    where: { email: 'admin@ewatu.dev' },
    update: {
      passwordHash,
      emailVerified: true,
      roles: ['PLATFORM_SUPER_ADMIN'],
      emailVerificationToken: null,
      tenantId: null,
    },
    create: {
      email: 'admin@ewatu.dev',
      passwordHash,
      displayName: 'Dev Platform Admin',
      roles: ['PLATFORM_SUPER_ADMIN'],
      emailVerified: true,
    },
  });

  const tenantId = await demoTenantId();
  await prisma.user.upsert({
    where: { email: 'tenant@ewatu.dev' },
    update: {
      passwordHash,
      emailVerified: true,
      roles: ['TENANT_ADMIN'],
      emailVerificationToken: null,
      ...(tenantId ? { tenantId } : {}),
    },
    create: {
      email: 'tenant@ewatu.dev',
      passwordHash,
      displayName: 'Demo Company Admin',
      roles: ['TENANT_ADMIN'],
      emailVerified: true,
      tenantId: tenantId ?? undefined,
    },
  });

  await prisma.user.upsert({
    where: { email: 'grace.mukamana@ewatu.dev' },
    update: {
      passwordHash,
      emailVerified: true,
      roles: ['TENANT_STAFF'],
      emailVerificationToken: null,
      ...(tenantId ? { tenantId } : {}),
    },
    create: {
      email: 'grace.mukamana@ewatu.dev',
      passwordHash,
      displayName: 'Grace Mukamana',
      roles: ['TENANT_STAFF'],
      emailVerified: true,
      tenantId: tenantId ?? undefined,
    },
  });

  await prisma.user.upsert({
    where: { email: 'md@ewatu.dev' },
    update: {
      passwordHash,
      emailVerified: true,
      roles: ['MANAGING_DIRECTOR'],
      emailVerificationToken: null,
      ...(tenantId ? { tenantId } : {}),
    },
    create: {
      email: 'md@ewatu.dev',
      passwordHash,
      displayName: 'Jean Mukamana (MD)',
      roles: ['MANAGING_DIRECTOR'],
      emailVerified: true,
      tenantId: tenantId ?? undefined,
    },
  });

  await prisma.user.upsert({
    where: { email: 'finance@ewatu.dev' },
    update: {
      passwordHash,
      emailVerified: true,
      roles: ['FINANCE_OFFICER'],
      emailVerificationToken: null,
      ...(tenantId ? { tenantId } : {}),
    },
    create: {
      email: 'finance@ewatu.dev',
      passwordHash,
      displayName: 'Alice Uwineza',
      roles: ['FINANCE_OFFICER'],
      emailVerified: true,
      tenantId: tenantId ?? undefined,
    },
  });

  await prisma.user.upsert({
    where: { email: 'hr.manager@ewatu.dev' },
    update: {
      passwordHash,
      emailVerified: true,
      roles: ['HR_MANAGER'],
      emailVerificationToken: null,
      ...(tenantId ? { tenantId } : {}),
    },
    create: {
      email: 'hr.manager@ewatu.dev',
      passwordHash,
      displayName: 'Dev HR Manager',
      roles: ['HR_MANAGER'],
      emailVerified: true,
      tenantId: tenantId ?? undefined,
    },
  });

  console.log('\nDev login accounts (local only):\n');
  console.log('  Platform admin → admin@ewatu.dev / DevPassword12!');
  console.log('  Company admin  → tenant@ewatu.dev / DevPassword12!');
  console.log('  Managing Dir.  → md@ewatu.dev / DevPassword12!');
  console.log('  HR manager     → hr.manager@ewatu.dev / DevPassword12!');
  console.log('  Finance        → finance@ewatu.dev / DevPassword12!');
  console.log('  Employee       → grace.mukamana@ewatu.dev / DevPassword12! (payroll employee linked after payroll seed)');
  console.log('\n  After seeds: npm run prisma:seed --prefix services/payroll-service');
  console.log('               npm run prisma:seed --prefix services/recruitment-service');
  if (!tenantId) {
    console.log('\n  (Run platform seed for demo-tenant to link these accounts to a company.)\n');
  } else {
    console.log(`\n  Linked to demo-tenant (${tenantId})\n`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
