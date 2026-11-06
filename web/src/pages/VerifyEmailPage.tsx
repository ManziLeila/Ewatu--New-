import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { resendVerificationRequest, verifyEmailRequest } from '../api';
import { AuthErrorAlert } from '../components/AuthErrorAlert';
import { AuthLayout } from '../components/AuthLayout';
import { parseApiError, type ParsedApiError } from '../lib/parseApiError';

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [status, setStatus] = useState<'idle' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState<ParsedApiError | null>(null);
  const [email, setEmail] = useState('');
  const [resendBusy, setResendBusy] = useState(false);
  const verifyLock = useRef(false);

  const canResend =
    err?.code === 'VERIFY_LINK_INVALID' ||
    err?.title === 'Invalid link' ||
    err?.code === 'EMAIL_NOT_VERIFIED';

  useEffect(() => {
    if (!token) {
      setStatus('err');
      setErr({
        title: 'Invalid link',
        message:
          'Open the full link from your activation email. If you lost it, enter your admin email below and we will send a new one.',
        code: 'VERIFY_LINK_INVALID',
        variant: 'warning',
      });
      return;
    }
    const storageKey = `ewatu-verify:${token}`;
    const prior = sessionStorage.getItem(storageKey);
    if (prior === 'ok') {
      setStatus('ok');
      setMsg('Your email is verified. You can sign in now.');
      return;
    }
    if (prior === 'pending' || verifyLock.current) {
      return;
    }
    verifyLock.current = true;
    sessionStorage.setItem(storageKey, 'pending');

    let cancelled = false;
    (async () => {
      try {
        await verifyEmailRequest(token);
        sessionStorage.setItem(storageKey, 'ok');
        if (!cancelled) {
          setStatus('ok');
          setMsg('Your email is verified. You can sign in now.');
          toast.success('Email verified — you can sign in now.');
          window.setTimeout(() => {
            navigate('/login?verified=1', { replace: true });
          }, 2500);
        }
      } catch (e) {
        sessionStorage.removeItem(storageKey);
        verifyLock.current = false;
        if (!cancelled) {
          setStatus('err');
          setErr(parseApiError(e, 'auth'));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, navigate]);

  const onResend = async (ev: FormEvent) => {
    ev.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setResendBusy(true);
    try {
      const r = await resendVerificationRequest(trimmed);
      if (r.alreadyVerified) {
        toast.info(r.message);
      } else if (r.sent === false) {
        toast.error(r.message);
      } else {
        toast.success(r.message);
      }
    } catch (e) {
      const parsed = parseApiError(e, 'auth');
      toast.error(parsed.message);
    } finally {
      setResendBusy(false);
    }
  };

  return (
    <AuthLayout
      introEyebrow="Security"
      introTitle="Email verification"
      introContent={
        <>
          <p className="auth-intro__lead">
            We confirm your inbox before activating sign-in. This step completes the link between your tenant application
            and the administrator identity.
          </p>
          <ul className="auth-intro__list">
            <li>Use the link from your verification email (or the demo link shown after registration).</li>
            <li>Approval is still required before day-to-day use of the tenant.</li>
          </ul>
        </>
      }
    >
      {status === 'idle' && (
        <div className="auth-verify-idle">
          <div className="auth-spinner" aria-hidden />
          <p className="auth-heading auth-heading--compact">Confirming your inbox…</p>
          <p className="auth-lead auth-lead--tight">This usually takes a moment.</p>
        </div>
      )}
      {status === 'ok' && (
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
          <h2 className="auth-heading">You’re verified</h2>
          <p className="auth-lead auth-lead--tight">{msg}</p>
          <Link to="/login" className="btn btn--primary btn--lg btn--block">
            Continue to sign in
          </Link>
          <p className="auth-footnote auth-footnote--center">
            <Link to="/">← Back to home</Link>
          </p>
        </div>
      )}
      {status === 'err' && err && (
        <>
          <h2 className="auth-heading auth-heading--compact">Couldn’t verify</h2>
          <AuthErrorAlert error={err} />
          {canResend && (
            <div className="auth-verify-recovery">
              <p className="auth-verify-recovery__lead">Send a fresh activation link to your admin email:</p>
              <form className="auth-form" onSubmit={onResend}>
                <label className="auth-label">
                  Email address
                  <input
                    type="email"
                    autoComplete="email"
                    className="auth-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                  />
                </label>
                <button type="submit" className="btn btn--primary btn--block" disabled={resendBusy || !email.trim()}>
                  {resendBusy ? 'Sending…' : 'Resend activation email'}
                </button>
              </form>
            </div>
          )}
          <p className="auth-alt">
            <Link to="/register-company">Apply for workspace</Link>
            <span className="auth-alt__sep">·</span>
            <Link to="/login">Sign in</Link>
          </p>
          <p className="auth-footnote">
            <Link to="/">← Back to home</Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
