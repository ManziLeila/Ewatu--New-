export function hasAnyRole(userRoles: string[], allowed: string[]): boolean {
  return userRoles.some((r) => allowed.includes(r));
}

/** HR module nav & day-to-day ops — not Company Admin (they use /platform settings & users). */
export const RECRUITMENT_ROLES = ['HR_MANAGER', 'RECRUITER'];
export const PLACEMENTS_ROLES = ['HR_MANAGER', 'FINANCE_OFFICER'];
export const TALENT_POOL_ROLES = ['HR_MANAGER', 'RECRUITER'];
export const PAYROLL_ROLES = ['HR_MANAGER', 'FINANCE_OFFICER', 'CLIENT_ADMIN'];
export const HR_DASHBOARD_ROLES = ['HR_MANAGER', 'MANAGING_DIRECTOR'] as const;
/**
 * C-suite leadership workspace (YTD payroll cost, company-wide financial snapshot, exec approvals).
 * Company Admin (TENANT_ADMIN) uses /platform — not this workspace.
 * CEO is represented by MANAGING_DIRECTOR in E-Watu roles.
 */
export const EXECUTIVE_ROLES = ['MANAGING_DIRECTOR', 'CFO'] as const;

export const COMPANY_ADMIN_ROLES = ['TENANT_ADMIN'] as const;

export function isExecutiveLeader(roles: string[]): boolean {
  return hasAnyRole(roles, [...EXECUTIVE_ROLES]);
}

export function isCompanyAdminOnly(roles: string[]): boolean {
  return (
    hasAnyRole(roles, [...COMPANY_ADMIN_ROLES]) &&
    !isExecutiveLeader(roles) &&
    !roles.includes('HR_MANAGER')
  );
}
