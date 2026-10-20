import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchHrDashboardSummary,
  fetchPayrollRuns,
  type HrDashboardSummary,
  type PayrollRun,
} from '../../payrollApi';
import { parseApiError } from '../../lib/parseApiError';
import { formatRwf } from '../../lib/formatRwf';

function fiscalQuarter(d = new Date()): string {
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `FY${d.getFullYear()} Q${q}`;
}

function formatDateLong(d = new Date()): string {
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function ExecutiveOverviewPage() {
  const [summary, setSummary] = useState<HrDashboardSummary | null>(null);
  const [mdRuns, setMdRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [s, runs] = await Promise.all([
        fetchHrDashboardSummary(),
        fetchPayrollRuns().catch(() => []),
      ]);
      setSummary(s);
      setMdRuns(runs.filter((r) => r.status === 'HR_APPROVED'));
    } catch (e) {
      setError(parseApiError(e).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <p className="muted">Loading executive overview…</p>;
  }

  if (error || !summary) {
    return (
      <div>
        <div className="alert alert--err">{error ?? 'Could not load summary'}</div>
        <button type="button" className="btn btn--primary" onClick={load}>
          Retry
        </button>
      </div>
    );
  }

  const fin = summary.finance;
  const hc = summary.headcount.total;
  const turnover = summary.turnover.ratePct;
  const leavePending = summary.leave.pendingApprovals;
  const payrollOpen = summary.payroll.inProgressPeriods.length;
  const perf = summary.performance;
  const deptRows = summary.headcount.byDepartment.slice(0, 8);
  const maxDept = Math.max(...deptRows.map((d) => d.count), 1);

  const approvalItems: { title: string; meta: string; to: string }[] = [
    ...mdRuns.slice(0, 4).map((r) => ({
      title: `Payroll run — ${r.periodYear}/${String(r.periodMonth).padStart(2, '0')}`,
      meta: 'Awaiting MD sign-off',
      to: `/payroll/runs/${r.id}`,
    })),
  ];
  if (leavePending > 0 && approvalItems.length < 6) {
    approvalItems.push({
      title: `${leavePending} leave request${leavePending === 1 ? '' : 's'}`,
      meta: 'Pending approval',
      to: '/leave/approvals',
    });
  }
  if (summary.payroll.exceptionsCount > 0 && approvalItems.length < 6) {
    approvalItems.push({
      title: `${summary.payroll.exceptionsCount} payroll exception${summary.payroll.exceptionsCount === 1 ? '' : 's'}`,
      meta: 'Needs review',
      to: '/platform/hr-dashboard',
    });
  }

  return (
    <>
      <header className="exec-topbar">
        <div>
          <h1 className="dash-welcome__greeting" style={{ marginBottom: '0.25rem' }}>
            Executive overview
          </h1>
          <p className="dash-welcome__sub" style={{ margin: 0 }}>
            {formatDateLong()} · {fiscalQuarter()}
          </p>
        </div>
        <div className="exec-topbar__actions">
          <Link to="/payroll/reports" className="btn btn--ghost">
            Reports
          </Link>
          <Link to="/platform/hr-dashboard" className="btn btn--primary">
            HR dashboard
          </Link>
        </div>
      </header>

      <div className="dash-kpi-grid">
        {fin && (
          <>
            <div className="dash-kpi">
              <div className="dash-kpi__body">
                <div className="dash-kpi__label">Payroll cost YTD (net)</div>
                <div className="dash-kpi__value">{formatRwf(fin.ytdNetPay, true)}</div>
                <div className="dash-kpi__secondary">
                  {fin.finalizedRunsYtd} finalized run{fin.finalizedRunsYtd === 1 ? '' : 's'} · from payroll records
                </div>
              </div>
            </div>
            <div className="dash-kpi">
              <div className="dash-kpi__body">
                <div className="dash-kpi__label">Est. monthly gross payroll</div>
                <div className="dash-kpi__value">{formatRwf(fin.estimatedMonthlyGross, true)}</div>
                <div className="dash-kpi__secondary">Active salary profiles (excl. statutory calc)</div>
              </div>
            </div>
          </>
        )}
        <div className="dash-kpi">
          <div className="dash-kpi__body">
            <div className="dash-kpi__label">Headcount</div>
            <div className="dash-kpi__value">{hc}</div>
            <div className="dash-kpi__secondary">Active employees company-wide</div>
          </div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi__body">
            <div className="dash-kpi__label">Leave in queue</div>
            <div className="dash-kpi__value">{leavePending}</div>
            <div className="dash-kpi__secondary">Pending manager / HR approval</div>
          </div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi__body">
            <div className="dash-kpi__label">Payroll periods open</div>
            <div className="dash-kpi__value">{payrollOpen}</div>
            <div className="dash-kpi__secondary">
              {summary.payroll.exceptionsCount} exception
              {summary.payroll.exceptionsCount === 1 ? '' : 's'}
            </div>
          </div>
        </div>
      </div>

      <div className="exec-grid-2">
        <section className="adm-card">
          <h3 style={{ marginTop: 0 }}>Headcount by department</h3>
          {deptRows.length === 0 ? (
            <p className="muted">No department breakdown yet.</p>
          ) : (
            <div className="exec-chart-bars" aria-hidden="true">
              {deptRows.map((d) => (
                <div key={d.department} className="exec-chart-bars__col">
                  <div className="exec-chart-bars__bar-wrap">
                    <div
                      className="exec-chart-bars__bar exec-chart-bars__bar--primary"
                      style={{ height: `${(d.count / maxDept) * 100}%` }}
                    />
                  </div>
                  <span className="exec-chart-bars__label">{d.department || '—'}</span>
                </div>
              ))}
            </div>
          )}
          <Link to="/platform/departments" className="btn btn--ghost btn--sm" style={{ marginTop: '0.75rem' }}>
            All departments
          </Link>
        </section>

        <section className="adm-card">
          <h3 style={{ marginTop: 0 }}>Awaiting your attention</h3>
          {approvalItems.length === 0 ? (
            <p className="muted">No items in your executive queue.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {approvalItems.map((item) => (
                <li
                  key={item.to + item.title}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    padding: '0.65rem 0',
                    borderBottom: '1px solid var(--line, #e2e8f0)',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.92rem' }}>{item.title}</strong>
                    <div className="muted" style={{ fontSize: '0.8rem' }}>
                      {item.meta}
                    </div>
                  </div>
                  <Link to={item.to} className="btn btn--ghost btn--sm">
                    Review
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link to="/executive/approvals" className="btn btn--ghost btn--sm" style={{ marginTop: '0.75rem' }}>
            Full approval inbox
          </Link>
        </section>
      </div>

      <div className="exec-grid-2">
        <section className="adm-card">
          <h3 style={{ marginTop: 0 }}>Performance cycle</h3>
          {perf ? (
            <>
              <p style={{ margin: '0 0 0.5rem' }}>
                <strong>{perf.cycleName}</strong>
              </p>
              <div
                style={{
                  height: 8,
                  borderRadius: 999,
                  background: 'var(--color-neutral-200)',
                  overflow: 'hidden',
                  marginBottom: '0.35rem',
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, perf.completionPct)}%`,
                    height: '100%',
                    background: 'var(--color-primary)',
                  }}
                />
              </div>
              <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>
                {perf.completedCount} of {perf.totalEmployees} complete ({perf.completionPct}%)
                {perf.overdueCount > 0 ? ` · ${perf.overdueCount} overdue` : ''}
              </p>
            </>
          ) : (
            <p className="muted">No active appraisal cycle.</p>
          )}
          <Link to="/performance/goals" className="btn btn--ghost btn--sm" style={{ marginTop: '0.75rem' }}>
            Strategic goals
          </Link>
        </section>

        <section className="adm-card">
          <h3 style={{ marginTop: 0 }}>Workforce health</h3>
          <ul className="muted" style={{ fontSize: '0.88rem', lineHeight: 1.7, margin: 0, paddingLeft: '1.1rem' }}>
            <li>
              Attendance (30d): on-time {summary.attendance.onTimeRatePct ?? '—'}%
            </li>
            <li>Open grievances: {summary.grievances.openCount + summary.grievances.investigatingCount}</li>
            <li>Active disciplinary cases: {summary.disciplinary.activeCount}</li>
            <li>Contracts expiring soon: {summary.lifecycleAlerts.contractsExpiringSoon.length}</li>
          </ul>
          <Link to="/platform/hr-dashboard" className="btn btn--ghost btn--sm" style={{ marginTop: '0.75rem' }}>
            Full HR dashboard
          </Link>
        </section>
      </div>
    </>
  );
}
