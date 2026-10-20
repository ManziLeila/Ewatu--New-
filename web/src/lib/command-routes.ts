export type CommandRoute = {
  id: string;
  label: string;
  href: string;
  group: string;
  keywords?: string;
  /** If set, route is hidden unless the user has one of these roles */
  roles?: string[];
};

/** Global navigation + quick actions for Cmd/Ctrl+K */
export const COMMAND_ROUTES: CommandRoute[] = [
  { id: 'home', label: 'Platform dashboard', href: '/platform', group: 'Navigation', keywords: 'home admin' },
  { id: 'payroll-dash', label: 'Payroll dashboard', href: '/payroll/dashboard', group: 'Payroll', keywords: 'finance' },
  { id: 'payroll-approvals', label: 'Payroll approvals', href: '/payroll/approvals', group: 'Payroll' },
  { id: 'payroll-runs', label: 'Payroll runs', href: '/payroll/runs', group: 'Payroll' },
  { id: 'payroll-employees', label: 'Employees', href: '/payroll/employees', group: 'Payroll' },
  { id: 'payroll-bulk', label: 'Bulk upload', href: '/payroll/bulk-upload', group: 'Payroll', keywords: 'import csv' },
  { id: 'payroll-reports', label: 'Payroll reports', href: '/payroll/reports', group: 'Payroll' },
  { id: 'leave', label: 'Leave dashboard', href: '/leave', group: 'Leave' },
  { id: 'leave-apply', label: 'Apply for leave', href: '/leave/apply', group: 'Leave', keywords: 'time off' },
  { id: 'recruitment-jobs', label: 'Jobs', href: '/recruitment/jobs', group: 'Recruitment' },
  { id: 'recruitment-candidates', label: 'Candidates', href: '/recruitment/candidates', group: 'Recruitment' },
  { id: 'hr-dashboard', label: 'HR dashboard', href: '/platform/hr-dashboard', group: 'HR' },
  {
    id: 'executive',
    label: 'Executive overview',
    href: '/executive',
    group: 'Executive',
    roles: ['MANAGING_DIRECTOR', 'CFO'],
  },
  { id: 'users', label: 'Users & roles', href: '/platform/users', group: 'Administration' },
  { id: 'settings', label: 'Company settings', href: '/platform/settings', group: 'Administration' },
  { id: 'action-run-payroll', label: 'Run payroll (new period)', href: '/payroll/runs', group: 'Actions', keywords: 'create period' },
  { id: 'action-add-employee', label: 'Add employee', href: '/payroll/employees/new', group: 'Actions' },
];
