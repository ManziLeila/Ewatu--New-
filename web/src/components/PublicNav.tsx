import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from './app/ThemeToggle';
import { useAppPreferences } from '../lib/app-preferences';
import { useAuthLoggedIn } from '../hooks/useAuthLoggedIn';

type PublicNavProps = {
  variant?: 'dark' | 'light';
};

type DropdownItem = {
  label: string;
  desc: string;
  href: string;
};

type NavItem = {
  label: string;
  href: string;
  dropdown?: DropdownItem[];
};

const navItems: NavItem[] = [
  {
    label: 'Platform',
    href: '#features',
    dropdown: [
      { label: 'Recruitment & ATS', desc: 'Jobs, candidates, interviews and offers', href: '#features' },
      { label: 'Payroll & Compliance', desc: 'PAYE, RSSB, CBHI — automated', href: '#features' },
      { label: 'Document Management', desc: 'Contracts and files, securely stored', href: '#features' },
      { label: 'Talent Pool', desc: 'Build and search curated candidate pools', href: '#features' },
      { label: 'Multi-Tenant ERP', desc: 'Manage multiple clients in one place', href: '#features' },
    ],
  },
  {
    label: 'Solutions',
    href: '#solutions',
    dropdown: [
      { label: 'For HR Teams', desc: 'End-to-end hiring and employee management', href: '#solutions' },
      { label: 'For Finance', desc: 'Rwanda-compliant payroll automation', href: '#solutions' },
      { label: 'For Leadership', desc: 'Workforce visibility and approvals', href: '#solutions' },
    ],
  },
  {
    label: 'How it works',
    href: '#how-it-works',
  },
  {
    label: 'Pricing',
    href: '#pricing',
  },
  {
    label: 'Contact',
    href: '#about',
  },
];

function NavDropdown({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!item.dropdown) {
    return (
      <a className="pnav__link" href={item.href}>
        {item.label}
      </a>
    );
  }

  return (
    <div
      ref={ref}
      className={`pnav__item${open ? ' pnav__item--open' : ''}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        className="pnav__link pnav__link--trigger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {item.label}
        <svg className="pnav__chevron" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </button>

      {open && (
        <div className="pnav__dropdown">
          {item.dropdown.map((d) => (
            <a key={d.label} href={d.href} className="pnav__dropdown-item" onClick={() => setOpen(false)}>
              <span className="pnav__dropdown-text">
                <span className="pnav__dropdown-label">{d.label}</span>
                <span className="pnav__dropdown-desc">{d.desc}</span>
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export function PublicNav({ variant }: PublicNavProps) {
  const loggedIn = useAuthLoggedIn();
  const { resolvedTheme } = useAppPreferences();
  const isLight = variant ? variant === 'light' : resolvedTheme === 'light';

  return (
    <header className={`pnav${isLight ? ' pnav--light' : ' pnav--dark'}`}>
      <Link to="/" className="pnav__brand">
        <span className="pnav__logo-icon" aria-hidden>
          <svg viewBox="0 0 24 24">
            <path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
          </svg>
        </span>
        <span className="pnav__brand-copy">
          <span className="pnav__brand-name">E-Watu</span>
          <span className="pnav__brand-sub">HR & Payroll ERP</span>
          <span className="pnav__brand-powered">Powered by HC Solutions</span>
        </span>
      </Link>

      <nav className="pnav__links" aria-label="Primary">
        {navItems.map((item) => (
          <NavDropdown key={item.label} item={item} />
        ))}
      </nav>

      <div className="pnav__actions">
        <ThemeToggle variant="adm" className="pnav__theme-toggle" />
        {loggedIn ? (
          <Link to="/platform" className="pnav__btn pnav__btn--primary">
            Dashboard
          </Link>
        ) : (
          <>
            <Link to="/login" className="pnav__link pnav__link--muted">
              Log in
            </Link>
            <Link to="/register-company" className="pnav__btn pnav__btn--primary">
              Get started
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
