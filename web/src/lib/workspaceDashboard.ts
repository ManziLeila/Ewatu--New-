import { hasAnyRole, isCompanyAdminOnly, isExecutiveLeader } from './roles';
import { ROLE_DESCRIPTIONS } from './roleDescriptions';

export type DashboardTabId = 'company' | 'workforce' | 'recruitment' | 'payroll' | 'client' | 'employee';

const RECRUITMENT_ROLES = ['HR_MANAGER', 'RECRUITER'] as const;
const WORKFORCE_ROLES = ['HR_MANAGER', 'MANAGING_DIRECTOR'] as const;
const PAYROLL_TAB_ROLES = ['HR_MANAGER', 'FINANCE_OFFICER', 'PAYROLL_SPECIALIST', 'CFO'] as const;
const CLIENT_ROLES = ['CLIENT_ADMIN'] as const;
const EMPLOYEE_ROLES = ['TENANT_STAFF', 'CLIENT_EMPLOYEE'] as const;

export function canSeeDashboardTab(roles: string[], tab: DashboardTabId): boolean {
  switch (tab) {
    case 'company':
      return isCompanyAdminOnly(roles);
    case 'workforce':
      return hasAnyRole(roles, [...WORKFORCE_ROLES]);
    case 'recruitment':
      return hasAnyRole(roles, [...RECRUITMENT_ROLES]);
    case 'payroll':
      return hasAnyRole(roles, [...PAYROLL_TAB_ROLES]);
    case 'client':
      return hasAnyRole(roles, [...CLIENT_ROLES]);
    case 'employee':
      return hasAnyRole(roles, [...EMPLOYEE_ROLES]) || roles.includes('HR_MANAGER');
    default:
      return false;
  }
}

/** First tab shown after login — prioritises the person's primary job, not always hiring. */
export function defaultDashboardTab(roles: string[]): DashboardTabId {
  if (isExecutiveLeader(roles) && !roles.includes('RECRUITER')) {
    return 'workforce';
  }
  if (isCompanyAdminOnly(roles)) {
    return 'company';
  }
  if (roles.includes('MANAGING_DIRECTOR')) return 'workforce';
  if (roles.includes('HR_MANAGER') && !roles.includes('RECRUITER')) return 'workforce';
  if (hasAnyRole(roles, ['FINANCE_OFFICER', 'PAYROLL_SPECIALIST', 'CFO'])) return 'payroll';
  if (roles.includes('RECRUITER') && !hasAnyRole(roles, WORKFORCE_ROLES)) return 'recruitment';
  if (roles.includes('CLIENT_ADMIN') && !hasAnyRole(roles, WORKFORCE_ROLES)) return 'client';
  if (hasAnyRole(roles, EMPLOYEE_ROLES) && !hasAnyRole(roles, WORKFORCE_ROLES)) return 'employee';
  if (canSeeDashboardTab(roles, 'workforce')) return 'workforce';
  if (canSeeDashboardTab(roles, 'recruitment')) return 'recruitment';
  if (canSeeDashboardTab(roles, 'payroll')) return 'payroll';
  if (canSeeDashboardTab(roles, 'client')) return 'client';
  return 'employee';
}

export function primaryWorkspaceLabel(roles: string[]): string {
  const order = [
    'MANAGING_DIRECTOR',
    'TENANT_ADMIN',
    'HR_MANAGER',
    'FINANCE_OFFICER',
    'RECRUITER',
    'CLIENT_ADMIN',
    'TENANT_STAFF',
  ];
  for (const key of order) {
    if (roles.includes(key)) {
      return ROLE_DESCRIPTIONS[key]?.label ?? key.replace(/_/g, ' ');
    }
  }
  return 'Workspace';
}
