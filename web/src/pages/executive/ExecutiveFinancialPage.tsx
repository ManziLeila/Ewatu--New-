import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchHrDashboardSummary, type HrDashboardSummary } from '../../payrollApi';
import { parseApiError } from '../../lib/parseApiError';
import { formatRwf } from '../../lib/formatRwf';

export function ExecutiveFinancialPage() {
  const [summary, setSummary] = useState<HrDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSummary(await fetchHrDashboardSummary());
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
            Financial & payroll
          </h1>
          <p className="dash-welcome__sub" style={{ margin: 0 }}>
            KPIs from finalized payroll and active salary profiles (not external GL revenue).
          </p>
        </div>
      </header>

      {error && <div className="alert alert--err">{error}</div>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : summary ? (
        <>
          <div className="dash-kpi-grid">
            {summary.finance && (
              <>
                <div className="dash-kpi">
                  <div className="dash-kpi__body">
                    <div className="dash-kpi__label">YTD gross payroll</div>
                    <div className="dash-kpi__value">{formatRwf(summary.finance.ytdGrossPay, true)}</div>
                  </div>
                </div>
                <div className="dash-kpi">
                  <div className="dash-kpi__body">
                    <div className="dash-kpi__label">YTD net paid</div>
                    <div className="dash-kpi__value">{formatRwf(summary.finance.ytdNetPay, true)}</div>
                  </div>
                </div>
                <div className="dash-kpi">
                  <div className="dash-kpi__body">
                    <div className="dash-kpi__label">Est. monthly gross</div>
                    <div className="dash-kpi__value">{formatRwf(summary.finance.estimatedMonthlyGross, true)}</div>
                  </div>
                </div>
              </>
            )}
            <div className="dash-kpi">
              <div className="dash-kpi__body">
                <div className="dash-kpi__label">Periods in progress</div>
                <div className="dash-kpi__value">{summary.payroll.inProgressPeriods.length}</div>
              </div>
            </div>
            <div className="dash-kpi">
              <div className="dash-kpi__body">
                <div className="dash-kpi__label">Payroll exceptions</div>
                <div className="dash-kpi__value">{summary.payroll.exceptionsCount}</div>
              </div>
            </div>
          </div>

          {summary.finance && summary.finance.monthlyTrend.length > 0 && (
            <section className="adm-card" style={{ marginBottom: '1rem' }}>
              <h3 style={{ marginTop: 0 }}>Net payroll trend (finalized)</h3>
              <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                {summary.finance.monthlyTrend.map((m) => (
                  <li key={`${m.periodYear}-${m.periodMonth}`}>
                    {m.periodYear}-{String(m.periodMonth).padStart(2, '0')}: {formatRwf(m.netPay)}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="adm-card">
            <h3 style={{ marginTop: 0 }}>Go deeper</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
              <Link to="/payroll/billing" className="btn btn--primary">
                Client billing
              </Link>
              <Link to="/payroll/reports" className="btn btn--ghost">
                Payroll reports
              </Link>
              <Link to="/payroll/dashboard" className="btn btn--ghost">
                Payroll dashboard
              </Link>
              <Link to="/payroll/runs" className="btn btn--ghost">
                Payroll runs
              </Link>
            </div>
          </section>

          {summary.payroll.inProgressPeriods.length > 0 && (
            <section className="adm-card" style={{ marginTop: '1rem' }}>
              <h3 style={{ marginTop: 0 }}>Periods in flight</h3>
              <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                {summary.payroll.inProgressPeriods.map((p) => (
                  <li key={p.id}>
                    {p.periodYear}/{p.periodMonth} — {p.status} ({p.recordCount} records)
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : null}
    </>
  );
}
