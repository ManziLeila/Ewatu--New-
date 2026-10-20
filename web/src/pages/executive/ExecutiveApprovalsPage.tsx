import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchLeaveRequests,
  fetchPayrollRuns,
  type LeaveRequest,
  type PayrollRun,
} from '../../payrollApi';
import { parseApiError } from '../../lib/parseApiError';

export function ExecutiveApprovalsPage() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [leave, setLeave] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [allRuns, leavePending] = await Promise.all([
        fetchPayrollRuns(),
        fetchLeaveRequests('PENDING'),
      ]);
      setRuns(allRuns.filter((r) => r.status === 'HR_APPROVED'));
      setLeave(leavePending);
    } catch (e) {
      setError(parseApiError(e).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <header className="exec-topbar">
        <div>
          <h1 className="dash-welcome__greeting" style={{ marginBottom: '0.25rem' }}>
            Approval inbox
          </h1>
          <p className="dash-welcome__sub" style={{ margin: 0 }}>
            Payroll and leave items that may need executive sign-off
          </p>
        </div>
        <Link to="/payroll/approvals" className="btn btn--ghost">
          Payroll approvals
        </Link>
      </header>

      {error && <div className="alert alert--err">{error}</div>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          <section className="adm-card" style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginTop: 0 }}>Payroll — MD stage</h3>
            {runs.length === 0 ? (
              <p className="muted">No payroll runs waiting for MD approval.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                {runs.map((r) => (
                  <li key={r.id} style={{ marginBottom: '0.5rem' }}>
                    Period {r.periodYear}-{String(r.periodMonth).padStart(2, '0')} ·{' '}
                    <Link to={`/payroll/runs/${r.id}`}>Review run</Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="adm-card">
            <h3 style={{ marginTop: 0 }}>Leave — pending</h3>
            {leave.length === 0 ? (
              <p className="muted">No pending leave requests.</p>
            ) : (
              <>
                <p className="muted">{leave.length} request(s) in queue.</p>
                <Link to="/leave/approvals" className="btn btn--primary">
                  Open leave approvals
                </Link>
              </>
            )}
          </section>
        </>
      )}
    </>
  );
}
