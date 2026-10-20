export const ROLE_DESCRIPTIONS: Record<string, { label: string; desc: string }> = {
  TENANT_STAFF: {
    label: 'Employee Staff',
    desc: 'Employee self-service (payslips, leave requests, KPI self-assessments)',
  },
  HR_MANAGER: {
    label: 'HR / Department Head',
    desc: 'Department leadership (approve team leave, rate team KPIs, manage placements)',
  },
  FINANCE_OFFICER: {
    label: 'Finance Officer',
    desc: 'Payroll calculations, tax reports, and client billing',
  },
  RECRUITER: {
    label: 'Recruiter',
    desc: 'Candidate sourcing, job postings, talent pool management',
  },
  TENANT_ADMIN: {
    label: 'Company Admin',
    desc: 'Workspace setup, users, branding, and settings — not HR operations or executive financial overview',
  },
  MANAGING_DIRECTOR: {
    label: 'Managing Director / CEO',
    desc: 'Executive overview — company-wide payroll cost, headcount, and leadership approvals',
  },
  CFO: {
    label: 'CFO',
    desc: 'Executive financial view — payroll cost, approvals, and board-ready summaries',
  },
};

export const ROLE_OPTIONS = Object.keys(ROLE_DESCRIPTIONS);
