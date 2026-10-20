import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  MessageSquareQuote,
  Pin,
  RefreshCw,
  Target,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { fetchMe } from '../../api';
import { hasAnyRole } from '../../lib/roles';
import { primaryWorkspaceLabel } from '../../lib/workspaceDashboard';
import '../payroll/payroll-layout.css';

const PERFORMANCE_ADMIN = ['TENANT_ADMIN', 'HR_MANAGER', 'MANAGING_DIRECTOR'] as const;

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  show: boolean;
};

export function PerformanceLayout() {
  const [navOpen, setNavOpen] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const location = useLocation();

  useEffect(() => {
    fetchMe()
      .then((me) => setRoles(me.roles))
      .catch(() => setRoles([]));
  }, []);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = navOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [navOpen]);

  const isAdmin = hasAnyRole(roles, [...PERFORMANCE_ADMIN]);
  const isStaffOnly =
    roles.length > 0 && !isAdmin && roles.every((r) => r === 'TENANT_STAFF' || r === 'CLIENT_EMPLOYEE');

  const navItems = useMemo<NavItem[]>(
    () => [
      { to: '/performance/goals', label: 'My goals & KPIs', icon: Target, end: true, show: true },
      { to: '/performance/kpis', label: 'Personal KPIs', icon: Pin, show: true },
      { to: '/performance/appraisals', label: 'Appraisals', icon: ClipboardList, show: true },
      { to: '/performance/360-feedback', label: '360 feedback', icon: MessageSquareQuote, show: true },
      { to: '/performance/cycles', label: 'Performance cycles', icon: RefreshCw, show: isAdmin },
      { to: '/performance/team-kpis', label: 'Team KPI submissions', icon: BarChart3, show: isAdmin },
      { to: '/performance/pips', label: 'Improvement plans', icon: TrendingUp, show: isAdmin },
    ],
    [isAdmin],
  );

  const visibleNav = navItems.filter((item) => item.show);
  const workspaceLabel = roles.length ? primaryWorkspaceLabel(roles) : 'Performance';

  return (
    <div className={`payroll-shell payroll-shell--performance${navOpen ? ' payroll-shell--nav-open' : ''}`}>
      <div
        className="payroll-nav-backdrop"
        onClick={() => setNavOpen(false)}
        aria-hidden={!navOpen}
      />

      <header className="payroll-topbar">
        <button
          type="button"
          className="payroll-topbar__menu"
          aria-label="Open performance menu"
          aria-expanded={navOpen}
          onClick={() => setNavOpen((open) => !open)}
        >
          ☰
        </button>
        <span className="payroll-topbar__title">Performance</span>
        <Link to="/platform" className="payroll-topbar__back">
          Dashboard
        </Link>
      </header>

      <aside className="payroll-sidebar">
        <Link to="/platform" className="payroll-sidebar__back">
          ← Dashboard
        </Link>
        <div className="payroll-sidebar__intro">
          <p className="payroll-sidebar__kicker">{workspaceLabel}</p>
          <h2 className="payroll-sidebar__heading">
            {isStaffOnly ? 'My performance' : 'Performance management'}
          </h2>
        </div>
        <nav className="payroll-nav" aria-label="Performance">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `payroll-nav__link${isActive ? ' payroll-nav__link--active' : ''}`
                }
              >
                <span className="payroll-nav__icon" aria-hidden>
                  <Icon strokeWidth={2} />
                </span>
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>
      <main className="payroll-main">
        <Outlet context={{ roles, isAdmin, isStaffOnly }} />
      </main>
    </div>
  );
}
