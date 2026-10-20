import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { fetchMe } from '../api';
import {
  hasAnyRole,
  HR_DASHBOARD_ROLES,
  PAYROLL_ROLES,
  RECRUITMENT_ROLES,
  TALENT_POOL_ROLES,
  isCompanyAdminOnly,
  isExecutiveLeader,
} from '../lib/roles';
import { clearAuthTokens } from '../auth/token';
import { isAuthFailureStatus } from '../lib/auth-session';
import { ThemeToggle } from '../components/app/ThemeToggle';
import { useCapabilities } from '../lib/capabilities';
import './admin-layout.css';

export type AdminMe = {
  sub: string;
  email?: string;
  username?: string;
  roles: string[];
  tenant_id?: string;
  tenant_status?: string;
};

export type AdminOutletContext = {
  me: AdminMe;
  isSuper: boolean;
  reloadMe: () => Promise<void>;
};

// ── Sidebar SVG icons ─────────────────────────────────────────────────────────

const IcoDashboard = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
);

const IcoRecruitment = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2"/>
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
  </svg>
);

const IcoPayroll = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2"/>
    <line x1="2" y1="10" x2="22" y2="10"/>
  </svg>
);

const IcoUsers = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const IcoTarget = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="6"/>
    <circle cx="12" cy="12" r="2"/>
  </svg>
);

const IcoSettings = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const IcoTenants = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const IcoSystem = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
    <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
    <line x1="6" y1="6" x2="6.01" y2="6"/>
    <line x1="6" y1="18" x2="6.01" y2="18"/>
  </svg>
);

const IcoReceipt = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9"/>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </svg>
);

const IcoKey = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="15.5" r="5.5"/>
    <path d="M21 2l-9.6 9.6"/>
    <path d="M15.5 7.5l3 3L22 7l-3-3"/>
  </svg>
);

const IcoLogout = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const IcoCalendar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IcoUserCircle = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="10" r="3" /><path d="M6.5 19a6 6 0 0 1 11 0" />
  </svg>
);

const IcoBookOpen = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

const IcoClipboard = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const IcoMegaphone = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11l18-5v12L3 13v-2z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
  </svg>
);

const IcoCheckSquare = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);

const IcoBarChart = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" />
  </svg>
);

const IcoClock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

const IcoGraduationCap = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10L12 5 2 10l10 5 10-5z" /><path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" />
  </svg>
);

const IcoAlertTriangle = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IcoFileText = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const IcoShieldToggle = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

// ── Nav helpers ───────────────────────────────────────────────────────────────

function NavSection({ label }: { label: string }) {
  return <div className="adm-nav__section">{label}</div>;
}

function NavItem({ to, icon, label, end }: {
  to: string;
  icon: ReactNode;
  label: string;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `adm-nav__link${isActive ? ' adm-nav__link--active' : ''}`}
    >
      <span className="adm-nav__icon">{icon}</span>
      {label}
    </NavLink>
  );
}

// ── Layout component ──────────────────────────────────────────────────────────

export function AdminLayout() {
  const navigate = useNavigate();
  const { hasModule, loading: capabilitiesLoading } = useCapabilities();
  const licensed = (moduleId: string) => capabilitiesLoading || hasModule(moduleId);
  const [me, setMe] = useState<AdminMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setMe(await fetchMe());
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const status = Number(msg.split(':')[0]);
      if (isAuthFailureStatus(status)) {
        clearAuthTokens();
        navigate('/login', { replace: true });
        return;
      }
      setLoadError(
        status === 429
          ? 'Too many profile checks in a short time. Please wait a few seconds, then retry.'
          : 'Could not load your profile. The server may be restarting — try again in a moment.',
      );
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  const isSuper = me?.roles.includes('PLATFORM_SUPER_ADMIN') ?? false;
  // A tenant that isn't ACTIVE/TRIAL only gets the dashboard's status banner — everything else
  // 403s server-side (TenantStatusGuard) anyway, so don't offer nav links that would just fail.
  const tenantActive = !me?.tenant_id || ['ACTIVE', 'TRIAL'].includes(me.tenant_status ?? 'ACTIVE');
  const companyAdminOnly = me ? isCompanyAdminOnly(me.roles) : false;
  const showRecruitment = me && !companyAdminOnly ? hasAnyRole(me.roles, RECRUITMENT_ROLES) : false;
  const showTalentPool = me && !companyAdminOnly ? hasAnyRole(me.roles, TALENT_POOL_ROLES) : false;
  const showPayroll = me && !companyAdminOnly ? hasAnyRole(me.roles, PAYROLL_ROLES) : false;
  // Leave/Performance — staff & HR/finance roles (not Company Admin-only accounts).
  const showLeaveAndPerformance =
    me && !companyAdminOnly
      ? hasAnyRole(me.roles, [...PAYROLL_ROLES, 'TENANT_STAFF', 'MANAGING_DIRECTOR'])
      : false;
  const showTeamManagement = me ? hasAnyRole(me.roles, ['TENANT_ADMIN']) : false;
  const showDepartments = me ? hasAnyRole(me.roles, ['TENANT_ADMIN', 'HR_MANAGER', 'MANAGING_DIRECTOR']) : false;
  const showHrDashboard = me ? hasAnyRole(me.roles, [...HR_DASHBOARD_ROLES]) : false;
  const showExecutive = me ? isExecutiveLeader(me.roles) : false;
  const showSettings = me ? hasAnyRole(me.roles, ['TENANT_ADMIN']) : false;
  const displayName = me?.username ?? me?.email ?? 'User';
  const initials = displayName.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const roleLabel = me?.roles[0]?.replace(/_/g, ' ') ?? 'User';

  const onLogout = () => {
    clearAuthTokens();
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="adm-boot">
        <p className="muted">Loading workspace…</p>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="adm-boot">
        {loadError && (
          <div className="alert alert--err" role="alert">
            {loadError}
          </div>
        )}
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => { setLoading(true); load(); }}
        >
          Retry
        </button>
      </div>
    );
  }

  const outletContext: AdminOutletContext = { me, isSuper, reloadMe: load };

  return (
    <div className="adm-shell">
      <aside className="adm-sidebar">
        {/* Brand */}
        <div className="adm-sidebar__brand">
          <Link to="/" className="adm-sidebar__home">
            <span className="adm-sidebar__logo-mark">E</span>
            <span className="adm-sidebar__logo-text">-Watu</span>
          </Link>
          <div className="adm-sidebar__subtitle">
            {isSuper ? 'Platform control' : companyAdminOnly ? 'Company admin' : 'HR Platform'}
          </div>
        </div>

        {/* Navigation */}
        <nav className="adm-nav" aria-label="Admin">
          <NavSection label="Main" />

          <NavItem to="/platform" end icon={<IcoDashboard />} label="Dashboard" />

          {isSuper && (
            <>
              <NavItem to="/platform/tenants" icon={<IcoTenants />} label="Tenants" />
              <NavItem to="/platform/system" icon={<IcoSystem />} label="System" />
            </>
          )}

          {me.tenant_id && !isSuper && tenantActive && (
            <>
              {showExecutive && (
                <NavItem to="/executive" icon={<IcoTarget />} label="Executive" />
              )}
              {showHrDashboard && (
                <NavItem to="/platform/hr-dashboard" icon={<IcoBarChart />} label="HR Dashboard" />
              )}
              {showRecruitment && licensed('recruitment') && (
                <NavItem to="/recruitment" icon={<IcoRecruitment />} label="Recruitment" />
              )}
              {showPayroll && licensed('payroll') && (
                <NavItem to="/payroll" icon={<IcoPayroll />} label="Payroll" />
              )}
              {showLeaveAndPerformance && licensed('leave') && (
                <NavItem to="/leave" icon={<IcoCalendar />} label="Leave Management" />
              )}
              {showLeaveAndPerformance && licensed('performance') && (
                <NavItem to="/performance/goals" icon={<IcoCheckSquare />} label="Performance" />
              )}
              {me.roles.includes('CLIENT_ADMIN') && (
                <NavItem to="/client-portal/payroll" icon={<IcoReceipt />} label="Payroll Approvals" />
              )}
              {showTalentPool && licensed('talent-pool') && (
                <>
                  <NavItem to="/talent-pool/pools" icon={<IcoTarget />} label="Talent Pools" />
                  <NavItem to="/talent-pool/profiles" icon={<IcoUsers />} label="Pool Profiles" />
                </>
              )}

              <NavSection label="My Profile" />
              <NavItem to="/platform/profile" icon={<IcoUserCircle />} label="My Profile" />
              <NavItem to="/platform/payslips" icon={<IcoReceipt />} label="My Payslips" />
              <NavItem to="/platform/directory" icon={<IcoBookOpen />} label="Directory" />
              <NavItem to="/platform/tasks" icon={<IcoClipboard />} label="Tasks" />
              <NavItem to="/platform/announcements" icon={<IcoMegaphone />} label="Announcements" />
              <NavItem to="/platform/attendance" icon={<IcoClock />} label="Attendance" />
              <NavItem to="/platform/training" icon={<IcoGraduationCap />} label="Training" />
              <NavItem to="/platform/grievances" icon={<IcoAlertTriangle />} label="Grievances" />
              {showHrDashboard && (
                <NavItem to="/platform/documents" icon={<IcoFileText />} label="Documents" />
              )}

              {(showSettings || showTeamManagement || showDepartments) && (
                <>
                  <NavSection label="Others" />
                  {showSettings && (
                    <NavItem to="/platform/settings" icon={<IcoSettings />} label="Settings" />
                  )}
                  {showTeamManagement && (
                    <NavItem to="/platform/users" icon={<IcoUsers />} label="Team" />
                  )}
                  {showTeamManagement && (
                    <NavItem to="/platform/accessibility" icon={<IcoShieldToggle />} label="Accessibility" />
                  )}
                  {showDepartments && (
                    <NavItem to="/platform/departments" icon={<IcoTenants />} label="Departments" />
                  )}
                </>
              )}
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="adm-sidebar__foot">
          <div className="adm-user">
            <span className="adm-user__avatar" aria-hidden="true">
              {initials}
            </span>
            <div className="adm-user__meta">
              <div className="adm-user__name">{displayName}</div>
              <div className="adm-user__role">{roleLabel}</div>
            </div>
            <Link
              to="/platform/account"
              className="adm-user__logout"
              title="Change password"
              aria-label="Change password"
            >
              <IcoKey />
            </Link>
            <button
              type="button"
              className="adm-user__logout"
              onClick={onLogout}
              title="Log out"
              aria-label="Log out"
            >
              <IcoLogout />
            </button>
          </div>
        </div>
      </aside>

      <main className="adm-main">
        <header className="adm-topbar">
          <div className="adm-topbar__title">
            <span>E-Watu Enterprise Suite</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <ThemeToggle variant="adm" />
            <div className="adm-topbar__status-pill">
              <span className="adm-topbar__pulse"></span>
              <span>{me.tenant_status ? `Tenant ${me.tenant_status}` : 'System Operational'}</span>
            </div>
          </div>
        </header>
        <Outlet context={outletContext} />
      </main>
    </div>
  );
}
