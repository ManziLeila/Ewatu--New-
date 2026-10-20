import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PLATFORM_DB =
  process.env.PLATFORM_DATABASE_URL ??
  'postgresql://ewatu:ewatu_dev@127.0.0.1:15432/platform_db';

async function demoTenantId(): Promise<string> {
  const platform = new PrismaClient({
    datasources: { db: { url: PLATFORM_DB } },
  });
  const rows = await platform.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "Tenant" WHERE slug = 'demo-tenant' LIMIT 1
  `;
  await platform.$disconnect();
  const id = rows[0]?.id;
  if (!id) {
    throw new Error('demo-tenant not found — run platform seed first');
  }
  return id;
}

async function main() {
  const tenantId = await demoTenantId();

  const jobSeeds = [
    { title: 'Senior Accountant', department: 'Finance', status: 'OPEN' },
    { title: 'Field Service Technician', department: 'Operations', status: 'OPEN' },
    { title: 'Full Stack Developer', department: 'Information Technology', status: 'OPEN' },
    { title: 'HR Generalist', department: 'Human Resources', status: 'OPEN' },
  ];

  const jobs: { id: string; title: string }[] = [];
  for (const j of jobSeeds) {
    let job = await prisma.job.findFirst({ where: { tenantId, title: j.title } });
    if (!job) {
      job = await prisma.job.create({
        data: {
          tenantId,
          title: j.title,
          description: `Demo opening — ${j.title} at HC Solutions.`,
          department: j.department,
          location: 'Kigali',
          status: j.status,
          postedAt: new Date(),
        },
      });
    }
    jobs.push({ id: job.id, title: job.title });
  }

  const candidates = [
    { firstName: 'Olivier', lastName: 'Niyonsaba', email: 'olivier.n@demo.local', stage: 'APPLIED' },
    { firstName: 'Claire', lastName: 'Ingabire', email: 'claire.i@demo.local', stage: 'INTERVIEWED' },
  ];

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    let candidate = await prisma.candidate.findFirst({
      where: { tenantId, email: c.email },
    });
    if (!candidate) {
      candidate = await prisma.candidate.create({
        data: {
          tenantId,
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email,
          source: 'SEED',
          currentTitle: 'Professional',
        },
      });
    }

    const job = jobs[i % jobs.length];
    const existingApp = await prisma.application.findFirst({
      where: { tenantId, jobId: job.id, candidateId: candidate.id },
    });
    if (!existingApp) {
      await prisma.application.create({
        data: {
          tenantId,
          jobId: job.id,
          candidateId: candidate.id,
          stage: c.stage,
          source: 'SEED',
        },
      });
    }
  }

  console.log('\nRecruitment demo data ready');
  console.log(`  Open jobs: ${jobs.length}`);
  console.log(`  Pipeline applications: ${candidates.length}\n`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
