import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  createTenantUser,
  fetchTenantUsers,
  triggerPasswordReset,
  updateTenantUser,
  type UserRow,
} from '../../api';
import { parseError } from './parseError';
import { useAdminContext } from './useAdminContext';
import { ROLE_DESCRIPTIONS, ROLE_OPTIONS } from '../../lib/roleDescriptions';
import { createEmployee } from '../../payrollApi';

function splitDisplayName(displayName: string, email: string): { firstName: string; lastName: string } {
  const trimmed = displayName.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/);
    return {
      firstName: parts[0] ?? 'Employee',
      lastName: parts.slice(1).join(' ') || parts[0] || 'User',
    };
  }
  const local = email.split('@')[0] ?? 'employee';
  const bits = local.split(/[._-]+/);
  return {
    firstName: bits[0] ? bits[0].charAt(0).toUpperCase() + bits[0].slice(1) : 'Employee',
    lastName: bits.slice(1).join(' ') || 'Staff',
  };
}

const EMPLOYEE_LINK_ROLES = new Set([
  'TENANT_STAFF',
  'HR_MANAGER',
  'FINANCE_OFFICER',
  'MANAGING_DIRECTOR',
  'RECRUITER',
  'CLIENT_EMPLOYEE',
]);

function generateStrongPassword(length = 14): string {
  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowers = 'abcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '!@#$%^&*';
  const all = uppers + lowers + numbers + symbols;
  let pass = '';
  pass += uppers[Math.floor(Math.random() * uppers.length)];
  pass += lowers[Math.floor(Math.random() * lowers.length)];
  pass += numbers[Math.floor(Math.random() * numbers.length)];
  pass += symbols[Math.floor(Math.random() * symbols.length)];
  for (let i = 4; i < length; i++) {
    pass += all[Math.floor(Math.random() * all.length)];
  }
  return pass
    .split('')
    .sort(() => 0.5 - Math.random())
    .join('');
}

export function UsersPage() {
  const { me, isSuper } = useAdminContext();
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [roles, setRoles] = useState<string[]>(['TENANT_STAFF']);
  const [linkPayrollEmployee, setLinkPayrollEmployee] = useState(true);
  const [copied, setCopied] = useState(false);

  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
    displayName?: string;
    roles: string[];
  } | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      setUsers(await fetchTenantUsers());
    } catch (e) {
      setErr(parseError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (isSuper) {
    return <Navigate to="/platform" replace />;
  }

  const handleAutoGenerate = () => {
    const newPass = generateStrongPassword(14);
    setPassword(newPass);
  };

  const handleCopyCredentials = (empEmail: string, empPass: string) => {
    const text = `EWatu ERP Employee Account Credentials:\nEmail: ${empEmail}\nTemporary Password: ${empPass}\nPortal Login: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const onCreate = async (ev: FormEvent) => {
    ev.preventDefault();
    setErr(null);
    setActionMsg(null);
    try {
      await createTenantUser({
        email,
        password,
        displayName: displayName || undefined,
        roles,
      });

      const needsEmployee = linkPayrollEmployee && roles.some((r) => EMPLOYEE_LINK_ROLES.has(r));
      if (needsEmployee) {
        const { firstName, lastName } = splitDisplayName(displayName, email);
        try {
          await createEmployee({
            firstName,
            lastName,
            email: email.trim(),
            jobTitle: roles.includes('HR_MANAGER')
              ? 'HR Manager'
              : roles.includes('MANAGING_DIRECTOR')
                ? 'Managing Director'
                : roles.includes('FINANCE_OFFICER')
                  ? 'Finance Officer'
                  : 'Employee',
            startDate: new Date().toISOString().slice(0, 10),
            basicSalary: 0,
          });
        } catch (empErr) {
          setActionMsg(
            `User created, but payroll employee link failed: ${empErr instanceof Error ? empErr.message : String(empErr)}`,
          );
        }
      }

      try {
        await triggerPasswordReset(email);
      } catch {
        // Non-fatal — the account is created either way; the admin can still
        // share the credentials below or retry the invite from the table.
      }

      setCreatedCredentials({
        email,
        password,
        displayName: displayName || undefined,
        roles,
      });

      setShowForm(false);
      setEmail('');
      setPassword('');
      setDisplayName('');
      setRoles(['TENANT_STAFF']);
      await load();
    } catch (e) {
      setErr(parseError(e));
    }
  };

  const toggleActive = async (u: UserRow) => {
    if (u.id === me.sub) return;
    setErr(null);
    setActionMsg(null);
    try {
      await updateTenantUser(u.id, { active: !u.active });
      await load();
    } catch (e) {
      setErr(parseError(e));
    }
  };

  const handleSendPasswordReset = async (userEmail: string) => {
    setErr(null);
    setActionMsg(null);
    try {
      await triggerPasswordReset(userEmail);
      setActionMsg(`Password setup / reset link sent to ${userEmail}`);
    } catch (e) {
      setErr(parseError(e));
    }
  };

  return (
    <div className="adm-page">
      <header className="adm-page__head">
        <h1 className="adm-page__title">Team Members & Employee Accounts</h1>
        <p className="adm-page__lead">
          Provision work email credentials for employees, assign department management roles, and issue password setup invites.
        </p>
      </header>

      {err && <div className="alert alert--err">{err}</div>}
      {actionMsg && <div className="alert alert--ok" style={{ background: '#10b98120', border: '1px solid #10b981', color: '#10b981', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem' }}>{actionMsg}</div>}

      {createdCredentials && (
        <div
          className="adm-card"
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.1))',
            borderColor: '#10b981',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            borderRadius: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ color: '#10b981', margin: 0, fontSize: '1.1rem' }}>
              ✅ Employee Account Created Successfully!
            </h3>
            <button
              type="button"
              className="btn small"
              onClick={() => setCreatedCredentials(null)}
            >
              ✕ Close
            </button>
          </div>
          <p style={{ marginTop: '0.5rem', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
            A password setup link was emailed to <strong>{createdCredentials.displayName || createdCredentials.email}</strong>. You can also share the temporary credentials below directly:
          </p>
          <div
            style={{
              background: '#0f172a',
              color: '#f8fafc',
              padding: '0.85rem 1rem',
              borderRadius: '6px',
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              marginBottom: '1rem',
            }}
          >
            <div><strong>Work Email:</strong> {createdCredentials.email}</div>
            <div><strong>Temporary Password:</strong> {createdCredentials.password}</div>
            <div><strong>Assigned Roles:</strong> {createdCredentials.roles.join(', ')}</div>
          </div>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => handleCopyCredentials(createdCredentials.email, createdCredentials.password)}
          >
            {copied ? '✓ Credentials Copied to Clipboard!' : '📋 Copy Account Credentials'}
          </button>
        </div>
      )}

      <div className="adm-toolbar">
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            setShowForm((v) => !v);
            if (!showForm && !password) handleAutoGenerate();
          }}
        >
          {showForm ? 'Cancel' : '+ Provision Employee User'}
        </button>
        <button type="button" className="btn" onClick={() => load()}>
          Refresh
        </button>
      </div>

      {showForm && (
        <form className="adm-card form" onSubmit={onCreate} style={{ marginTop: '1rem' }}>
          <h2 className="adm-card__title">Provision Employee Account</h2>
          <label>
            Work Email Address
            <input
              className="auth-input"
              type="email"
              placeholder="e.g. keza@company.rw"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label>
            Display Name
            <input
              className="auth-input"
              placeholder="e.g. Keza Alice (Head of Department)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </label>

          <label>
            Temporary Password
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
              <input
                className="auth-input"
                type="text"
                style={{ flex: 1, fontFamily: 'monospace' }}
                minLength={10}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="btn"
                onClick={handleAutoGenerate}
                title="Generate a secure random password"
              >
                ⚡ Auto-Generate
              </button>
            </div>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              The employee will use this temporary password to log in for the first time.
            </span>
          </label>

          <fieldset style={{ marginTop: '1rem', border: '1px solid #334155', borderRadius: '6px', padding: '1rem' }}>
            <legend style={{ padding: '0 0.5rem', fontWeight: 600, color: '#e2e8f0' }}>Assign Role Privileges</legend>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: 0, marginBottom: '0.75rem' }}>
              Select roles based on responsibilities. (e.g. Select both <strong>Employee Staff</strong> & <strong>HR / Department Head</strong> for dual privileges).
            </p>
            {ROLE_OPTIONS.map((r) => {
              const info = ROLE_DESCRIPTIONS[r];
              return (
                <label key={r} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', marginBottom: '0.75rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    style={{ marginTop: '0.25rem' }}
                    checked={roles.includes(r)}
                    onChange={(e) => {
                      setRoles((prev) =>
                        e.target.checked ? [...prev, r] : prev.filter((x) => x !== r),
                      );
                    }}
                  />
                  <div>
                    <strong style={{ color: '#f1f5f9' }}>{info.label}</strong> <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>({r})</span>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.1rem' }}>{info.desc}</div>
                  </div>
                </label>
              );
            })}
          </fieldset>

          <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', marginTop: '1rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={linkPayrollEmployee}
              onChange={(e) => setLinkPayrollEmployee(e.target.checked)}
              style={{ marginTop: '0.2rem' }}
            />
            <span>
              <strong>Create matching payroll employee record</strong>
              <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                Uses the same work email so leave, payslips, and goals work after first login.
              </div>
            </span>
          </label>

          <button type="submit" className="btn btn--primary" style={{ marginTop: '1rem' }}>
            Create Account & Generate Credentials
          </button>
        </form>
      )}

      {loading && <p className="muted" style={{ marginTop: '1rem' }}>Loading workspace team members…</p>}

      {!loading && users && (
        <section className="adm-card" style={{ marginTop: '1rem' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Work Email</th>
                <th>Assigned Roles</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td><strong>{u.displayName ?? '—'}</strong></td>
                  <td>{u.email}</td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                      {u.roles.map((r) => (
                        <span
                          key={r}
                          style={{
                            background: '#1e293b',
                            color: '#38bdf8',
                            fontSize: '0.72rem',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            fontWeight: 500,
                          }}
                        >
                          {ROLE_DESCRIPTIONS[r]?.label || r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        color: u.active ? '#10b981' : '#ef4444',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                      }}
                    >
                      {u.active ? '● Active' : '○ Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        type="button"
                        className="btn small"
                        onClick={() => handleSendPasswordReset(u.email)}
                        title="Send password reset link to employee's work email"
                      >
                        ✉ Send Invite / Reset
                      </button>
                      {u.id !== me.sub && (
                        <button type="button" className="btn small" onClick={() => toggleActive(u)}>
                          {u.active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

