import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { registerCompany } from '../api';
import { AuthLayout } from '../components/AuthLayout';

export function RegisterCompanyPage() {
  const [companyName, setCompanyName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('RW');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminDisplayName, setAdminDisplayName] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{
    message: string;
    slug: string;
    subdomainExample?: string;
  } | null>(null);

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await registerCompany({
        companyName,
        businessEmail,
        phone,
        country: country.toUpperCase(),
        adminEmail,
        adminPassword,
        adminDisplayName: adminDisplayName || undefined,
      });
      setDone({
        message: res.message,
        slug: res.slug,
        subdomainExample: res.access?.subdomainExample,
      });
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      try {
        const j = JSON.parse(raw) as { message?: string | string[] };
        const m = j.message;
        setErr(Array.isArray(m) ? m.join(', ') : m ?? raw);
      } catch {
        setErr(raw);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      wide
      introEyebrow="Company onboarding"
      introTitle="Apply for a workspace"
      introContent={
        <>
          <p className="auth-intro__lead">
            One submission captures your organization and creates the primary administrator. Your tenant stays in{' '}
            <strong>pending approval</strong> until the platform team activates it.
          </p>
          <ol className="auth-intro__steps">
            <li>
              <span className="auth-step__label">Register</span> company details &amp; owner
            </li>
            <li>
              <span className="auth-step__label">Sign in</span> any time to check your application status
            </li>
            <li>
              <span className="auth-step__label">Review</span> by platform operators
            </li>
            <li>
              <span className="auth-step__label">Go live</span> when approved
            </li>
          </ol>
        </>
      }
    >
      {done ? (
        <div className="auth-success">
          <div className="auth-success__icon" aria-hidden>
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2" opacity="0.2" />
              <path
                d="M14 24l8 8 12-16"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2 className="auth-heading">Application received</h2>
          <p className="auth-lead auth-lead--tight">{done.message}</p>
          <p className="muted small" style={{ marginTop: '0.75rem' }}>
            We sent an <strong>activation link</strong> to your administrator email. Open it before signing in.
            In local dev, view messages at{' '}
            <a href="http://localhost:8025" target="_blank" rel="noreferrer">
              Mailpit (localhost:8025)
            </a>
            .
          </p>
          <div className="auth-success__meta">
            <p>
              <span className="auth-success__k">Workspace ID</span>
              <code className="auth-success__code">{done.slug}</code>
            </p>
            {done.subdomainExample ? (
              <p className="muted small">
                Example access pattern: <code>{done.subdomainExample}</code>
              </p>
            ) : null}
          </div>
          <div className="auth-success__actions">
            <Link to="/login" className="btn btn--primary btn--lg">
              Continue to sign in
            </Link>
            <Link to="/" className="btn btn--ghost btn--lg">
              Back to home
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="auth-form-head">
            <h2 className="auth-heading auth-heading--compact">Application form</h2>
            <p className="auth-lead auth-lead--tight">
              Fields below map directly to your tenant record and administrator account.
            </p>
          </div>
          {err && (
            <div className="alert alert--err" role="alert">
              {err}
            </div>
          )}
          <form className="auth-form auth-form--spaced" onSubmit={onSubmit}>
            <fieldset className="auth-fieldset">
              <legend>Company</legend>
              <div className="auth-field-grid">
                <label className="auth-label">
                  Legal or operating name
                  <input
                    className="auth-input"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    maxLength={200}
                    placeholder="e.g. Horizon People Partners Ltd"
                  />
                </label>
                <label className="auth-label">
                  Business email
                  <input
                    type="email"
                    className="auth-input"
                    value={businessEmail}
                    onChange={(e) => setBusinessEmail(e.target.value)}
                    required
                    placeholder="contact@company.com"
                  />
                </label>
                <label className="auth-label">
                  Phone
                  <input
                    className="auth-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder="+250 …"
                    minLength={5}
                  />
                </label>
                <label className="auth-label">
                  Country (ISO 3166-1 alpha-2)
                  <input
                    className="auth-input"
                    value={country}
                    onChange={(e) => setCountry(e.target.value.toUpperCase())}
                    required
                    maxLength={2}
                    minLength={2}
                    placeholder="RW"
                  />
                </label>
              </div>
            </fieldset>
            <fieldset className="auth-fieldset">
              <legend>Company administrator</legend>
              <div className="auth-field-grid">
                <label className="auth-label">
                  Administrator email
                  <input
                    type="email"
                    className="auth-input"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    required
                    placeholder="admin@company.com"
                  />
                </label>
                <label className="auth-label">
                  Display name <span className="muted small fw-normal">optional</span>
                  <input
                    className="auth-input"
                    value={adminDisplayName}
                    onChange={(e) => setAdminDisplayName(e.target.value)}
                    maxLength={120}
                    placeholder="Jean Uwase"
                  />
                </label>
                <label className="auth-label auth-label--full">
                  Password <span className="muted small fw-normal">minimum 10 characters</span>
                  <input
                    type="password"
                    className="auth-input"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    required
                    minLength={10}
                    autoComplete="new-password"
                    placeholder="Create a strong password"
                  />
                </label>
              </div>
            </fieldset>
            <button type="submit" className="btn btn--block btn--primary btn--lg" disabled={busy}>
              {busy ? 'Submitting application…' : 'Submit for review'}
            </button>
          </form>
          <p className="auth-alt">
            Already onboarded? <Link to="/login">Sign in</Link>
            <span className="auth-alt__sep">·</span>
            <Link to="/signup" className="muted">
              Platform operator setup
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
