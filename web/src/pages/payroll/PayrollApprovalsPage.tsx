import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchMe } from '../../api';
import { fetchPayrollRuns, type PayrollRun } from '../../payrollApi';
import { parseApiError } from '../../lib/parseApiError';
import { formatRwf } from '../../lib/formatRwf';
import { stageLabelForStatus } from '../../lib/payrollApproval';
import { PayrollPageShell, PayrollWorkspaceCard } from './PayrollPageShell';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/patterns/empty-state';
import { Inbox } from 'lucide-react';

type RunRow = PayrollRun & {
  recordCount?: number;
  totalNetPay?: number;
  submittedAt?: string | null;
};

type FilterTab = 'all' | 'awaiting_hr' | 'hr_approved' | 'md_approved' | 'completed';

const MONTHS = [
  'All months',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function clientLabel(clientId: string): string {
  if (clientId === 'default') return 'HC Solutions Ltd';
  return clientId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function periodTitle(run: RunRow): string {
  const month = MONTHS[run.periodMonth] ?? String(run.periodMonth);
  return `${clientLabel(run.clientId)} — ${month} ${run.periodYear}`;
}

function statusBadge(run: RunRow): { label: string; tone: 'completed' | 'progress' | 'pending' } {
  if (run.status === 'FINALIZED') return { label: 'Completed', tone: 'completed' };
  if (run.status === 'MD_APPROVED' || run.status === 'CLIENT_APPROVED') {
    return { label: 'MD approved', tone: 'progress' };
  }
  if (run.status === 'HR_APPROVED') return { label: 'Awaiting MD', tone: 'progress' };
  if (run.status === 'SUBMITTED') return { label: 'Awaiting HR', tone: 'pending' };
  if (run.status === 'DRAFT') return { label: 'Draft', tone: 'pending' };
  return { label: stageLabelForStatus(run.status), tone: 'pending' };
}

function pipelineStep(run: RunRow): number {
  switch (run.status) {
    case 'FINALIZED':
      return 3;
    case 'MD_APPROVED':
    case 'CLIENT_APPROVED':
      return 3;
    case 'HR_APPROVED':
      return 2;
    case 'SUBMITTED':
      return 1;
    default:
      return 0;
  }
}

function matchesTab(run: RunRow, tab: FilterTab): boolean {
  switch (tab) {
    case 'awaiting_hr':
      return run.status === 'SUBMITTED';
    case 'hr_approved':
      return run.status === 'HR_APPROVED';
    case 'md_approved':
      return run.status === 'MD_APPROVED' || run.status === 'CLIENT_APPROVED';
    case 'completed':
      return run.status === 'FINALIZED';
    default:
      return true;
  }
}

export function PayrollApprovalsPage() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<FilterTab>('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [me, all] = await Promise.all([fetchMe(), fetchPayrollRuns()]);
      setRoles(me.roles);
      setEmail(me.email ?? '');
      setRuns(all as RunRow[]);
    } catch (e) {
      setErr(parseApiError(e).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const clients = useMemo(() => {
    const ids = [...new Set(runs.map((r) => r.clientId))].sort();
    return ids;
  }, [runs]);

  const years = useMemo(() => {
    return [...new Set(runs.map((r) => r.periodYear))].sort((a, b) => b - a);
  }, [runs]);

  const kpis = useMemo(
    () => ({
      awaitingHr: runs.filter((r) => r.status === 'SUBMITTED').length,
      hrApproved: runs.filter((r) => r.status === 'HR_APPROVED').length,
      awaitingMd: runs.filter((r) => r.status === 'MD_APPROVED' || r.status === 'CLIENT_APPROVED').length,
      completed: runs.filter((r) => r.status === 'FINALIZED').length,
    }),
    [runs],
  );

  const filtered = useMemo(() => {
    return runs.filter((r) => {
      if (!matchesTab(r, tab)) return false;
      if (clientFilter !== 'all' && r.clientId !== clientFilter) return false;
      if (monthFilter !== 'all' && r.periodMonth !== Number(monthFilter)) return false;
      if (yearFilter !== 'all' && r.periodYear !== Number(yearFilter)) return false;
      return true;
    });
  }, [runs, tab, clientFilter, monthFilter, yearFilter]);

  const hero = (
    <section className="payroll-approvals-hero" aria-label="Payroll approval overview">
      <div className="payroll-approvals-hero__icon" aria-hidden="true" />
      <div>
        <h2 className="payroll-approvals-hero__title">Payroll approval dashboard</h2>
        <p className="payroll-approvals-hero__sub">
          Track payroll periods (by client &amp; month) through HR review → MD approval → bank submission.
        </p>
      </div>
    </section>
  );

  return (
    <PayrollPageShell pageTitle="Approvals" breadcrumb="Payroll" email={email} roles={roles} hero={hero}>
      {err && (
        <PayrollWorkspaceCard className="mb-4 border-destructive/40 bg-destructive/10">
          <p className="text-sm text-destructive-foreground">{err}</p>
          <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => load()}>
            Retry
          </Button>
        </PayrollWorkspaceCard>
      )}

      <div className="payroll-approvals-kpis">
        <div className="payroll-approvals-kpi payroll-approvals-kpi--amber">
          <span className="payroll-approvals-kpi__icon" aria-hidden />
          <div>
            <strong>{kpis.awaitingHr}</strong>
            <span>Awaiting HR</span>
          </div>
        </div>
        <div className="payroll-approvals-kpi payroll-approvals-kpi--violet">
          <span className="payroll-approvals-kpi__icon" aria-hidden />
          <div>
            <strong>{kpis.hrApproved}</strong>
            <span>HR approved</span>
          </div>
        </div>
        <div className="payroll-approvals-kpi payroll-approvals-kpi--green">
          <span className="payroll-approvals-kpi__icon" aria-hidden />
          <div>
            <strong>{kpis.awaitingMd}</strong>
            <span>Awaiting MD</span>
          </div>
        </div>
        <div className="payroll-approvals-kpi payroll-approvals-kpi--teal">
          <span className="payroll-approvals-kpi__icon" aria-hidden />
          <div>
            <strong>{kpis.completed}</strong>
            <span>Completed</span>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)} className="mb-4">
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-workspace-card p-1">
          {(
            [
              ['all', 'All periods'],
              ['awaiting_hr', 'Awaiting HR'],
              ['hr_approved', 'HR approved'],
              ['md_approved', 'MD approved'],
              ['completed', 'Completed'],
            ] as const
          ).map(([id, label]) => (
            <TabsTrigger key={id} value={id} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <section className="payroll-finance-card payroll-approvals-filters">
        <h3 className="payroll-approvals-filters__title">
          <span className="payroll-approvals-filters__funnel" aria-hidden />
          Filter payroll periods
        </h3>
        <div className="payroll-approvals-filters__row">
          <label>
            Client
            <select
              className="payroll-finance-select"
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
            >
              <option value="all">All clients</option>
              {clients.map((c) => (
                <option key={c} value={c}>
                  {clientLabel(c)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Month
            <select
              className="payroll-finance-select"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
            >
              <option value="all">All months</option>
              {MONTHS.slice(1).map((name, i) => (
                <option key={name} value={String(i + 1)}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Year
            <select
              className="payroll-finance-select"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
            >
              <option value="all">All years</option>
              {years.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {loading ? (
        <p className="payroll-light-muted">Loading payroll periods…</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No payroll periods"
          description="Nothing matches your filters. Try another stage or create a new payroll run."
          action={{ label: '+ Run payroll', href: '/payroll/runs' }}
        />
      ) : (
        <div className="payroll-period-grid">
          {filtered.map((run) => {
            const badge = statusBadge(run);
            const step = pipelineStep(run);
            const net = run.totalNetPay ?? 0;
            const employees = run.recordCount ?? run.records?.length ?? 0;
            const submitted = run.submittedAt ? new Date(run.submittedAt).toLocaleDateString() : '—';
            return (
              <article key={run.id} className="payroll-period-card">
                <div className="payroll-period-card__head">
                  <div>
                    <h4 className="payroll-period-card__title">{periodTitle(run)}</h4>
                    <p className="payroll-period-card__meta">Period #{String(run.periodMonth).padStart(2, '0')}</p>
                  </div>
                  <Badge
                    variant={
                      badge.tone === 'completed' ? 'success' : badge.tone === 'pending' ? 'accent' : 'secondary'
                    }
                  >
                    {badge.label}
                  </Badge>
                </div>
                <dl className="payroll-period-card__stats">
                  <div>
                    <dt>Period</dt>
                    <dd>
                      {run.periodMonth}/{run.periodYear}
                    </dd>
                  </div>
                  <div>
                    <dt>Employees</dt>
                    <dd>{employees}</dd>
                  </div>
                  <div>
                    <dt>Net salary</dt>
                    <dd>{net > 0 ? formatRwf(net) : '—'}</dd>
                  </div>
                  <div>
                    <dt>Submitted</dt>
                    <dd>{submitted}</dd>
                  </div>
                </dl>
                <div className="payroll-period-card__pipeline" aria-label="Approval progress">
                  {[1, 2, 3].map((n) => (
                    <span
                      key={n}
                      className={`payroll-period-card__dot${step >= n ? ' payroll-period-card__dot--on' : ''}`}
                    />
                  ))}
                </div>
                <div className="payroll-period-card__actions">
                  <Link to={`/payroll/runs/${run.id}`} className="payroll-period-card__btn payroll-period-card__btn--primary">
                    Details
                  </Link>
                  {run.status === 'FINALIZED' ? (
                    <Link
                      to={`/payroll/runs/${run.id}`}
                      className="payroll-period-card__btn payroll-period-card__btn--secondary"
                    >
                      Download payslips
                    </Link>
                  ) : (
                    <span className="payroll-period-card__btn payroll-period-card__btn--disabled">Download payslips</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </PayrollPageShell>
  );
}
