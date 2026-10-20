import { useEffect, useState, type CSSProperties } from 'react';
import { NavLink, Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { fetchMe } from '../../api';
import { ThemeToggle } from '../../components/app/ThemeToggle';
import '../payroll/payroll-layout.css';

const iconProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const IcoDashboard = () => (
  <svg {...iconProps}>
    <rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" />
    <rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" />
  </svg>
);
const IcoPlus = () => (
  <svg {...iconProps}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
);
const IcoList = () => (
  <svg {...iconProps}>
    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);
const IcoTrendingUp = () => (
  <svg {...iconProps}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
);
const IcoCalendar = () => (
  <svg {...iconProps}>
    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const IcoBook = () => (
  <svg {...iconProps}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
);
const IcoFlag = () => (
  <svg {...iconProps}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="3" /></svg>
);
const IcoFolder = () => (
  <svg {...iconProps}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
);
const IcoBell = () => (
  <svg {...iconProps}><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
);
const IcoSettings = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
const IcoHelp = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const IcoCheckSquare = () => (
  <svg {...iconProps}><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
);
const IcoUsers = () => (
  <svg {...iconProps}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export function LeaveLayout() {
  const [roles, setRoles] = useState<string[]>([]);
  const [navOpen, setNavOpen] = useState(false);
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

  const isHR =
    roles.length === 0 ||
    roles.includes('HR_MANAGER') ||
    roles.includes('TENANT_ADMIN') ||
    roles.includes('PLATFORM_SUPER_ADMIN');

  const isManagementRoute =
    location.pathname.startsWith('/leave/approvals') ||
    location.pathname.startsWith('/leave/balances') ||
    location.pathname.startsWith('/leave/types');

  const sectionLabelStyle: CSSProperties = {
    fontSize: '0.68rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'rgba(255, 255, 255, 0.45)',
    padding: '0.9rem 0.85rem 0.2rem',
  };

  const [activeView, setActiveView] = useState<'employee' | 'management'>(
    isManagementRoute ? 'management' : 'employee',
  );

  useEffect(() => {
    if (isManagementRoute) {
      setActiveView('management');
    } else if (location.pathname === '/leave') {
      setActiveView('employee');
    }
  }, [location.pathname]);

  if (!isHR && isManagementRoute) {
    return <Navigate to="/leave" replace />;
  }

  return (
    <div className={`payroll-shell${navOpen ? ' payroll-shell--nav-open' : ''}`}>
      <div
        className="payroll-nav-backdrop"
        onClick={() => setNavOpen(false)}
        aria-hidden={!navOpen}
      />

      <header className="payroll-topbar">
        <button
          type="button"
          className="payroll-topbar__menu"
          aria-label="Open leave menu"
          aria-expanded={navOpen}
          onClick={() => setNavOpen((open) => !open)}
        >
          ☰
        </button>
        <span className="payroll-topbar__title">Leave Management</span>
        <Link to="/platform" className="payroll-topbar__back">
          Dashboard
        </Link>
        <ThemeToggle variant="adm" />
      </header>

      <aside className="payroll-sidebar">
        <Link to="/platform" className="payroll-sidebar__back">
          ← Dashboard
        </Link>
        <div style={{ padding: '0 0.85rem 1rem' }}>
          <div style={{ color: '#ffffff', fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            Leave Management
          </div>
        </div>

        <nav className="payroll-nav" aria-label="Leave Management">
          {activeView === 'employee' ? (
            <>
              <div style={sectionLabelStyle}>Menu</div>
              <NavLink
                to="/leave"
                end
                className={({ isActive }) =>
                  `payroll-nav__link${isActive ? ' payroll-nav__link--active' : ''}`
                }
              >
                <span className="payroll-nav__icon"><IcoDashboard /></span>
                Dashboard
              </NavLink>

              <div style={sectionLabelStyle}>My Leave</div>
              <NavLink
                to="/leave/apply"
                className={({ isActive }) =>
                  `payroll-nav__link${isActive ? ' payroll-nav__link--active' : ''}`
                }
              >
                <span className="payroll-nav__icon"><IcoPlus /></span>
                Apply Leave
              </NavLink>
              <NavLink
                to="/leave/requests"
                className={({ isActive }) =>
                  `payroll-nav__link${isActive ? ' payroll-nav__link--active' : ''}`
                }
              >
                <span className="payroll-nav__icon"><IcoList /></span>
                Leave Requests
              </NavLink>
              <NavLink
                to="/leave/balance"
                className={({ isActive }) =>
                  `payroll-nav__link${isActive ? ' payroll-nav__link--active' : ''}`
                }
              >
                <span className="payroll-nav__icon"><IcoTrendingUp /></span>
                Leave Balance
              </NavLink>
              <NavLink
                to="/leave/calendar"
                className={({ isActive }) =>
                  `payroll-nav__link${isActive ? ' payroll-nav__link--active' : ''}`
                }
              >
                <span className="payroll-nav__icon"><IcoCalendar /></span>
                Leave Calendar
              </NavLink>

              <div style={sectionLabelStyle}>Resources</div>
              <NavLink
                to="/leave/policy"
                className={({ isActive }) =>
                  `payroll-nav__link${isActive ? ' payroll-nav__link--active' : ''}`
                }
              >
                <span className="payroll-nav__icon"><IcoBook /></span>
                Leave Policy
              </NavLink>
              <NavLink
                to="/leave/holidays"
                className={({ isActive }) =>
                  `payroll-nav__link${isActive ? ' payroll-nav__link--active' : ''}`
                }
              >
                <span className="payroll-nav__icon"><IcoFlag /></span>
                Public Holidays
              </NavLink>
              <NavLink
                to="/leave/documents"
                className={({ isActive }) =>
                  `payroll-nav__link${isActive ? ' payroll-nav__link--active' : ''}`
                }
              >
                <span className="payroll-nav__icon"><IcoFolder /></span>
                Documents
              </NavLink>
              <NavLink
                to="/leave/notifications"
                className={({ isActive }) =>
                  `payroll-nav__link${isActive ? ' payroll-nav__link--active' : ''}`
                }
              >
                <span className="payroll-nav__icon"><IcoBell /></span>
                Notifications
              </NavLink>

              <div style={sectionLabelStyle}>Other</div>
              <NavLink
                to="/leave/settings"
                className={({ isActive }) =>
                  `payroll-nav__link${isActive ? ' payroll-nav__link--active' : ''}`
                }
              >
                <span className="payroll-nav__icon"><IcoSettings /></span>
                Settings
              </NavLink>
              <NavLink
                to="/leave/help"
                className={({ isActive }) =>
                  `payroll-nav__link${isActive ? ' payroll-nav__link--active' : ''}`
                }
              >
                <span className="payroll-nav__icon"><IcoHelp /></span>
                Help & Support
              </NavLink>
            </>
          ) : (
            <>
              <div style={sectionLabelStyle}>HR Management Dashboard</div>
              <NavLink
                to="/leave/approvals"
                className={({ isActive }) =>
                  `payroll-nav__link${isActive ? ' payroll-nav__link--active' : ''}`
                }
              >
                <span className="payroll-nav__icon"><IcoCheckSquare /></span>
                Pending Approvals
              </NavLink>
              <NavLink
                to="/leave/balances"
                className={({ isActive }) =>
                  `payroll-nav__link${isActive ? ' payroll-nav__link--active' : ''}`
                }
              >
                <span className="payroll-nav__icon"><IcoUsers /></span>
                Employee Balances
              </NavLink>
              <NavLink
                to="/leave/types"
                className={({ isActive }) =>
                  `payroll-nav__link${isActive ? ' payroll-nav__link--active' : ''}`
                }
              >
                <span className="payroll-nav__icon"><IcoSettings /></span>
                Leave Types & Policies
              </NavLink>
            </>
          )}
        </nav>
      </aside>

      <main className="payroll-main">
        <Outlet />
      </main>
    </div>
  );
}
