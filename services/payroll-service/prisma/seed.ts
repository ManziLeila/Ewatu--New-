import {
  PrismaClient,
  Prisma,
  EmployeeType,
  EmploymentStatus,
  CycleStatus,
  GoalStatus,
  LeaveStatus,
  PeriodStatus,
  TaskStatus,
  TrainingRecordStatus,
  GrievanceCategory,
  GrievanceStatus,
  AttendanceStatus,
  TeamMemberRole,
} from '@prisma/client';

const prisma = new PrismaClient();
const CLIENT_ID = 'default';
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
    throw new Error('demo-tenant not found — run: npm run prisma:seed --prefix services/platform-service');
  }
  return id;
}

type EmpSeed = {
  email: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  department: string;
  location?: string;
  basicSalary: number;
  managerEmail?: string;
};

async function upsertEmployee(tenantId: string, row: EmpSeed, managerId?: string | null) {
  const existing = await prisma.employee.findFirst({
    where: { tenantId, email: row.email },
  });
  const data = {
    tenantId,
    employeeType: EmployeeType.INTERNAL,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    jobTitle: row.jobTitle,
    department: row.department,
    location: row.location ?? 'Kigali',
    startDate: new Date('2024-01-15'),
    employmentStatus: EmploymentStatus.ACTIVE,
    managerId: managerId ?? null,
    basicSalary: new Prisma.Decimal(row.basicSalary),
    housingAllowance: new Prisma.Decimal(Math.round(row.basicSalary * 0.08)),
    transportAllowance: new Prisma.Decimal(50000),
  };
  if (existing) {
    return prisma.employee.update({ where: { id: existing.id }, data });
  }
  return prisma.employee.create({ data });
}

async function main() {
  const tenantId = await demoTenantId();
  const year = new Date().getFullYear();

  await prisma.payrollConfiguration.upsert({
    where: { tenantId_clientId: { tenantId, clientId: CLIENT_ID } },
    update: {},
    create: {
      tenantId,
      clientId: CLIENT_ID,
      currency: 'RWF',
    },
  });

  const md = await upsertEmployee(tenantId, {
    email: 'md@ewatu.dev',
    firstName: 'Jean',
    lastName: 'Mukamana',
    jobTitle: 'Managing Director',
    department: 'Executive',
    basicSalary: 2_800_000,
  });

  const hr = await upsertEmployee(tenantId, {
    email: 'hr.manager@ewatu.dev',
    firstName: 'Dev',
    lastName: 'HR Manager',
    jobTitle: 'HR Manager',
    department: 'Human Resources',
    basicSalary: 1_450_000,
  }, md.id);

  await prisma.employee.update({ where: { id: hr.id }, data: { managerId: md.id } });

  const staffRows: EmpSeed[] = [
    {
      email: 'tenant@ewatu.dev',
      firstName: 'Demo',
      lastName: 'Company Admin',
      jobTitle: 'Company Administrator',
      department: 'Administration',
      basicSalary: 900_000,
      managerEmail: 'md@ewatu.dev',
    },
    {
      email: 'grace.mukamana@ewatu.dev',
      firstName: 'Grace',
      lastName: 'Mukamana',
      jobTitle: 'Senior Accountant',
      department: 'Finance',
      basicSalary: 980_000,
      managerEmail: 'hr.manager@ewatu.dev',
    },
    {
      email: 'finance@ewatu.dev',
      firstName: 'Alice',
      lastName: 'Uwineza',
      jobTitle: 'Finance Officer',
      department: 'Finance',
      basicSalary: 1_120_000,
      managerEmail: 'md@ewatu.dev',
    },
    {
      email: 'peter.k@demo.local',
      firstName: 'Peter',
      lastName: 'Kalisa',
      jobTitle: 'IT Lead',
      department: 'Information Technology',
      basicSalary: 1_200_000,
      managerEmail: 'md@ewatu.dev',
    },
    {
      email: 'marie.c@demo.local',
      firstName: 'Marie',
      lastName: 'Cyubahiro',
      jobTitle: 'Operations Manager',
      department: 'Operations',
      basicSalary: 1_050_000,
      managerEmail: 'md@ewatu.dev',
    },
    {
      email: 'eric.s@demo.local',
      firstName: 'Eric',
      lastName: 'Shema',
      jobTitle: 'Sales Executive',
      department: 'Sales',
      basicSalary: 750_000,
      managerEmail: 'marie.c@demo.local',
    },
    {
      email: 'diane.m@demo.local',
      firstName: 'Diane',
      lastName: 'Mutesi',
      jobTitle: 'Recruiter',
      department: 'Human Resources',
      basicSalary: 680_000,
      managerEmail: 'hr.manager@ewatu.dev',
    },
  ];

  const byEmail = new Map<string, string>();
  byEmail.set(md.email, md.id);
  byEmail.set(hr.email, hr.id);

  for (const row of staffRows) {
    const mgr = row.managerEmail ? byEmail.get(row.managerEmail) : md.id;
    const emp = await upsertEmployee(tenantId, row, mgr);
    byEmail.set(row.email, emp.id);
  }

  const graceId = byEmail.get('grace.mukamana@ewatu.dev')!;

  let hrTeam = await prisma.team.findFirst({ where: { tenantId, name: 'Human Resources' } });
  if (!hrTeam) {
    hrTeam = await prisma.team.create({ data: { tenantId, name: 'Human Resources' } });
  }

  await prisma.teamMember.upsert({
    where: { teamId_employeeId: { teamId: hrTeam.id, employeeId: hr.id } },
    update: { role: TeamMemberRole.LEAD },
    create: {
      tenantId,
      teamId: hrTeam.id,
      employeeId: hr.id,
      role: TeamMemberRole.LEAD,
    },
  });

  await prisma.teamMember.upsert({
    where: { teamId_employeeId: { teamId: hrTeam.id, employeeId: graceId } },
    update: {},
    create: {
      tenantId,
      teamId: hrTeam.id,
      employeeId: graceId,
      role: TeamMemberRole.MEMBER,
    },
  });

  const annualLeave = await prisma.leaveType.upsert({
    where: { tenantId_code: { tenantId, code: 'ANNUAL' } },
    update: {},
    create: {
      tenantId,
      name: 'Annual leave',
      code: 'ANNUAL',
      defaultDays: new Prisma.Decimal(21),
    },
  });

  await prisma.leaveType.upsert({
    where: { tenantId_code: { tenantId, code: 'SICK' } },
    update: {},
    create: {
      tenantId,
      name: 'Sick leave',
      code: 'SICK',
      defaultDays: new Prisma.Decimal(10),
    },
  });

  for (const empId of byEmail.values()) {
    await prisma.leaveBalance.upsert({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: empId,
          leaveTypeId: annualLeave.id,
          year,
        },
      },
      update: {},
      create: {
        tenantId,
        employeeId: empId,
        leaveTypeId: annualLeave.id,
        year,
        allocatedDays: new Prisma.Decimal(21),
        usedDays: new Prisma.Decimal(2),
      },
    });
  }

  const pendingLeave = await prisma.leaveRequest.findFirst({
    where: { tenantId, employeeId: graceId, status: LeaveStatus.PENDING },
  });
  if (!pendingLeave) {
    await prisma.leaveRequest.create({
      data: {
        tenantId,
        employeeId: graceId,
        leaveTypeId: annualLeave.id,
        startDate: new Date(year, 9, 20),
        endDate: new Date(year, 9, 24),
        numberOfDays: new Prisma.Decimal(3),
        reason: 'Family event',
        status: LeaveStatus.PENDING,
      },
    });
  }

  const cycleName = `${year} Annual Performance Review`;
  let cycle = await prisma.appraisalCycle.findFirst({
    where: { tenantId, name: cycleName },
  });
  if (!cycle) {
    cycle = await prisma.appraisalCycle.create({
      data: {
        tenantId,
        name: cycleName,
        startDate: new Date(year, 0, 1),
        endDate: new Date(year, 11, 31),
        selfAssessmentDeadline: new Date(year, 2, 31),
        managerReviewDeadline: new Date(year, 5, 30),
        hrValidationDeadline: new Date(year, 8, 30),
        status: CycleStatus.ACTIVE,
      },
    });
  } else if (cycle.status !== CycleStatus.ACTIVE) {
    cycle = await prisma.appraisalCycle.update({
      where: { id: cycle.id },
      data: { status: CycleStatus.ACTIVE },
    });
  }

  const goalDefs = [
    { title: 'Close monthly books on time', weight: 35, progress: 72, status: GoalStatus.APPROVED },
    { title: 'Automate payroll reconciliations', weight: 35, progress: 45, status: GoalStatus.APPROVED },
    { title: 'Complete RSSB filing training', weight: 30, progress: 80, status: GoalStatus.SUBMITTED },
  ];

  for (const g of goalDefs) {
    const exists = await prisma.goal.findFirst({
      where: { tenantId, employeeId: graceId, appraisalCycleId: cycle.id, title: g.title },
    });
    if (!exists) {
      await prisma.goal.create({
        data: {
          tenantId,
          employeeId: graceId,
          appraisalCycleId: cycle.id,
          title: g.title,
          target: 'Achieve by Q4',
          measurementMethod: 'Monthly review with HR',
          weight: new Prisma.Decimal(g.weight),
          deadline: new Date(year, 11, 15),
          status: g.status,
          progress: new Prisma.Decimal(g.progress),
        },
      });
    }
  }

  await prisma.goalTemplate.deleteMany({ where: { tenantId, title: 'Improve team retention' } });
  await prisma.goalTemplate.create({
    data: {
      tenantId,
      roleType: 'TENANT_STAFF',
      title: 'Improve team retention',
      target: 'Reduce voluntary attrition by 5%',
      measurementMethod: 'Quarterly HR reports',
      weight: new Prisma.Decimal(25),
    },
  });

  const month = new Date().getMonth() + 1;
  const periodYear = new Date().getFullYear();
  let period = await prisma.payrollPeriod.findFirst({
    where: { tenantId, clientId: CLIENT_ID, periodMonth: month, periodYear },
  });
  if (!period) {
    period = await prisma.payrollPeriod.create({
      data: {
        tenantId,
        clientId: CLIENT_ID,
        periodMonth: month,
        periodYear,
        status: PeriodStatus.HR_APPROVED,
        hrApprovedAt: new Date(),
        hrApprovedBy: hr.email,
      },
    });
  } else if (period.status === PeriodStatus.DRAFT) {
    period = await prisma.payrollPeriod.update({
      where: { id: period.id },
      data: { status: PeriodStatus.HR_APPROVED, hrApprovedAt: new Date(), hrApprovedBy: hr.email },
    });
  }

  const activeEmployees = await prisma.employee.findMany({
    where: { tenantId, employmentStatus: EmploymentStatus.ACTIVE },
    take: 12,
  });
  for (const emp of activeEmployees) {
    const gross =
      Number(emp.basicSalary) +
      Number(emp.housingAllowance) +
      Number(emp.transportAllowance) +
      Number(emp.otherAllowances);
    const paye = Math.round(gross * 0.2);
    const net = gross - paye;
    await prisma.payrollRecord.upsert({
      where: { periodId_employeeId: { periodId: period.id, employeeId: emp.id } },
      update: {},
      create: {
        tenantId,
        periodId: period.id,
        employeeId: emp.id,
        basicSalary: emp.basicSalary,
        housingAllowance: emp.housingAllowance,
        transportAllowance: emp.transportAllowance,
        otherAllowances: emp.otherAllowances,
        grossPay: new Prisma.Decimal(gross),
        paye: new Prisma.Decimal(paye),
        totalDeductions: new Prisma.Decimal(paye),
        netPay: new Prisma.Decimal(net),
      },
    });
  }

  const annTitle = 'Q4 performance check-ins';
  if (!(await prisma.announcement.findFirst({ where: { tenantId, title: annTitle } }))) {
    await prisma.announcement.create({
      data: {
        tenantId,
        title: annTitle,
        body: 'Managers should complete mid-cycle reviews by end of month.',
        postedByName: 'Dev HR Manager',
      },
    });
  }

  if (!(await prisma.task.findFirst({ where: { tenantId, employeeId: graceId, title: 'Submit Q3 expense report' } }))) {
    await prisma.task.create({
      data: {
        tenantId,
        employeeId: graceId,
        assignedByName: 'Dev HR Manager',
        title: 'Submit Q3 expense report',
        status: TaskStatus.PENDING,
        dueDate: new Date(year, 9, 15),
      },
    });
  }

  let course = await prisma.trainingCourse.findFirst({ where: { tenantId, name: 'Workplace safety 2026' } });
  if (!course) {
    course = await prisma.trainingCourse.create({
      data: {
        tenantId,
        name: 'Workplace safety 2026',
        description: 'Mandatory annual safety briefing',
        mandatory: true,
      },
    });
  }
  await prisma.trainingRecord.upsert({
    where: { courseId_employeeId: { courseId: course.id, employeeId: graceId } },
    update: { status: TrainingRecordStatus.IN_PROGRESS },
    create: {
      tenantId,
      courseId: course.id,
      employeeId: graceId,
      status: TrainingRecordStatus.IN_PROGRESS,
    },
  });

  const today = new Date();
  for (let d = 1; d <= 5; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() - d);
    const day = new Date(date.toISOString().slice(0, 10));
    await prisma.attendanceRecord.upsert({
      where: {
        tenantId_employeeId_date: { tenantId, employeeId: graceId, date: day },
      },
      update: {},
      create: {
        tenantId,
        employeeId: graceId,
        date: day,
        status: d === 2 ? AttendanceStatus.LATE : AttendanceStatus.PRESENT,
        clockInAt: new Date(day.getTime() + 8 * 60 * 60 * 1000),
      },
    });
  }

  if (!(await prisma.grievanceCase.findFirst({ where: { tenantId, raisedByEmployeeId: graceId } }))) {
    await prisma.grievanceCase.create({
      data: {
        tenantId,
        raisedByEmployeeId: graceId,
        category: GrievanceCategory.WORKPLACE_CONDITIONS,
        description: 'Demo case — parking allocation review requested.',
        status: GrievanceStatus.OPEN,
      },
    });
  }

  console.log('\nPayroll demo data ready for demo-tenant');
  console.log(`  Employees: ${activeEmployees.length}+ (linked logins: grace, hr.manager, md, finance)`);
  console.log(`  Active cycle: ${cycle.name}`);
  console.log(`  Payroll period ${periodYear}-${String(month).padStart(2, '0')}: ${period.status} (MD approval demo)\n`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
