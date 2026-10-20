import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { fetchMe } from '../../api';
import {
  clockIn,
  clockOut,
  fetchAttendanceNetworkPolicy,
  fetchMyAttendance,
  fetchMyEmployee,
  updateAttendanceNetworkPolicy,
  type AttendanceNetworkPolicy,
  type AttendanceRecord,
} from '../../payrollApi';
import { parseApiError } from '../../lib/parseApiError';

const NETWORK_POLICY_ROLES = ['TENANT_ADMIN', 'MANAGING_DIRECTOR'];

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getUTCFullYear() === now.getFullYear() && d.getUTCMonth() === now.getMonth() && d.getUTCDate() === now.getDate();
}

const STATUS_BADGE: Record<AttendanceRecord['status'], string> = {
  PRESENT: 'badge--green',
  LATE: 'badge--orange',
  ABSENT: 'badge--red',
};

export function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employeeLinked, setEmployeeLinked] = useState<boolean | null>(null);

  const [canManagePolicy, setCanManagePolicy] = useState(false);
  const [policy, setPolicy] = useState<AttendanceNetworkPolicy | null>(null);
  const [policyEnabled, setPolicyEnabled] = useState(false);
  const [cidrsText, setCidrsText] = useState('');
  const [policyBusy, setPolicyBusy] = useState(false);
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [policySaved, setPolicySaved] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const me = await fetchMe();
      let emp = null;
      try {
        emp = await fetchMyEmployee();
      } catch {
        emp = null;
      }
      setEmployeeLinked(!!emp);
      setRecords(await fetchMyAttendance());
      if (me.roles?.some((r) => NETWORK_POLICY_ROLES.includes(r))) {
        setCanManagePolicy(true);
        const p = await fetchAttendanceNetworkPolicy();
        setPolicy(p);
        setPolicyEnabled(p.enabled);
        setCidrsText(p.allowedCidrs.join('\n'));
      }
    } catch (e) {
      setError(parseApiError(e, 'payroll').message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onAddMyIp = () => {
    if (!policy?.callerIp) return;
    setCidrsText((prev) => (prev.trim() ? `${prev.trim()}\n${policy.callerIp}` : `${policy.callerIp}`));
  };

  const onSavePolicy = async (ev: FormEvent) => {
    ev.preventDefault();
    setPolicyError(null);
    setPolicySaved(false);
    setPolicyBusy(true);
    try {
      const allowedCidrs = cidrsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const updated = await updateAttendanceNetworkPolicy({ enabled: policyEnabled, allowedCidrs });
      setPolicy((prev) => (prev ? { ...updated, callerIp: prev.callerIp } : updated));
      setPolicySaved(true);
    } catch (e) {
      setPolicyError(parseApiError(e, 'payroll').message);
    } finally {
      setPolicyBusy(false);
    }
  };

  const today = records.find((r) => isToday(r.date));

  const onClockIn = async () => {
    setError(null);
    setBusy(true);
    try {
      await clockIn();
      await load();
    } catch (e) {
      setError(parseApiError(e, 'payroll').message);
    } finally {
      setBusy(false);
    }
  };

  const onClockOut = async () => {
    setError(null);
    setBusy(true);
    try {
      await clockOut();
      await load();
    } catch (e) {
      setError(parseApiError(e, 'payroll').message);
    } finally {
      setBusy(false);
    }
  };

  const noEmployee = employeeLinked === false;

  if (loading) {
    return (
      <div className="adm-page">
        <p className="muted">Loading attendance…</p>
      </div>
    );
  }

  return (
    <div className="adm-page">
      <header className="adm-page__head">
        <h1 className="adm-page__title">Attendance</h1>
        <p className="adm-page__lead">Clock in and out, and review your recent attendance history.</p>
      </header>

      {noEmployee && (
        <div className="alert alert--warn" role="status">
          {parseApiError(new Error('No linked employee record'), 'payroll').message}
        </div>
      )}

      {error && <div className="alert alert--err">{error}</div>}

      <div className="adm-card" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div className="muted small">Today</div>
          {today ? (
            <div>
              Clocked in at {today.clockInAt ? new Date(today.clockInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
              {today.clockOutAt && (
                <> · Clocked out at {new Date(today.clockOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
              )}
              {' '}
              <span className={`badge ${STATUS_BADGE[today.status]}`}>{today.status}</span>
            </div>
          ) : (
            <div className="muted">Not clocked in yet.</div>
          )}
        </div>
        <button
          type="button"
          className="btn btn--primary"
          disabled={busy || noEmployee || !!today?.clockInAt}
          onClick={onClockIn}
        >
          Clock In
        </button>
        <button
          type="button"
          className="btn"
          disabled={busy || noEmployee || !today?.clockInAt || !!today?.clockOutAt}
          onClick={onClockOut}
        >
          Clock Out
        </button>
      </div>

      <div className="adm-card">
        <h3 style={{ margin: '0 0 0.75rem' }}>Last 30 Days</h3>
        {records.length === 0 ? (
          <p className="muted small">No attendance records yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                  <td className="muted">{r.clockInAt ? new Date(r.clockInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td className="muted">{r.clockOutAt ? new Date(r.clockOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td><span className={`badge ${STATUS_BADGE[r.status]}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {canManagePolicy && (
        <div className="adm-card" style={{ marginTop: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.25rem' }}>Office Network Restriction</h3>
          <p className="muted small" style={{ marginTop: 0 }}>
            When enabled, clock-in and clock-out are only accepted from the IP addresses or ranges listed below —
            typically the office's public IP as seen from the internet. Staff off that network will be blocked with
            a clear message.
          </p>

          {policyError && <div className="alert alert--err">{policyError}</div>}
          {policySaved && <div className="alert alert--ok">Saved.</div>}

          <form className="form" onSubmit={onSavePolicy}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={policyEnabled} onChange={(e) => setPolicyEnabled(e.target.checked)} />
              Restrict clock-in/out to the office network
            </label>

            <label>
              Allowed IP addresses / CIDR ranges (one per line)
              <textarea
                className="auth-input"
                style={{ minHeight: '90px', fontFamily: 'monospace' }}
                placeholder={'41.186.12.4\n41.186.12.0/24'}
                value={cidrsText}
                onChange={(e) => setCidrsText(e.target.value)}
              />
            </label>

            {policy?.callerIp && (
              <p className="muted small">
                Your current request IP is <code>{policy.callerIp}</code>.{' '}
                <button type="button" className="btn btn--ghost small" onClick={onAddMyIp}>
                  Add it to the list
                </button>
              </p>
            )}

            <button type="submit" className="btn btn--primary" disabled={policyBusy} style={{ marginTop: '0.5rem' }}>
              {policyBusy ? 'Saving…' : 'Save'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
