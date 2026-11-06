import { Link } from 'react-router-dom';
import { PublicNav } from '../components/PublicNav';
import { useAppPreferences } from '../lib/app-preferences';
import { LandingHeroVisual } from './LandingHeroVisual';
import { HrShowcaseSection } from './HrShowcaseSection';
import './landing-hero.css';

const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    color: 'blue',
    title: 'Recruitment & ATS',
    desc: 'Jobs, candidates, interviews, offers and placements — one pipeline from application to hire.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>
      </svg>
    ),
    color: 'green',
    title: 'Payroll & Compliance',
    desc: 'PAYE, RSSB, CBHI and RAMA built in. Payslips, approvals and bank files in minutes.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
      </svg>
    ),
    color: 'purple',
    title: 'Document Management',
    desc: 'Contracts, IDs and certificates stored securely with presigned uploads.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
      </svg>
    ),
    color: 'orange',
    title: 'Talent Pool',
    desc: 'Curate and search past applicants. Fill roles faster from your own database.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    ),
    color: 'teal',
    title: 'Notifications',
    desc: 'Email and in-app alerts for approvals, onboarding and contract milestones.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
    color: 'indigo',
    title: 'Multi-Tenant ERP',
    desc: 'Run multiple client companies with isolated data and role-based access.',
  },
];

const solutions = [
  {
    tag: 'HR Teams',
    color: 'blue',
    title: 'Hire, onboard and manage people in one system',
    points: ['Full recruitment pipeline', 'Employee records & contracts', 'Leave and approvals', 'Public careers portal'],
    cta: 'See HR features',
  },
  {
    tag: 'Finance',
    color: 'green',
    title: 'Payroll that stays compliant by default',
    points: ['Rwanda statutory deductions', 'Multi-stage approval workflow', 'Payslip & bank file export', 'Outsourcing & billing'],
    cta: 'See payroll features',
  },
  {
    tag: 'Leadership',
    color: 'purple',
    title: 'Visibility across every client you serve',
    points: ['Workforce dashboards', 'Client payroll portal', 'Audit-ready reports', 'Tenant administration'],
    cta: 'See platform features',
  },
];

const logos = ['Horizon HR', 'Summit Talent', 'BluePeak', 'Northwind', 'Kigali Staffing'];

const complianceBadges = ['PAYE (RRA)', 'RSSB Pension', 'RSSB Medical', 'CBHI / RAMA', 'Labour Law'];

const steps = [
  {
    title: 'Register your company',
    desc: 'Submit your organisation details and create your administrator account in minutes.',
  },
  {
    title: 'Verify & get approved',
    desc: 'Confirm your email, then our team activates your secure multi-tenant workspace.',
  },
  {
    title: 'Run HR operations',
    desc: 'Recruit, pay, store documents and manage clients — all from one branded portal.',
  },
];

const trustItems = [
  {
    title: 'Role-based access',
    desc: 'Granular permissions per module',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    title: 'Audit trail',
    desc: 'Every approval is logged',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    ),
  },
  {
    title: 'Cloud hosted',
    desc: 'Always available, always backed up',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
      </svg>
    ),
  },
  {
    title: 'Multi-tenant',
    desc: 'Isolated data per client',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
];

export function LandingPage() {
  const { resolvedTheme } = useAppPreferences();

  return (
    <div className="landing">
      <PublicNav variant={resolvedTheme} />

      <section className="landing-hero">
        <div className="landing-hero__inner">
          <div className="landing-hero__copy">
            <p className="landing-hero__eyebrow">Enterprise HR & Payroll ERP</p>
            <h1 className="landing-hero__title">
              The operating system for{' '}
              <span className="landing-hero__title-accent">modern HR firms</span>
            </h1>
            <p className="landing-hero__desc">
              E-Watu unifies recruitment, payroll, documents and client management — built for Rwanda compliance and
              ready to scale across East Africa.
            </p>
            <div className="landing-hero__ctas">
              <Link to="/register-company" className="landing-hero__btn landing-hero__btn--primary">
                Start free trial
                <svg viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <a href="#about" className="landing-hero__btn landing-hero__btn--ghost">
                Book a demo
              </a>
            </div>
            <ul className="landing-hero__checks">
              <li>Rwanda PAYE, RSSB & CBHI ready</li>
              <li>Multi-tenant for HR agencies</li>
              <li>Setup in under 10 minutes</li>
            </ul>
          </div>
          <LandingHeroVisual />
        </div>

        <div className="landing-hero__logos">
          <span className="landing-hero__logos-label">Trusted by growing HR teams</span>
          <div className="landing-hero__logos-row">
            {logos.map((name) => (
              <span key={name} className="landing-hero__logo-pill">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="ls-compliance" aria-label="Rwanda compliance">
        <div className="ls-compliance__inner">
          <div className="ls-compliance__copy">
            <h2>Built for Rwanda compliance</h2>
            <p>Statutory payroll and HR rules configured out of the box — not bolted on later.</p>
          </div>
          <div className="ls-compliance__badges">
            {complianceBadges.map((b) => (
              <span key={b} className="ls-compliance__badge">
                {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      <HrShowcaseSection />

      <section id="features" className="ls-section ls-section--alt">
        <div className="ls-container">
          <div className="ls-section-header">
            <span className="ls-eyebrow">Platform</span>
            <h2 className="ls-section-title">One ERP for the full employee lifecycle</h2>
            <p className="ls-section-sub">
              From first application to final payslip — every module shares the same data, roles and audit trail.
            </p>
          </div>
          <div className="ls-features-grid">
            {features.map((f) => (
              <div key={f.title} className={`ls-feature-card ls-feature-card--${f.color}`}>
                <div className="ls-feature-card__icon">{f.icon}</div>
                <h3 className="ls-feature-card__title">{f.title}</h3>
                <p className="ls-feature-card__desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="ls-section">
        <div className="ls-container">
          <div className="ls-section-header">
            <span className="ls-eyebrow">Get started</span>
            <h2 className="ls-section-title">Up and running in three steps</h2>
            <p className="ls-section-sub">From registration to your first payroll run — a clear path with no guesswork.</p>
          </div>
          <div className="ls-steps">
            {steps.map((step, i) => (
              <div key={step.title} className="ls-step-card">
                <div className="ls-step-card__num">{i + 1}</div>
                <h3 className="ls-step-card__title">{step.title}</h3>
                <p className="ls-step-card__desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="solutions" className="ls-section ls-section--alt">
        <div className="ls-container">
          <div className="ls-section-header">
            <span className="ls-eyebrow">Solutions</span>
            <h2 className="ls-section-title">Built for every team you support</h2>
            <p className="ls-section-sub">
              Whether you run HR operations, finance or executive oversight — E-Watu gives each team the right tools.
            </p>
          </div>
          <div className="ls-solutions-grid">
            {solutions.map((s) => (
              <div key={s.tag} className={`ls-solution-card ls-solution-card--${s.color}`}>
                <span className="ls-solution-card__tag">{s.tag}</span>
                <h3 className="ls-solution-card__title">{s.title}</h3>
                <ul className="ls-solution-card__list">
                  {s.points.map((p) => (
                    <li key={p}>
                      <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                        <path d="M13.5 3.5L6 11 2.5 7.5l-1 1L6 13l8.5-8.5z" />
                      </svg>
                      {p}
                    </li>
                  ))}
                </ul>
                <a href="#features" className="ls-solution-card__cta">
                  {s.cta} →
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="ls-section">
        <div className="ls-container">
          <div className="ls-section-header">
            <span className="ls-eyebrow">Enterprise ready</span>
            <h2 className="ls-section-title">Secure, scalable and audit-ready</h2>
            <p className="ls-section-sub">The infrastructure HR firms need when managing sensitive payroll and employee data.</p>
          </div>
          <div className="ls-trust-grid">
            {trustItems.map((item) => (
              <div key={item.title} className="ls-trust-item">
                <div className="ls-trust-item__icon">{item.icon}</div>
                <strong>{item.title}</strong>
                <span>{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="ls-section ls-section--alt">
        <div className="ls-container">
          <div className="ls-section-header">
            <span className="ls-eyebrow">Pricing</span>
            <h2 className="ls-section-title">Plans tailored to your organisation</h2>
            <p className="ls-section-sub">Flexible pricing based on headcount, modules and support — no hidden fees.</p>
          </div>
          <div className="ls-pricing-card">
            <div className="ls-pricing-card__left">
              <div className="ls-pricing-card__badge">Custom pricing</div>
              <h3 className="ls-pricing-card__title">We build the right plan around how you work</h3>
              <ul className="ls-pricing-card__perks">
                <li>
                  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden><path d="M13.5 3.5L6 11 2.5 7.5l-1 1L6 13l8.5-8.5z" /></svg>
                  Recruitment, payroll & document modules
                </li>
                <li>
                  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden><path d="M13.5 3.5L6 11 2.5 7.5l-1 1L6 13l8.5-8.5z" /></svg>
                  Rwanda statutory compliance included
                </li>
                <li>
                  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden><path d="M13.5 3.5L6 11 2.5 7.5l-1 1L6 13l8.5-8.5z" /></svg>
                  Dedicated onboarding & support
                </li>
                <li>
                  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden><path d="M13.5 3.5L6 11 2.5 7.5l-1 1L6 13l8.5-8.5z" /></svg>
                  Multi-tenant or single-company deployment
                </li>
              </ul>
            </div>
            <div className="ls-pricing-card__right">
              <p className="ls-pricing-card__cta-label">Ready to see it in action?</p>
              <a href="#about" className="ls-btn ls-btn--primary ls-btn--lg">Book a free demo</a>
              <Link to="/register-company" className="ls-btn ls-btn--ghost">Start free trial</Link>
              <p className="ls-pricing-card__note">No credit card required.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="ls-cta-band">
        <div className="ls-cta-band__inner">
          <h2>Ready to modernise your HR operations?</h2>
          <p>Join HR firms using E-Watu to recruit, pay and comply — all in one platform.</p>
          <div className="ls-cta-band__actions">
            <Link to="/register-company" className="ls-cta-band__btn ls-cta-band__btn--primary">
              Start free trial
            </Link>
            <a href="#about" className="ls-cta-band__btn ls-cta-band__btn--ghost">
              Talk to sales
            </a>
          </div>
        </div>
      </section>

      <section id="about" className="ls-section ls-section--dark">
        <div className="ls-container">
          <div className="ls-about-grid">
            <div className="ls-about-copy">
              <span className="ls-eyebrow ls-eyebrow--light">About E-Watu</span>
              <h2 className="ls-section-title ls-section-title--light">
                HR ERP built for Africa&apos;s compliance reality
              </h2>
              <p className="ls-about-desc">
                E-Watu was designed for HR and finance teams across Rwanda and East Africa — from statutory payroll to
                managing outsourced workforces across multiple client sites.
              </p>
              <p className="ls-about-desc">
                RRA, RSSB, CBHI and labour law requirements are built in, so your team focuses on people — not
                spreadsheets.
              </p>
              <div className="ls-about-stats">
                <div className="ls-about-stat">
                  <div className="ls-about-stat__num">7+</div>
                  <div className="ls-about-stat__label">Integrated modules</div>
                </div>
                <div className="ls-about-stat">
                  <div className="ls-about-stat__num">100%</div>
                  <div className="ls-about-stat__label">Rwanda compliant</div>
                </div>
                <div className="ls-about-stat">
                  <div className="ls-about-stat__num">24/7</div>
                  <div className="ls-about-stat__label">Cloud availability</div>
                </div>
              </div>
            </div>
            <div className="ls-contact-card">
              <h3 className="ls-contact-card__title">Book a demo</h3>
              <p className="ls-contact-card__sub">Live walkthrough tailored to your organisation and modules.</p>
              <form className="ls-contact-form" onSubmit={(e) => e.preventDefault()}>
                <div className="ls-contact-form__row">
                  <label>
                    <span>Full name</span>
                    <input type="text" placeholder="Jane Uwera" />
                  </label>
                  <label>
                    <span>Work email</span>
                    <input type="email" placeholder="jane@company.rw" />
                  </label>
                </div>
                <label>
                  <span>Company name</span>
                  <input type="text" placeholder="Acme Ltd" />
                </label>
                <label>
                  <span>Team size</span>
                  <select defaultValue="">
                    <option value="">Select...</option>
                    <option>1–20 employees</option>
                    <option>21–100 employees</option>
                    <option>101–500 employees</option>
                    <option>500+ employees</option>
                  </select>
                </label>
                <button type="submit" className="ls-btn ls-btn--primary ls-btn--full">
                  Request a demo
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <footer className="ls-footer">
        <div className="ls-container ls-footer__inner">
          <div className="ls-footer__brand">
            <span className="ls-footer__logo">E-Watu</span>
            <span className="ls-footer__tagline">HR & Payroll ERP for Africa</span>
          </div>
          <nav className="ls-footer__links" aria-label="Footer">
            <a href="#features">Platform</a>
            <a href="#solutions">Solutions</a>
            <a href="#pricing">Pricing</a>
            <a href="#about">Contact</a>
            <Link to="/login">Log in</Link>
          </nav>
          <p className="ls-footer__copy">© {new Date().getFullYear()} E-Watu. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
