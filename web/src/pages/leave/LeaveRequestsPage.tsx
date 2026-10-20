import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { parseApiError } from '../../lib/parseApiError';
import {
  cancelLeaveRequest,
  fetchMyEmployee,
  fetchLeaveRequests,
  type LeaveRequest,
} from '../../payrollApi';

function exportCsv(requests: LeaveRequest[]) {
  const header = ['Leave Type', 'Start Date', 'End Date', 'Days', 'Status', 'Reason', 'Applied On'];
  const rows = requests.map((r) => [
    r.leaveType?.name ?? '',
    new Date(r.startDate).toLocaleDateString(),
    new Date(r.endDate).toLocaleDateString(),
    String(r.numberOfDays),
    r.status,
    (r.reason ?? '').replace(/"/g, '""'),
    new Date(r.createdAt).toLocaleDateString(),
  ]);
  const csv = [header, ...rows].map((row) => row.map((c) => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'my-leave-history.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function statusLabel(status: LeaveRequest['status']): string {
  if (status === 'PENDING') return 'Pending Manager Approval';
  if (status === 'CANCELLED') return 'Cancelled';
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function statusBadgeClass(status: LeaveRequest['status']): string {
  if (status === 'APPROVED') return 'badge--green';
  if (status === 'REJECTED') return 'badge--red';
  if (status === 'CANCELLED') return 'badge--gray';
  return 'badge--orange';
}

export function LeaveRequestsPage() {
  const location = useLocation();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState<string>('ALL');
  const [justSubmitted] = useState(Boolean((location.state as { submitted?: boolean } | null)?.submitted));
  const [justUpdated] = useState(Boolean((location.state as { updated?: boolean } | null)?.updated));

  const [cancelTarget, setCancelTarget] = useState<LeaveRequest | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const matchedEmp = await fetchMyEmployee();
      const reqs = await fetchLeaveRequests(undefined, matchedEmp?.id);
      setRequests(reqs);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const years = useMemo(() => {
    const set = new Set(requests.map((r) => new Date(r.startDate).getFullYear()));
    return [...set].sort((a, b) => b - a);
  }, [requests]);

  const sorted = [...requests]
    .filter((r) => year === 'ALL' || new Date(r.startDate).getFullYear() === Number(year))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const onConfirmCancel = async () => {
    if (!cancelTarget) return;
    const reason = cancelReason.trim();
    if (!reason) {
      setCancelError('Please enter a reason for cancelling this request.');
      return;
    }
    setCancelBusy(true);
    setCancelError(null);
    try {
      await cancelLeaveRequest(cancelTarget.id, reason);
      setCancelTarget(null);
      setCancelReason('');
      await load();
    } catch (err) {
      setCancelError(parseApiError(err).message);
    } finally {
      setCancelBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="rec-page" style={{ textAlign: 'center', padding: '3rem' }}>
        <p className="muted">Loading your leave requests…</p>
      </div>
    );
  }

  return (
    <div className="rec-page">
      <div className="rec-page__header">
        <div>
          <h1 className="rec-page__title">My Leave Requests</h1>
          <p className="muted">Full history of your submitted leave requests.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button type="button" className="btn btn--ghost" onClick={() => exportCsv(sorted)} disabled={sorted.length === 0}>
            Export CSV
          </button>
          <Link to="/leave/apply" className="btn btn--primary">
            + Apply for Leave
          </Link>
        </div>
      </div>

      {error && <div className="alert alert--err">{error}</div>}
      {justSubmitted && (
        <div className="alert alert--ok">Leave request submitted successfully. Status: Pending Manager Approval.</div>
      )}
      {justUpdated && (
        <div className="alert alert--ok">Leave request updated. It remains pending manager approval.</div>
      )}

      {years.length > 1 && (
        <div style={{ marginBottom: '1rem' }}>
          <label className="rec-form__label" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            Year
            <select className="auth-input" style={{ width: 'auto' }} value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="ALL">All years</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <section className="card">
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Leave Type</th>
                <th>Dates</th>
                <th>Days</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Notes</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="muted" style={{ textAlign: 'center', padding: '2rem' }}>
                    No leave requests found. Click "+ Apply for Leave" to create a request.
                  </td>
                </tr>
              ) : (
                sorted.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.leaveType?.name}</strong>
                    </td>
                    <td>
                      {new Date(r.startDate).toLocaleDateString()} to {new Date(r.endDate).toLocaleDateString()}
                    </td>
                    <td>{r.numberOfDays}</td>
                    <td className="muted">{r.reason || '—'}</td>
                    <td>
                      <span className={`badge ${statusBadgeClass(r.status)}`}>{statusLabel(r.status)}</span>
                    </td>
                    <td className="muted ew-text-sm">
                      {r.status === 'REJECTED' || r.status === 'CANCELLED'
                        ? r.rejectionReason || '—'
                        : '—'}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {r.status === 'PENDING' ? (
                        <span style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <Link to={`/leave/requests/${r.id}/edit`} className="btn btn--ghost btn--sm">
                            Edit
                          </Link>
                          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setCancelTarget(r)}>
                            Cancel
                          </button>
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {cancelTarget && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => !cancelBusy && setCancelTarget(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            className="card"
            role="dialog"
            aria-labelledby="cancel-leave-title"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 440, width: '100%' }}
          >
            <h2 id="cancel-leave-title" className="type-card-title" style={{ marginTop: 0 }}>
              Cancel leave request
            </h2>
            <p className="muted type-body">
              {cancelTarget.leaveType?.name}: {new Date(cancelTarget.startDate).toLocaleDateString()} –{' '}
              {new Date(cancelTarget.endDate).toLocaleDateString()}. This cannot be undone.
            </p>
            <label className="rec-form__label">
              Reason for cancellation <span className="rec-form__req">*</span>
              <textarea
                className="auth-input"
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. plans changed, no longer need these dates"
                required
              />
            </label>
            {cancelError && (
              <div className="alert alert--err" style={{ marginTop: '0.75rem' }}>
                {cancelError}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <button type="button" className="btn btn--ghost" disabled={cancelBusy} onClick={() => setCancelTarget(null)}>
                Keep request
              </button>
              <button type="button" className="btn btn--primary" disabled={cancelBusy} onClick={onConfirmCancel}>
                {cancelBusy ? 'Cancelling…' : 'Confirm cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
