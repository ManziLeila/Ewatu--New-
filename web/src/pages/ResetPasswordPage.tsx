import { type FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPasswordRequest } from '../api';
import { AuthLayout } from '../components/AuthLayout';
import { AuthErrorAlert } from '../components/AuthErrorAlert';
import { parseApiError, type ParsedApiError } from '../lib/parseApiError';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ParsedApiError | null>(null);

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    setErr(null);

    if (!token) {
      setErr({ title: 'Invalid link', message: 'This reset link is missing its token.', variant: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setErr({ title: "Passwords don't match", message: 'Please re-enter matching passwords.', variant: 'error' });
      return;
    }

    setBusy(true);
    try {
      await resetPasswordRequest(token, newPassword);
      navigate('/login?reset=1', { replace: true });
    } catch (e) {
      setErr(parseApiError(e, 'auth'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout introEyebrow="Account recovery" introTitle="Choose a new password" introContent={<></>}>
      <h2 className="auth-heading auth-heading--compact">Reset your password</h2>
      <p className="auth-lead auth-lead--tight">Enter a new password for your account.</p>
      {err && <AuthErrorAlert error={err} />}
      <form className="auth-form" onSubmit={onSubmit}>
        <label className="auth-label">
          New password
          <input
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={10}
            className="auth-input"
            placeholder="At least 10 characters"
          />
        </label>
        <label className="auth-label">
          Confirm new password
          <input
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={10}
            className="auth-input"
            placeholder="Re-enter password"
          />
        </label>
        <button type="submit" className="btn btn--block btn--primary btn--lg" disabled={busy}>
          {busy ? (
            <>
              <span className="auth-btn-spinner" aria-hidden />
              Resetting…
            </>
          ) : (
            'Reset password'
          )}
        </button>
      </form>
      <p className="auth-footnote">
        <Link to="/login">← Back to sign in</Link>
      </p>
    </AuthLayout>
  );
}
