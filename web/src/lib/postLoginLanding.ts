import { hasAnyRole, EXECUTIVE_ROLES, isExecutiveLeader } from './roles';

/** Where to send someone after login when they did not deep-link elsewhere. */
export function postLoginLandingPath(roles: string[]): string {
  if (roles.includes('PLATFORM_SUPER_ADMIN')) return '/platform';

  if (isExecutiveLeader(roles)) return '/executive';

  if (roles.includes('TENANT_ADMIN')) return '/platform';

  if (hasAnyRole(roles, ['FINANCE_OFFICER', 'PAYROLL_SPECIALIST'])) {
    return '/payroll/approvals';
  }

  if (roles.includes('HR_MANAGER')) return '/platform/hr-dashboard';

  if (roles.includes('CLIENT_ADMIN')) return '/client-portal/payroll';

  if (roles.includes('RECRUITER') && !hasAnyRole(roles, ['HR_MANAGER', 'TENANT_ADMIN'])) {
    return '/recruitment';
  }

  if (hasAnyRole(roles, ['TENANT_STAFF', 'CLIENT_EMPLOYEE'])) return '/leave';

  return '/platform';
}
