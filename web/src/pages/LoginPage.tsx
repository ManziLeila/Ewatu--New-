import { type FormEvent, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { fetchMe, loginRequest, resendVerificationRequest } from '../api';
import { postLoginLandingPath } from '../lib/postLoginLanding';
import { setRememberMe } from '../auth/token';
import { AuthErrorAlert } from '../components/AuthErrorAlert';
import { AuthLayout } from '../components/AuthLayout';
import { parseApiError, type ParsedApiError } from '../lib/parseApiError';
import { useAuthLoggedIn } from '../hooks/useAuthLoggedIn';
import { resolveReturnPath } from '../lib/returnPath';

export function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const loggedIn = useAuthLoggedIn();
  const sp = new URLSearchParams(location.search);
  const fromState = (location.state as { from?: string } | null)?.from;
  const returnPath = resolveReturnPath(sp, fromState, '/platform');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState<ParsedApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const needsEmailActivation = err?.code === 'EMAIL_NOT_VERIFIED' || /email_not_verified/i.test(err?.message ?? '');

  if (loggedIn) {
    return <Navigate to={returnPath} replace />;
  }

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    setErr(null);
    setResendMsg(null);
    setBusy(true);
    try {
      setRememberMe(remember);
      await loginRequest(email.trim(), password);
      const me = await fetchMe();
      const dest =
        returnPath !== '/platform' && returnPath !== '/'
          ? returnPath
          : postLoginLandingPath(me.roles);
      navigate(dest, { replace: true });
    } catch (e) {
      setErr(parseApiError(e, 'auth'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      introEyebrow="Sign in"
      introTitle="Welcome back"
      introContent={
        <>
          <p className="auth-intro__lead">
            Access your workspace with the credentials you created during registration.
          </p>
          <ul className="auth-intro__list">
            <li>Sign up as a company to get access.</li>
            <li>Your dashboard reflects your role: platform operator or company administrator.</li>
          </ul>
        </>
      }
    >
      <h2 className="auth-heading auth-heading--compact">Sign in</h2>
      <p className="auth-lead auth-lead--tight">Enter your credentials to continue.</p>
      {err && <AuthErrorAlert error={err} />}
      {needsEmailActivation && (
        <div className="alert alert--ok" style={{ marginBottom: '1rem' }}>
          <p style={{ margin: '0 0 0.5rem' }}>
            {resendMsg ??
              'We send activation links to your real email address. Check inbox and spam, then open the link before signing in again.'}
          </p>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={resendBusy || !email.trim()}
            onClick={async () => {
              setResendBusy(true);
              setResendMsg(null);
              try {
                const r = await resendVerificationRequest(email.trim());
                setResendMsg(r.message);
              } catch (e) {
                setResendMsg(parseApiError(e, 'auth').message);
              } finally {
                setResendBusy(false);
              }
            }}
          >
            {resendBusy ? 'Sending…' : 'Resend activation email'}
          </button>
        </div>
      )}
      <form className="auth-form" onSubmit={onSubmit}>
        <label className="auth-label">
          Email address
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="auth-input"
            placeholder="you@company.com"
          />
        </label>
        <label className="auth-label">
          Password
          <span className="auth-input-group">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="auth-input"
              placeholder="••••••••"
            />
            <button
              type="button"
              className="auth-input-toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.5 5.6A9.8 9.8 0 0112 5c5 0 9 4 10 7-.4 1.2-1.2 2.5-2.3 3.6M6.6 6.6C4.6 8 3.2 9.9 2 12c1 3 5 7 10 7 1.3 0 2.6-.3 3.7-.8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
                </svg>
              )}
            </button>
          </span>
        </label>
        <div className="auth-row-between">
          <label className="auth-checkbox-label">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Remember me
          </label>
          <Link to="/forgot-password" className="auth-link-inline">
            Forgot password?
          </Link>
        </div>
        <button type="submit" className="btn btn--block btn--primary btn--lg" disabled={busy}>
          {busy ? (
            <>
              <span className="auth-btn-spinner" aria-hidden />
              Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </button>
      </form>
      <p className="auth-alt">
        New company?{' '}
        <Link to="/register-company" className="auth-alt__emph">
          Apply for a workspace
        </Link>
      </p>
      <p className="auth-footnote">
        <Link to="/">← Back to home</Link>
      </p>
    </AuthLayout>
  );
}
