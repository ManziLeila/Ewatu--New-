import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { fetchMe } from '../../api';
import { hasAnyRole, EXECUTIVE_ROLES } from '../../lib/roles';
import { fetchHrDashboardSummary, fetchPayrollRuns } from '../../payrollApi';
import { ThemeToggle } from '../../components/app/ThemeToggle';
import './executive-layout.css';
import '../admin/dashboard.css';

const MD_PAYROLL_STATUSES = new Set(['HR_APPROVED']);

export function ExecutiveLayout() {
  const location = useLocation();
  const [roles, setRoles] = useState<string[]>([]);
  const [approvalBadge, setApprovalBadge] = useState(0);

  useEffect(() => {
    fetchMe()
      .then((me) => setRoles(me.roles))
      .catch(() => setRoles([]));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [summary, runs] = await Promise.all([
          fetchHrDashboardSummary(),
          fetchPayrollRuns().catch(() => []),
        ]);
        const mdPayroll = runs.filter((r) => MD_PAYROLL_STATUSES.has(r.status)).length;
        setApprovalBadge(mdPayroll + (summary.leave.pendingApprovals ?? 0));
      } catch {
        setApprovalBadge(0);
      }
    })();
  }, [location.pathname]);

  if (roles.length === 0) {
    return (
      <div className="exec-main" style={{ maxWidth: 480, margin: '2rem auto' }}>
        <p className="muted">Loading executive workspace…</p>
      </div>
    );
  }

  const allowed = hasAnyRole(roles, [...EXECUTIVE_ROLES]);
  if (!allowed) {
    return (
      <div className="exec-main" style={{ maxWidth: 480, margin: '2rem auto' }}>
        <p className="muted">
          The executive overview is for Managing Director / CEO and CFO leadership only. Company administrators
          use the main platform dashboard.
        </p>
        <Link to="/platform">← Company admin dashboard</Link>
      </div>
    );
  }

  return (
    <div className="exec-shell">
      <aside className="exec-sidebar">
        <Link to="/platform" className="exec-sidebar__back">
          ← Main platform
        </Link>
        <div className="exec-sidebar__brand">E-Watu · Executive</div>
        <div className="exec-sidebar__title">Leadership</div>
        <ThemeToggle variant="adm" className="exec-sidebar__theme" />
        <nav className="exec-nav" aria-label="Executive">
          <NavLink
            to="/executive"
            end
            className={({ isActive }) => `exec-nav__link${isActive ? ' exec-nav__link--active' : ''}`}
          >
            Overview
          </NavLink>
          <NavLink
            to="/executive/financial"
            className={({ isActive }) => `exec-nav__link${isActive ? ' exec-nav__link--active' : ''}`}
          >
            Financial & payroll
          </NavLink>
          <NavLink
            to="/platform/departments"
            className={() => 'exec-nav__link'}
          >
            Departments
          </NavLink>
          <NavLink
            to="/performance/goals"
            className={() => 'exec-nav__link'}
          >
            Strategic goals
          </NavLink>
          <NavLink
            to="/executive/approvals"
            className={({ isActive }) => `exec-nav__link${isActive ? ' exec-nav__link--active' : ''}`}
          >
            <span>Approvals</span>
            {approvalBadge > 0 && <span className="exec-nav__badge">{approvalBadge}</span>}
          </NavLink>
          <NavLink
            to="/payroll/reports"
            className={() => 'exec-nav__link'}
          >
            Reports
          </NavLink>
          <NavLink
            to="/leave/calendar"
            className={() => 'exec-nav__link'}
          >
            Company calendar
          </NavLink>
        </nav>
      </aside>
      <main className="exec-main">
        <Outlet />
      </main>
    </div>
  );
}
