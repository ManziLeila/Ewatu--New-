import { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  Briefcase,
  Calculator,
  Calendar,
  CheckSquare,
  FileText,
  Layers,
  LayoutDashboard,
  Mail,
  MailCheck,
  PenLine,
  Settings,
  Upload,
  UserPlus,
  Users,
} from 'lucide-react';
import { fetchMe } from '../../api';
import { hasAnyRole, PAYROLL_ROLES } from '../../lib/roles';
import { AppModuleShell, type ModuleNavEntry } from '@/components/layout/AppModuleShell';
import { ROLE_DESCRIPTIONS } from '../../lib/roleDescriptions';

const iconClass = 'size-[18px]';

const NAV_ENTRIES: ModuleNavEntry[] = [
  { type: 'section', label: 'Overview' },
  { type: 'link', to: '/payroll/dashboard', label: 'Dashboard', icon: <LayoutDashboard className={iconClass} />, end: true },
  { type: 'link', to: '/payroll/approvals', label: 'Approvals', icon: <BarChart3 className={iconClass} /> },
  { type: 'section', label: 'People & data' },
  { type: 'link', to: '/payroll/clients', label: 'Clients', icon: <Users className={iconClass} /> },
  { type: 'link', to: '/payroll/employees', label: 'Employees', icon: <Users className={iconClass} /> },
  { type: 'link', to: '/payroll/employees/new', label: 'Employee form', icon: <UserPlus className={iconClass} /> },
  { type: 'link', to: '/payroll/bulk-upload', label: 'Bulk upload', icon: <Upload className={iconClass} /> },
  { type: 'link', to: '/payroll/consultants-upload', label: 'Consultants upload', icon: <UserPlus className={iconClass} /> },
  { type: 'section', label: 'Payroll runs' },
  { type: 'link', to: '/payroll/runs', label: 'Payroll runs', icon: <Calculator className={iconClass} /> },
  { type: 'link', to: '/payroll/periods', label: 'Pay periods', icon: <Layers className={iconClass} /> },
  { type: 'link', to: '/payroll/billing', label: 'Billing', icon: <FileText className={iconClass} /> },
  { type: 'section', label: 'Contracts & compliance' },
  { type: 'link', to: '/payroll/contracts', label: 'Contracts', icon: <Briefcase className={iconClass} /> },
  { type: 'link', to: '/payroll/contract-templates', label: 'Contract templates', icon: <PenLine className={iconClass} /> },
  { type: 'link', to: '/payroll/immigration', label: 'Work permits', icon: <Briefcase className={iconClass} /> },
  { type: 'link', to: '/payroll/outsourcing', label: 'Outsourcing', icon: <Layers className={iconClass} /> },
  { type: 'section', label: 'Reports & comms' },
  { type: 'link', to: '/payroll/reports', label: 'Reports', icon: <FileText className={iconClass} /> },
  { type: 'link', to: '/payroll/email-settings', label: 'Email settings', icon: <Mail className={iconClass} /> },
  { type: 'link', to: '/payroll/email-templates', label: 'Email templates', icon: <MailCheck className={iconClass} /> },
  { type: 'link', to: '/payroll/notifications', label: 'Notifications', icon: <Bell className={iconClass} /> },
  { type: 'section', label: 'Related modules' },
  { type: 'link', to: '/leave', label: 'Leave management', icon: <Calendar className={iconClass} /> },
  { type: 'link', to: '/performance/goals', label: 'Performance', icon: <CheckSquare className={iconClass} /> },
  { type: 'section', label: 'System' },
  { type: 'link', to: '/payroll/settings', label: 'Settings', icon: <Settings className={iconClass} /> },
];

const WORKSPACE_PATHS = ['/payroll/dashboard', '/payroll/approvals', '/payroll/bulk-upload'];

function roleLabel(roles: string[]): string {
  const order = ['FINANCE_OFFICER', 'CFO', 'PAYROLL_SPECIALIST', 'HR_MANAGER', 'MANAGING_DIRECTOR', 'TENANT_ADMIN'];
  for (const r of order) {
    if (roles.includes(r)) return ROLE_DESCRIPTIONS[r]?.label ?? r.replace(/_/g, ' ');
  }
  return 'Payroll user';
}

export function PayrollLayout() {
  const [roles, setRoles] = useState<string[]>([]);
  const [meEmail, setMeEmail] = useState('');
  const location = useLocation();

  useEffect(() => {
    fetchMe()
      .then((me) => {
        setRoles(me.roles);
        setMeEmail(me.email ?? '');
      })
      .catch(() => setRoles([]));
  }, []);

  const workspaceMain = useMemo(
    () => WORKSPACE_PATHS.some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`)),
    [location.pathname],
  );

  const allowed = hasAnyRole(roles, PAYROLL_ROLES) || roles.length === 0;

  if (!allowed && roles.length > 0) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">You do not have access to payroll.</p>
        <Link to="/platform" className="text-primary underline">
          ← Dashboard
        </Link>
      </div>
    );
  }

  return (
    <AppModuleShell
      productTitle="Payroll suite"
      backTo={{ href: '/platform', label: 'Main dashboard' }}
      nav={NAV_ENTRIES}
      userRole={roleLabel(roles)}
      userEmail={meEmail}
      workspaceMain={workspaceMain}
    >
      <Outlet />
    </AppModuleShell>
  );
}
