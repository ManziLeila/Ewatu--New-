import { PrismaClient } from '@prisma/client';
import { DEMO_TENANT_DEFAULT_MODULES } from '@ewatu/module-sdk';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-tenant' },
    update: { name: 'HC Solutions' },
    create: {
      name: 'HC Solutions',
      slug: 'demo-tenant',
      status: 'ACTIVE',
      plan: 'enterprise',
      country: 'RW',
    },
  });

  for (const moduleId of DEMO_TENANT_DEFAULT_MODULES) {
    await prisma.tenantModuleEntitlement.upsert({
      where: {
        tenantId_moduleId: { tenantId: tenant.id, moduleId },
      },
      create: { tenantId: tenant.id, moduleId, enabled: true },
      update: { enabled: true },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
