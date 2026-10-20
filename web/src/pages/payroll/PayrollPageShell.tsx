import type { ReactNode } from 'react';
import { ROLE_DESCRIPTIONS } from '../../lib/roleDescriptions';
import { cn } from '@/lib/utils';

type PayrollPageShellProps = {
  pageTitle: string;
  breadcrumb?: string;
  email?: string;
  roles?: string[];
  children: ReactNode;
  hero?: ReactNode;
};

function roleLabel(roles: string[]): string {
  const order = ['FINANCE_OFFICER', 'CFO', 'PAYROLL_SPECIALIST', 'HR_MANAGER', 'MANAGING_DIRECTOR', 'TENANT_ADMIN'];
  for (const r of order) {
    if (roles.includes(r)) return ROLE_DESCRIPTIONS[r]?.label ?? r.replace(/_/g, ' ');
  }
  return 'Payroll user';
}

export function PayrollPageShell({
  pageTitle,
  breadcrumb = 'Dashboard',
  email = '',
  roles = [],
  children,
  hero,
}: PayrollPageShellProps) {
  const label = roleLabel(roles);
  const initials = label
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="mx-auto max-w-[1180px] px-6 py-5 text-workspace-foreground">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-[0.72rem] font-bold uppercase tracking-wider text-muted-foreground">
            Payroll management system
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-workspace-foreground">{pageTitle}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {breadcrumb} / <span className="font-semibold text-workspace-foreground">{pageTitle}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {email ? <span className="text-xs text-muted-foreground">{email}</span> : null}
          <span
            className="flex size-10 items-center justify-center rounded-full bg-accent text-xs font-extrabold text-accent-foreground shadow-sm"
            aria-hidden
          >
            {initials}
          </span>
        </div>
      </header>
      {hero}
      {children}
    </div>
  );
}

export function PayrollWorkspaceCard({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-workspace-card p-5 text-workspace-foreground shadow-sm',
        className,
      )}
    >
      {children}
    </div>
  );
}
