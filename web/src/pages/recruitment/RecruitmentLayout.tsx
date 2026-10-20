import { useEffect, useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import {
  Briefcase,
  CalendarDays,
  CheckCircle2,
  FileText,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { fetchMe } from '../../api';
import { ThemeToggle } from '../../components/app/ThemeToggle';
import { hasAnyRole, PLACEMENTS_ROLES, RECRUITMENT_ROLES } from '../../lib/roles';

type RecNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

const REC_NAV: RecNavItem[] = [
  { to: '/recruitment/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/recruitment/candidates', label: 'Candidates', icon: Users },
  { to: '/recruitment/interviews', label: 'Interviews', icon: CalendarDays },
  { to: '/recruitment/offers', label: 'Offers', icon: FileText },
];

export function RecruitmentLayout() {
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    fetchMe()
      .then((me) => setRoles(me.roles))
      .catch(() => setRoles([]));
  }, []);

  const showRecruitment = hasAnyRole(roles, RECRUITMENT_ROLES) || roles.length === 0;
  const showPlacements = hasAnyRole(roles, PLACEMENTS_ROLES) || roles.length === 0;

  if (!showRecruitment && roles.length > 0) {
    return (
      <div className="rec-page">
        <p className="muted">You do not have access to recruitment.</p>
        <Link to="/platform">← Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="rec-shell">
      <aside className="rec-sidebar">
        <div className="rec-sidebar__brand">
          <Link to="/platform" className="rec-sidebar__back">← Dashboard</Link>
          <div className="rec-sidebar__title">Recruitment</div>
          <ThemeToggle variant="adm" className="rec-sidebar__theme" />
        </div>
        <nav className="rec-nav" aria-label="Recruitment">
          {REC_NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `rec-nav__link${isActive ? ' rec-nav__link--active' : ''}`
              }
            >
              <span className="rec-nav__icon" aria-hidden>
                <Icon strokeWidth={2} />
              </span>
              {label}
            </NavLink>
          ))}
          {showPlacements && (
            <NavLink
              to="/recruitment/placements"
              className={({ isActive }) =>
                `rec-nav__link${isActive ? ' rec-nav__link--active' : ''}`
              }
            >
              <span className="rec-nav__icon" aria-hidden>
                <CheckCircle2 strokeWidth={2} />
              </span>
              Placements
            </NavLink>
          )}
        </nav>
      </aside>
      <main className="rec-main">
        <Outlet />
      </main>
    </div>
  );
}
