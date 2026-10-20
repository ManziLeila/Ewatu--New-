/** Rwanda-style chain: Finance submits → HR → MD → Client (if outsourced) → Finance finalize */

export const PAYROLL_STAGE_ORDER = [
  { status: 'DRAFT', label: 'Finance preparation', actor: 'FINANCE_OFFICER' },
  { status: 'SUBMITTED', label: 'HR review', actor: 'HR_MANAGER' },
  { status: 'HR_APPROVED', label: 'MD sign-off', actor: 'MD' },
  { status: 'MD_APPROVED', label: 'Client approval', actor: 'CLIENT_ADMIN' },
  { status: 'CLIENT_APPROVED', label: 'Finalize & pay', actor: 'FINANCE_OFFICER' },
  { status: 'FINALIZED', label: 'Closed', actor: '—' },
] as const;

export function stageLabelForStatus(status: string): string {
  return PAYROLL_STAGE_ORDER.find((s) => s.status === status)?.label ?? status;
}

export function pendingActorLabel(status: string, clientId?: string): string {
  if (status === 'SUBMITTED') return 'HR Manager';
  if (status === 'HR_APPROVED') return 'Managing Director';
  if (status === 'MD_APPROVED') {
    return clientId && clientId !== 'default' ? 'Client admin' : 'Finance (finalize)';
  }
  if (status === 'CLIENT_APPROVED') return 'Finance Officer';
  return '—';
}

export function canApprovePayrollRun(roles: string[], status: string): boolean {
  if (status === 'SUBMITTED') return roles.includes('HR_MANAGER');
  if (status === 'HR_APPROVED') {
    return roles.includes('MANAGING_DIRECTOR') || roles.includes('TENANT_ADMIN');
  }
  if (status === 'MD_APPROVED') return roles.includes('CLIENT_ADMIN');
  return false;
}

export function canRejectPayrollRun(roles: string[], status: string): boolean {
  return canApprovePayrollRun(roles, status);
}

export function canFinalizePayrollRun(
  roles: string[],
  status: string,
  clientId?: string,
): boolean {
  const finance = roles.some((r) =>
    ['FINANCE_OFFICER', 'TENANT_ADMIN', 'PAYROLL_SPECIALIST', 'CFO'].includes(r),
  );
  if (!finance) return false;
  if (status === 'CLIENT_APPROVED') return true;
  if (status === 'MD_APPROVED' && (!clientId || clientId === 'default')) return true;
  return false;
}

export function canSubmitPayrollRun(roles: string[], status: string): boolean {
  if (status !== 'DRAFT') return false;
  return roles.some((r) => ['FINANCE_OFFICER', 'TENANT_ADMIN', 'PAYROLL_SPECIALIST'].includes(r));
}
