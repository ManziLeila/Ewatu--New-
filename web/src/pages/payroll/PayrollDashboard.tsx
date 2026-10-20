import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchMe } from '../../api';
import { parseApiError } from '../../lib/parseApiError';
import { formatRwf } from '../../lib/formatRwf';
import { ROLE_DESCRIPTIONS } from '../../lib/roleDescriptions';
import { CHART } from '../../lib/brand';
import {
  createPeriod,
  fetchEmployees,
  fetchExpiringContracts,
  fetchHrDashboardSummary,
  fetchPayrollConfigClients,
  fetchPeriods,
  type Employee,
  type HrDashboardSummary,
} from '../../payrollApi';

type PeriodRow = {
  id: string;
  clientId: string;
  periodMonth: number;
  periodYear: number;
  status: string;
};

function roleWelcomeLabel(roles: string[]): string {
  const order = ['FINANCE_OFFICER', 'CFO', 'PAYROLL_SPECIALIST', 'TENANT_ADMIN', 'HR_MANAGER'];
  for (const r of order) {
    if (roles.includes(r)) return ROLE_DESCRIPTIONS[r]?.label ?? r.replace(/_/g, ' ');
  }
  return 'Payroll user';
}

function monthPipelineCounts(periods: PeriodRow[]) {
  const now = new Date();
  const m = now.getMonth() + 1;
  const y = now.getFullYear();
  const thisMonth = periods.filter((p) => p.periodMonth === m && p.periodYear === y);
  return {
    pending: thisMonth.filter((p) => p.status === 'SUBMITTED' || p.status === 'DRAFT').length,
    hrApproved: thisMonth.filter((p) => p.status === 'HR_APPROVED').length,
    mdApproved: thisMonth.filter(
      (p) => p.status === 'MD_APPROVED' || p.status === 'CLIENT_APPROVED',
    ).length,
  };
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function projectedTrend(estimatedMonthlyNet: number): { netPay: number; periodMonth: number; periodYear: number }[] {
  const now = new Date();
  const points: { netPay: number; periodMonth: number; periodYear: number }[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const wobble = 0.92 + (i % 3) * 0.04;
    points.push({
      periodYear: d.getFullYear(),
      periodMonth: d.getMonth() + 1,
      netPay: Math.round(estimatedMonthlyNet * wobble),
    });
  }
  return points;
}

function PayrollNetChart({
  points,
  projected,
}: {
  points: { netPay: number; periodMonth: number; periodYear: number }[];
  projected?: boolean;
}) {
  const data = points.length > 0 ? points : [{ netPay: 0, periodMonth: 1, periodYear: 2026 }];
  const max = Math.max(...data.map((d) => d.netPay), 1);
  const w = 100;
  const h = 52;
  const coords = data.map((d, i) => {
    const x = data.length === 1 ? w / 2 : (i / (data.length - 1)) * w;
    const y = h - (d.netPay / max) * (h - 6);
    return `${x},${y}`;
  });
  const area = `0,${h} ${coords.join(' ')} ${w},${h}`;
  const labels =
    data.length <= 7
      ? data.map((d) => MONTH_SHORT[d.periodMonth - 1] ?? String(d.periodMonth))
      : data.map((d) => `${d.periodMonth}/${String(d.periodYear).slice(-2)}`);

  return (
    <div className={`payroll-finance-chart${projected ? ' payroll-finance-chart--projected' : ''}`}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="payroll-finance-chart__svg" aria-hidden>
        <defs>
          <linearGradient id="payrollNetGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART.success} stopOpacity="0.5" />
            <stop offset="100%" stopColor={CHART.success} stopOpacity="0.06" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#payrollNetGrad)" />
        <polyline
          points={coords.join(' ')}
          fill="none"
          stroke={CHART.success}
          strokeWidth="1.8"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="payroll-finance-chart__months">
        {labels.map((lab, i) => (
          <span key={`${lab}-${i}`}>{lab}</span>
        ))}
      </div>
    </div>
  );
}

export function PayrollDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [meEmail, setMeEmail] = useState('');
  const [roleLabel, setRoleLabel] = useState('Finance Officer');
  const [summary, setSummary] = useState<HrDashboardSummary | null>(null);
  const [activeEmployees, setActiveEmployees] = useState(0);
  const [periods, setPeriods] = useState<PeriodRow[]>([]);
  const [expiringContracts, setExpiringContracts] = useState<
    { id?: string; employeeName?: string; endDate?: string }[]
  >([]);
  const [clients, setClients] = useState<{ clientId: string }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('default');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setWarning(null);
    try {
      const me = await fetchMe();
      setMeEmail(me.email ?? '');
      setRoleLabel(roleWelcomeLabel(me.roles));

      const [employeesR, periodListR, contractsR, clientListR, hrSummaryR] = await Promise.allSettled([
        fetchEmployees({ employmentStatus: 'ACTIVE', limit: 100 }),
        fetchPeriods({}),
        fetchExpiringContracts(30),
        fetchPayrollConfigClients(),
        fetchHrDashboardSummary(),
      ]);

      const partialIssues: string[] = [];

      if (hrSummaryR.status === 'fulfilled') {
        setSummary(hrSummaryR.value);
        setActiveEmployees(hrSummaryR.value.headcount?.total ?? 0);
      } else {
        partialIssues.push('summary metrics');
      }

      if (employeesR.status === 'fulfilled') {
        const employeeList: Employee[] = Array.isArray(employeesR.value) ? employeesR.value : [];
        if (hrSummaryR.status !== 'fulfilled') {
          setActiveEmployees(employeeList.length);
        }
      } else if (hrSummaryR.status !== 'fulfilled') {
        partialIssues.push('employee list');
      }

      if (periodListR.status === 'fulfilled') {
        const list: PeriodRow[] = Array.isArray(periodListR.value) ? periodListR.value : [];
        setPeriods(list);
      } else {
        partialIssues.push('payroll runs');
      }

      if (contractsR.status === 'fulfilled') {
        setExpiringContracts(Array.isArray(contractsR.value) ? contractsR.value : []);
      }

      if (clientListR.status === 'fulfilled') {
        const clientList = clientListR.value.length ? clientListR.value : [{ clientId: 'default' }];
        setClients(clientList);
      } else {
        setClients([{ clientId: 'default' }]);
      }

      if (partialIssues.length > 0) {
        const parsed =
          employeesR.status === 'rejected'
            ? parseApiError(employeesR.reason)
            : periodListR.status === 'rejected'
              ? parseApiError(periodListR.reason)
              : hrSummaryR.status === 'rejected'
                ? parseApiError(hrSummaryR.reason)
                : null;
        setWarning(
          parsed?.message ??
            `Some dashboard data could not be loaded (${partialIssues.join(', ')}). Try refresh.`,
        );
      }
    } catch (e) {
      setError(parseApiError(e).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pipeline = useMemo(() => monthPipelineCounts(periods), [periods]);
  const fin = summary?.finance;
  const hasFinalized = (fin?.monthsWithData ?? 0) > 0;
  const estimatedMonthlyNet = fin?.estimatedMonthlyGross ? fin.estimatedMonthlyGross * 0.72 : 0;
  const netDisplay = hasFinalized
    ? (fin?.allTimeNetPay ?? fin?.ytdNetPay ?? 0)
    : estimatedMonthlyNet > 0
      ? estimatedMonthlyNet
      : 0;
  const netCaption = hasFinalized ? 'Net all time' : estimatedMonthlyNet > 0 ? 'Est. monthly net' : 'Net';
  const trend = fin?.monthlyTrend ?? [];
  const chartProjected = !hasFinalized && estimatedMonthlyNet > 0;
  const chartPoints =
    trend.length > 0 ? trend : chartProjected ? projectedTrend(estimatedMonthlyNet) : [];

  const onRunPayroll = async () => {
    setCreating(true);
    try {
      const created = await createPeriod({
        clientId: selectedClientId,
        periodMonth: new Date().getMonth() + 1,
        periodYear: new Date().getFullYear(),
      });
      window.location.href = `/payroll/runs/${created.id}`;
    } catch (e) {
      setError(parseApiError(e).message);
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="payroll-finance-page">
        <div className="payroll-finance-skeleton" aria-busy="true">
          <div className="payroll-finance-skeleton__bar" />
          <div className="payroll-finance-skeleton__grid">
            <div className="payroll-finance-skeleton__card payroll-finance-skeleton__card--lg" />
            <div className="payroll-finance-skeleton__stack">
              <div className="payroll-finance-skeleton__card" />
              <div className="payroll-finance-skeleton__card" />
              <div className="payroll-finance-skeleton__card" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const initials = roleLabel
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const periodBadge = `${new Date().getMonth() + 1}/${String(new Date().getFullYear()).slice(-2)}`;

  return (
    <div className="payroll-finance-page">
      <header className="payroll-finance-chrome">
        <div className="payroll-finance-chrome__crumb">
          <span className="payroll-finance-chrome__system">Payroll management system</span>
          <span className="payroll-finance-chrome__sep">/</span>
          <span className="payroll-finance-chrome__page">Dashboard</span>
        </div>
        <div className="payroll-finance-chrome__user">
          {meEmail ? <span className="payroll-finance-chrome__email">{meEmail}</span> : null}
          <span className="payroll-finance-chrome__avatar" aria-hidden="true">
            {initials}
          </span>
        </div>
      </header>

      <h1 className="payroll-finance-welcome">
        Welcome back, <span>{roleLabel}</span>
      </h1>

      {error && (
        <div className="payroll-finance-banner payroll-finance-banner--err" role="alert">
          <p>{error}</p>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => load()}>
            Retry
          </button>
        </div>
      )}

      {warning && !error && (
        <div className="payroll-finance-banner payroll-finance-banner--warn" role="status">
          <p>{warning}</p>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => load()}>
            Retry
          </button>
        </div>
      )}

      <div className="payroll-finance-layout">
        <section className="payroll-finance-card payroll-finance-glance">
          <div className="payroll-finance-glance__head">
            <h2 className="payroll-finance-glance__title">Payroll at a glance</h2>
            <span className="payroll-finance-glance__badge">{periodBadge}</span>
          </div>
          <div className="payroll-finance-glance__hero">
            <span className="payroll-finance-glance__amount">{formatRwf(netDisplay)}</span>
            <span className="payroll-finance-glance__caption">{netCaption}</span>
          </div>
          <PayrollNetChart points={chartPoints} projected={chartProjected} />
          <div className="payroll-finance-glance__stats">
            <div>
              <strong>{activeEmployees}</strong>
              <span>Active employees</span>
            </div>
            <div>
              <strong>{formatRwf(hasFinalized ? netDisplay : 0, true)}</strong>
              <span>Net (all time)</span>
            </div>
            <div>
              <strong>{fin?.monthsWithData ?? 0}</strong>
              <span>Months with data</span>
            </div>
            <div>
              <strong>
                {formatRwf(hasFinalized ? (fin?.avgNetPerMonth ?? 0) : estimatedMonthlyNet, true)}
              </strong>
              <span>Avg per month</span>
            </div>
          </div>
        </section>

        <div className="payroll-finance-side">
          <section className="payroll-finance-card payroll-finance-panel">
            <h3 className="payroll-finance-panel__title">
              <span className="payroll-finance-panel__icon payroll-finance-panel__icon--calendar" aria-hidden />
              Upcoming dates
            </h3>
            {expiringContracts.length === 0 ? (
              <p className="payroll-finance-panel__empty">
                No expiring contracts. Contracts expiring in 30 days will appear here.
              </p>
            ) : (
              <ul className="payroll-finance-list">
                {expiringContracts.slice(0, 5).map((c, i) => (
                  <li key={c.id ?? i}>
                    {c.employeeName ?? 'Contract'}{' '}
                    {c.endDate ? `· ${new Date(c.endDate).toLocaleDateString()}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="payroll-finance-card payroll-finance-panel">
            <h3 className="payroll-finance-panel__title">This month&apos;s pipeline</h3>
            <div className="payroll-finance-pipeline">
              <div className="payroll-finance-pipeline__item payroll-finance-pipeline__item--pending">
                <span className="payroll-finance-pipeline__icon" aria-hidden />
                <span className="payroll-finance-pipeline__value">{pipeline.pending}</span>
                <span>Pending</span>
              </div>
              <div className="payroll-finance-pipeline__item payroll-finance-pipeline__item--hr">
                <span className="payroll-finance-pipeline__icon" aria-hidden />
                <span className="payroll-finance-pipeline__value">{pipeline.hrApproved}</span>
                <span>HR approved</span>
              </div>
              <div className="payroll-finance-pipeline__item payroll-finance-pipeline__item--md">
                <span className="payroll-finance-pipeline__icon" aria-hidden />
                <span className="payroll-finance-pipeline__value">{pipeline.mdApproved}</span>
                <span>MD approved</span>
              </div>
            </div>
          </section>

          <section className="payroll-finance-card payroll-finance-panel">
            <h3 className="payroll-finance-panel__title">Quick actions</h3>
            <div className="payroll-finance-actions">
              <button
                type="button"
                className="payroll-finance-btn payroll-finance-btn--primary"
                disabled={creating}
                onClick={onRunPayroll}
              >
                + Run payroll
              </button>
              <Link to="/payroll/employees/new" className="payroll-finance-btn payroll-finance-btn--outline">
                Add employee
              </Link>
              <Link to="/payroll/bulk-upload" className="payroll-finance-btn payroll-finance-btn--outline">
                Upload bulk
              </Link>
              <Link to="/payroll/reports" className="payroll-finance-btn payroll-finance-btn--outline">
                Generate report
              </Link>
            </div>
            {clients.length > 1 && (
              <label className="payroll-finance-client-pick">
                Client for new run
                <select
                  className="payroll-finance-select"
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                >
                  {clients.map((c) => (
                    <option key={c.clientId} value={c.clientId}>
                      {c.clientId}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </section>
        </div>
      </div>

      <section className="payroll-finance-card payroll-finance-recent">
        <div className="payroll-finance-recent__head">
          <h3>Recent payroll periods</h3>
          <Link to="/payroll/runs" className="payroll-finance-link">
            All runs →
          </Link>
        </div>
        {periods.length === 0 ? (
          <p className="payroll-finance-panel__empty">
            No periods yet. Use <strong>+ Run payroll</strong> to start.
          </p>
        ) : (
          <div className="payroll-finance-table-wrap">
            <table className="payroll-finance-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Period</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {periods.slice(0, 6).map((p) => (
                  <tr key={p.id}>
                    <td>{p.clientId}</td>
                    <td>
                      {p.periodMonth}/{p.periodYear}
                    </td>
                    <td>
                      <span className={`payroll-finance-status payroll-finance-status--${p.status.toLowerCase()}`}>
                        {p.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <Link to={`/payroll/runs/${p.id}`} className="payroll-finance-link">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
