import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPasswordRequest } from '../api';
import { AuthLayout } from '../components/AuthLayout';
import { parseApiError, type ParsedApiError } from '../lib/parseApiError';
import { AuthErrorAlert } from '../components/AuthErrorAlert';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<ParsedApiError | null>(null);

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await forgotPasswordRequest(email.trim());
      setSent(true);
    } catch (e) {
      setErr(parseApiError(e, 'auth'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      introEyebrow="Account recovery"
      introTitle="Forgot your password?"
      introContent={
        <>
          <p className="auth-intro__lead">
            Enter the email address on your account and we'll send you a link to reset your password.
          </p>
        </>
      }
    >
      {sent ? (
        <div className="auth-success auth-success--compact">
          <div className="auth-success__icon auth-success__icon--sm" aria-hidden>
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
          <h2 className="auth-heading">Password reset link sent successfully.</h2>
          <p className="auth-lead auth-lead--tight">
            If an account exists for {email.trim()}, you'll receive an email with instructions shortly.
          </p>
          <Link to="/login" className="btn btn--primary btn--lg btn--block">
            Back to sign in
          </Link>
        </div>
      ) : (
        <>
          <h2 className="auth-heading auth-heading--compact">Reset your password</h2>
          <p className="auth-lead auth-lead--tight">We'll email you a secure reset link.</p>
          {err && <AuthErrorAlert error={err} />}
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
            <button type="submit" className="btn btn--block btn--primary btn--lg" disabled={busy}>
              {busy ? (
                <>
                  <span className="auth-btn-spinner" aria-hidden />
                  Sending…
                </>
              ) : (
                'Send reset link'
              )}
            </button>
          </form>
          <p className="auth-footnote">
            <Link to="/login">← Back to sign in</Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
