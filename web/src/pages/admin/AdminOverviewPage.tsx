import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  approveTenant,
  archiveTenant,
  purgeTenantPermanent,
  fetchMyTenant,
  fetchPendingTenants,
  fetchTenants,
  reactivateTenant,
  rejectTenant,
  suspendTenant,
  updateTenant,
  type TenantRow,
} from '../../api';
import {
  fetchApplications,
  fetchInterviews,
  fetchJobs,
  fetchPlacements,
  type Application,
  type Interview,
  type Job,
  type Placement,
} from '../../recruitmentApi';
import {
  fetchEmployees as fetchPayrollEmployees,
  fetchMyEmployee,
  fetchPayrollRuns,
  fetchLeaveRequests,
  fetchOutsourcingAssignments,
  fetchOutsourcingBench,
  fetchSecondmentContracts,
  fetchLeaveBalances,
  fetchGoals,
  fetchMyContracts,
  fetchMyPayslips,
  fetchMyTasks,
  fetchAnnouncements,
  updateTaskStatus,
  reportDownloadUrl,
  type Employee as PayrollEmployee,
  type PayrollRun,
  type LeaveRequest,
  type OutsourcingAssignment,
  type SecondmentContract,
  type LeaveBalance,
  type Task,
  type Announcement,
} from '../../payrollApi';
import { authFetch } from '../../lib/http';
import { StatusBadge } from './StatusBadge';
import { TenantCrudActions } from './TenantCrudActions';
import { parseError } from './parseError';
import { useAdminContext } from './useAdminContext';
import { hasAnyRole, isCompanyAdminOnly, isExecutiveLeader } from '../../lib/roles';
import {
  canSeeDashboardTab,
  defaultDashboardTab,
  primaryWorkspaceLabel,
  type DashboardTabId,
} from '../../lib/workspaceDashboard';
import { fetchHrDashboardSummary, type HrDashboardSummary } from '../../payrollApi';
import { CHART } from '../../lib/brand';
import './dashboard.css';

// ── Stage config ──────────────────────────────────────────────────────────────

const STAGES = [
  { stage: 'APPLIED',     label: 'Applied',     color: CHART.primary },
  { stage: 'SCREENED',    label: 'Screened',    color: CHART.info },
  { stage: 'SHORTLISTED', label: 'Shortlisted', color: CHART.primary },
  { stage: 'INTERVIEWED', label: 'Interviewed', color: CHART.warning },
  { stage: 'OFFERED',     label: 'Offered',     color: CHART.secondary },
  { stage: 'PLACED',      label: 'Placed',      color: CHART.success },
];

// ── Icon helpers ──────────────────────────────────────────────────────────────

const IcoBriefcase = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2"/>
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
  </svg>
);

const IcoUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const IcoAward = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="6"/>
    <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
  </svg>
);

const IcoCalendar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

// ── Donut Chart ───────────────────────────────────────────────────────────────

type DonutSeg = { label: string; count: number; color: string };

function DonutChart({ segments }: { segments: DonutSeg[] }) {
  const total = segments.reduce((s, seg) => s + seg.count, 0);
  const r = 52;
  const cx = 70;
  const cy = 70;
  const C = 2 * Math.PI * r;
  const GAP = 3;

  let cumulative = 0;
  const arcs = segments.map((seg) => {
    const rawLen = total ? (seg.count / total) * C : 0;
    const len = Math.max(0, rawLen - GAP);
    const arc = { ...seg, len, offset: cumulative };
    cumulative += rawLen;
    return arc;
  });

  return (
    <div className="dash-donut">
      <svg viewBox="0 0 140 140" width="140" height="140" aria-hidden="true">
        {total === 0 ? (
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth="16" />
        ) : (
          <g transform={`rotate(-90 ${cx} ${cy})`}>
            {arcs.map((arc, i) => (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={arc.color}
                strokeWidth="16"
                strokeDasharray={`${arc.len} ${C - arc.len}`}
                strokeDashoffset={-arc.offset}
              />
            ))}
          </g>
        )}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="21" fontWeight="700" fill="var(--ink, #0f172a)">
          {total}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="10" fill="#94a3b8">
          total
        </text>
      </svg>
      <div className="dash-donut__legend">
        {segments.filter(s => s.count > 0).map((seg, i) => (
          <div key={i} className="dash-donut__row">
            <span className="dash-donut__dot" style={{ background: seg.color }} />
            <span className="dash-donut__lbl">{seg.label}</span>
            <span className="dash-donut__cnt">{seg.count}</span>
          </div>
        ))}
        {total === 0 && (
          <p className="muted small" style={{ margin: 0 }}>No applications yet</p>
        )}
      </div>
    </div>
  );
}

// ── Funnel Chart ──────────────────────────────────────────────────────────────

type FunnelStage = { label: string; count: number; color: string };

function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  const max = Math.max(...stages.map(s => s.count), 1);
  const first = stages[0]?.count ?? 0;
  return (
    <div className="dash-funnel">
      {stages.map((s, i) => {
        const convPct = first > 0 && i > 0 ? Math.round((s.count / first) * 100) : null;
        return (
          <div key={i} className="dash-funnel__row">
            <div className="dash-funnel__label">{s.label}</div>
            <div className="dash-funnel__track">
              <div
                className="dash-funnel__fill"
                style={{ width: `${Math.max((s.count / max) * 100, s.count > 0 ? 3 : 0)}%`, background: s.color }}
              />
            </div>
            <div className="dash-funnel__meta">
              <span className="dash-funnel__count">{s.count}</span>
              {convPct !== null && (
                <span className="dash-funnel__pct">{convPct}%</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Top List ──────────────────────────────────────────────────────────────────

type TopItem = { name: string; value: number };

function TopList({ items, emptyMsg }: { items: TopItem[]; emptyMsg?: string }) {
  const max = Math.max(...items.map(i => i.value), 1);
  if (!items.length) {
    return <p className="muted small" style={{ margin: 0 }}>{emptyMsg ?? 'No data yet'}</p>;
  }
  return (
    <div className="dash-toplist">
      {items.map((item, i) => (
        <div key={i} className="dash-toplist__row">
          <span className="dash-toplist__rank">{i + 1}</span>
          <div className="dash-toplist__body">
            <div className="dash-toplist__name">{item.name}</div>
            <div className="dash-toplist__track">
              <div className="dash-toplist__fill" style={{ width: `${(item.value / max) * 100}%` }} />
            </div>
          </div>
          <span className="dash-toplist__val">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Activity Feed ─────────────────────────────────────────────────────────────

function ActivityFeed({ applications }: { applications: Application[] }) {
  const items = [...applications]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  if (!items.length) {
    return <p className="muted small" style={{ margin: 0 }}>No applications yet</p>;
  }

  const fmtDate = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diff / 3_600_000);
    if (h < 1) return 'just now';
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return new Date(iso).toLocaleDateString();
  };

  return (
    <div className="dash-activity">
      {items.map((app) => {
        const stage = STAGES.find(s => s.stage === app.stage);
        const candidateName = app.candidate
          ? `${app.candidate.firstName} ${app.candidate.lastName}`
          : 'A candidate';
        const jobTitle = app.job?.title ?? 'a role';
        return (
          <div key={app.id} className="dash-activity__row">
            <span className="dash-activity__dot" style={{ background: stage?.color ?? '#94a3b8' }} />
            <div className="dash-activity__body">
              <span className="dash-activity__name">{candidateName}</span>
              <span className="dash-activity__desc"> · {stage?.label ?? app.stage} for {jobTitle}</span>
            </div>
            <span className="dash-activity__time">{fmtDate(app.createdAt)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, secondary, icon, color }: {
  label: string;
  value: string;
  secondary: string;
  icon: ReactNode;
  color: string;
}) {
  return (
    <div className="dash-kpi">
      <div className="dash-kpi__icon-wrap" style={{ background: `${color}1a`, color }}>
        {icon}
      </div>
      <div className="dash-kpi__body">
        <div className="dash-kpi__label">{label}</div>
        <div className="dash-kpi__value">{value}</div>
        <div className="dash-kpi__secondary">{secondary}</div>
      </div>
    </div>
  );
}

// ── Dashboard data ────────────────────────────────────────────────────────────

type DashData = {
  jobs: Job[];
  applications: Application[];
  interviews: Interview[];
  placements: Placement[];
};

// ── Recruitment Sub-Dashboard ─────────────────────────────────────────────────

function RecruitmentDashboard({
  data,
  loading,
  stageCounts,
  topJobs,
  topClients,
  openJobs,
  inPipeline,
  placements,
  scheduled,
  totalApps,
}: {
  data: DashData | null;
  loading: boolean;
  stageCounts: Record<string, number>;
  topJobs: TopItem[];
  topClients: TopItem[];
  openJobs: number;
  inPipeline: number;
  placements: number;
  scheduled: number;
  totalApps: number;
}) {
  return (
    <>
      <div className="dash-kpi-grid">
        <KpiCard
          label="Open Positions"
          value={loading ? '…' : String(openJobs)}
          secondary={`${data?.jobs.length ?? 0} total jobs`}
          icon={<IcoBriefcase />}
          color={CHART.primary}
        />
        <KpiCard
          label="In Pipeline"
          value={loading ? '…' : String(inPipeline)}
          secondary={`${totalApps} total applications`}
          icon={<IcoUsers />}
          color={CHART.info}
        />
        <KpiCard
          label="Placements"
          value={loading ? '…' : String(placements)}
          secondary={`${stageCounts['OFFERED'] ?? 0} pending offers`}
          icon={<IcoAward />}
          color={CHART.success}
        />
        <KpiCard
          label="Interviews"
          value={loading ? '…' : String(scheduled)}
          secondary={`${data?.interviews.length ?? 0} total`}
          icon={<IcoCalendar />}
          color={CHART.secondary}
        />
      </div>

      <div className="dash-row-2">
        <div className="dash-chart-card">
          <h3 className="dash-chart-card__title">Application Pipeline</h3>
          {loading
            ? <p className="muted small">Loading…</p>
            : <DonutChart segments={STAGES.map(s => ({ label: s.label, color: s.color, count: stageCounts[s.stage] ?? 0 }))} />
          }
        </div>
        <div className="dash-chart-card">
          <h3 className="dash-chart-card__title">Recruitment Funnel</h3>
          {loading
            ? <p className="muted small">Loading…</p>
            : <FunnelChart stages={STAGES.map(s => ({ label: s.label, color: s.color, count: stageCounts[s.stage] ?? 0 }))} />
          }
        </div>
      </div>

      <div className="dash-row-2">
        <div className="dash-chart-card">
          <h3 className="dash-chart-card__title">Top Jobs by Applications</h3>
          {loading
            ? <p className="muted small">Loading…</p>
            : <TopList items={topJobs} emptyMsg="Create jobs to see rankings here" />
          }
        </div>
        <div className="dash-chart-card">
          <h3 className="dash-chart-card__title">Recent Applications</h3>
          {loading
            ? <p className="muted small">Loading…</p>
            : <ActivityFeed applications={data?.applications ?? []} />
          }
        </div>
      </div>

      {!loading && topClients.length > 0 && (
        <div className="dash-row-2" style={{ marginBottom: 0 }}>
          <div className="dash-chart-card">
            <h3 className="dash-chart-card__title">Top Clients by Placements</h3>
            <TopList items={topClients} />
          </div>
          <div className="dash-chart-card">
            <h3 className="dash-chart-card__title">Quick links</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link to="/recruitment" className="adm-module" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.9rem' }}>
                <span className="adm-module__icon" style={{ fontSize: '1rem' }}>📋</span>
                <span className="adm-module__name" style={{ fontSize: '0.88rem' }}>Open Recruitment</span>
              </Link>
              <Link to="/recruitment/candidates" className="adm-module" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.9rem' }}>
                <span className="adm-module__icon" style={{ fontSize: '1rem' }}>👤</span>
                <span className="adm-module__name" style={{ fontSize: '0.88rem' }}>Candidates</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Workforce & HR Sub-Dashboard (HR / leadership) ───────────────────────────

function WorkforceDashboard() {
  const [summary, setSummary] = useState<HrDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const { me } = useAdminContext();
  const showExecutive = me ? isExecutiveLeader(me.roles) : false;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchHrDashboardSummary()
      .then((s) => {
        if (!cancelled) setSummary(s);
      })
      .catch((e) => {
        if (!cancelled) setErr(parseError(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="muted">Loading workforce snapshot…</p>;
  }
  if (err || !summary) {
    return (
      <div className="alert alert--err" role="alert">
        {err ?? 'Could not load workforce data.'}
      </div>
    );
  }

  const perf = summary.performance;

  return (
    <>
      {showExecutive && (
        <div className="dash-role-banner dash-role-banner--exec">
          <div>
            <strong>Executive overview</strong>
            <p className="muted small" style={{ margin: '0.25rem 0 0' }}>
              Company-wide KPIs, approvals, and board-ready summaries live in the leadership workspace.
            </p>
          </div>
          <Link to="/executive" className="btn btn--primary btn--sm">
            Open executive dashboard
          </Link>
        </div>
      )}

      <div className="dash-kpi-grid">
        <KpiCard
          label="Headcount"
          value={String(summary.headcount.total)}
          secondary="active employees"
          icon={<IcoUsers />}
          color={CHART.primary}
        />
        <KpiCard
          label="Leave queue"
          value={String(summary.leave.pendingApprovals)}
          secondary="pending approvals"
          icon={<IcoBriefcase />}
          color={CHART.warning}
        />
        <KpiCard
          label="Attrition (12 mo)"
          value={`${summary.turnover.ratePct.toFixed(1)}%`}
          secondary={`${summary.turnover.terminatedLast12Months} departures`}
          icon={<IcoAward />}
          color={CHART.error}
        />
        <KpiCard
          label="Payroll exceptions"
          value={String(summary.payroll.exceptionsCount)}
          secondary={`${summary.payroll.inProgressPeriods.length} period(s) in flight`}
          icon={<IcoBriefcase />}
          color={CHART.success}
        />
      </div>

      <div className="dash-row-2">
        <div className="dash-chart-card">
          <h3 className="dash-chart-card__title">Performance cycle</h3>
          {perf ? (
            <>
              <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>{perf.cycleName}</p>
              <div className="dash-funnel">
                <div className="dash-funnel__row">
                  <span className="dash-funnel__label">Completion</span>
                  <div className="dash-funnel__track">
                    <div
                      className="dash-funnel__fill"
                      style={{ width: `${Math.min(100, perf.completionPct)}%`, background: CHART.primary }}
                    />
                  </div>
                  <span className="dash-funnel__count">{perf.completionPct}%</span>
                </div>
              </div>
              <p className="muted small" style={{ margin: '0.5rem 0 0' }}>
                {perf.completedCount} / {perf.totalEmployees} complete
                {perf.overdueCount > 0 ? ` · ${perf.overdueCount} overdue` : ''}
              </p>
            </>
          ) : (
            <p className="muted small">No active appraisal cycle.</p>
          )}
        </div>
        <div className="dash-chart-card">
          <h3 className="dash-chart-card__title">Quick actions</h3>
          <div className="dash-quick-links">
            <Link to="/platform/hr-dashboard" className="adm-module">
              <span className="adm-module__icon">📊</span>
              <span className="adm-module__name">Full HR dashboard</span>
            </Link>
            <Link to="/leave/approvals" className="adm-module">
              <span className="adm-module__icon">✓</span>
              <span className="adm-module__name">Leave approvals</span>
            </Link>
            <Link to="/payroll/dashboard" className="adm-module">
              <span className="adm-module__icon">💳</span>
              <span className="adm-module__name">Payroll operations</span>
            </Link>
            <Link to="/performance/cycles" className="adm-module">
              <span className="adm-module__icon">🎯</span>
              <span className="adm-module__name">Performance cycles</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Finance & Payroll Sub-Dashboard ───────────────────────────────────────────

function FinanceDashboard() {
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [bankFileErr, setBankFileErr] = useState<string | null>(null);
  const [bankFileBusy, setBankFileBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchPayrollEmployees({ employmentStatus: 'ACTIVE' }),
      fetchPayrollRuns().catch(() => []),
    ]).then(([empData, runData]) => {
      const empList = Array.isArray(empData) ? empData : (empData as any)?.data || [];
      setEmployees(empList);
      setRuns(runData || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const employeeCount = employees.length;
  const totalPayout = employees.reduce((sum, e) => sum + (Number(e.baseSalary) || 0), 0);
  const taxes = Math.round(totalPayout * 0.25);
  const netPay = totalPayout - taxes;
  const lockedRuns = runs.filter((r) => (r.status as string) === 'LOCKED' || (r.status as string) === 'APPROVED' || (r.status as string) === 'COMPLETED');
  const latestLockedRun = lockedRuns[0] ?? null;

  const fmtCurrency = (val: number) => {
    return 'RWF ' + val.toLocaleString();
  };

  const generateBankFile = async () => {
    if (!latestLockedRun) return;
    setBankFileBusy(true);
    setBankFileErr(null);
    try {
      const r = await authFetch(reportDownloadUrl(latestLockedRun.id, 'bank-file'));
      if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
      const blob = await r.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `bank-file-${latestLockedRun.id}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (e) {
      setBankFileErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBankFileBusy(false);
    }
  };

  return (
    <>
      <div className="dash-kpi-grid">
        <KpiCard
          label="Est. Gross Payout"
          value={loading ? '…' : fmtCurrency(totalPayout)}
          secondary="current period cost"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          }
          color={CHART.success}
        />
        <KpiCard
          label="Est. Net Payout"
          value={loading ? '…' : fmtCurrency(netPay)}
          secondary="direct bank transfer list"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2"/>
              <line x1="2" y1="10" x2="22" y2="10"/>
            </svg>
          }
          color={CHART.info}
        />
        <KpiCard
          label="Est. Statutory Taxes"
          value={loading ? '…' : fmtCurrency(taxes)}
          secondary="PAYE & RSSB declarations"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          }
          color={CHART.warning}
        />
        <KpiCard
          label="Active Payees"
          value={loading ? '…' : String(employeeCount)}
          secondary="onboarded staff members"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          }
          color={CHART.primary}
        />
      </div>

      <div className="dash-row-2">
        <div className="dash-chart-card">
          <h3 className="dash-chart-card__title">Recent Payroll Periods</h3>
          {loading ? (
            <p className="muted small">Loading runs…</p>
          ) : runs.length > 0 ? (
            <ul className="stat-list">
              {runs.slice(0, 5).map((run) => (
                <li key={run.id} className="stat-item">
                  <div>
                    <span className="stat-item__name">
                      Run for Client: {run.tenantId.slice(0, 8)}
                    </span>
                    <div className="stat-item__meta">
                      Period: {run.periodMonth}/{run.periodYear} · Currency: {run.currency}
                    </div>
                  </div>
                  <span className={`status-badge status-badge--${run.status.toLowerCase()}`}>
                    {run.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small" style={{ margin: 0 }}>No payroll runs recorded yet.</p>
          )}
          <div style={{ marginTop: '1rem' }}>
            <Link to="/payroll/runs" className="btn btn--ghost small">View All Runs →</Link>
          </div>
        </div>

        <div className="dash-chart-card">
          <h3 className="dash-chart-card__title">Rwanda Statutory Contribution Rates</h3>
          <p className="muted small" style={{ margin: '0 0 0.75rem' }}>Reference rates only — actual filing status is tracked per payroll run, not shown here.</p>
          <ul className="stat-list">
            <li className="stat-item">
              <span className="stat-item__name">RRA PAYE</span>
              <span className="stat-item__meta">Monthly progressive tax bands</span>
            </li>
            <li className="stat-item">
              <span className="stat-item__name">RSSB Pension Fund</span>
              <span className="stat-item__meta">5% employee + 5% employer</span>
            </li>
            <li className="stat-item">
              <span className="stat-item__name">RSSB Medical (RAMA)</span>
              <span className="stat-item__meta">7.5% combined</span>
            </li>
            <li className="stat-item">
              <span className="stat-item__name">Maternity Leave Fund</span>
              <span className="stat-item__meta">0.3% employee + 0.3% employer</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="dash-row-2" style={{ marginBottom: 0 }}>
        <div className="dash-chart-card">
          <h3 className="dash-chart-card__title">Quick Admin Tools</h3>
          <div className="quick-actions-grid">
            <Link to="/payroll/runs" className="adm-module" style={{ padding: '0.75rem', gap: '0.3rem', textAlign: 'center' }}>
              <span className="adm-module__name" style={{ fontSize: '0.85rem' }}>➕ New Payroll Run</span>
            </Link>
            <Link to="/payroll/reports" className="adm-module" style={{ padding: '0.75rem', gap: '0.3rem', textAlign: 'center' }}>
              <span className="adm-module__name" style={{ fontSize: '0.85rem' }}>📊 Export Statutory PAYE</span>
            </Link>
            <Link to="/payroll/settings" className="adm-module" style={{ padding: '0.75rem', gap: '0.3rem', textAlign: 'center' }}>
              <span className="adm-module__name" style={{ fontSize: '0.85rem' }}>⚙ Config Tax Bands</span>
            </Link>
            <Link to="/payroll/employees" className="adm-module" style={{ padding: '0.75rem', gap: '0.3rem', textAlign: 'center' }}>
              <span className="adm-module__name" style={{ fontSize: '0.85rem' }}>👤 Salary Profiles</span>
            </Link>
          </div>
        </div>
        <div className="dash-chart-card">
          <h3 className="dash-chart-card__title">Bank Payment File Exports</h3>
          <p className="muted small" style={{ marginBottom: '1rem' }}>
            Compile and export a bank-compliant CSV net salary transfer list for direct upload to corporate banking portals.
          </p>
          {bankFileErr && <div className="alert alert--err" style={{ marginBottom: '0.75rem' }}>{bankFileErr}</div>}
          <button
            className="btn btn--primary small"
            disabled={!latestLockedRun || bankFileBusy}
            onClick={generateBankFile}
          >
            {bankFileBusy ? 'Generating…' : 'Generate Bank File (RWF)'}
          </button>
          {!latestLockedRun && (
            <p className="muted small" style={{ marginTop: '0.5rem' }}>Lock a payroll run first to enable this export.</p>
          )}
        </div>
      </div>
    </>
  );
}

// ── Client Operations Sub-Dashboard ───────────────────────────────────────────

function ClientDashboard() {
  const [assignments, setAssignments] = useState<OutsourcingAssignment[]>([]);
  const [contracts, setContracts] = useState<SecondmentContract[]>([]);
  const [bench, setBench] = useState<OutsourcingAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchOutsourcingAssignments().catch(() => []),
      fetchSecondmentContracts().catch(() => []),
      fetchOutsourcingBench().catch(() => []),
    ]).then(([assignData, contractData, benchData]) => {
      setAssignments(assignData || []);
      setContracts(contractData || []);
      setBench(benchData || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const activeCount = assignments.filter((a) => a.deploymentStatus === 'ACTIVE').length;
  const estBilling = contracts
    .filter((c) => c.status === 'ACTIVE')
    .reduce((sum, c) => sum + (Number(c.billingRate) || 0), 0);

  const daysUntil = (d: string | null) => d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null;
  const expiringSoon = contracts.filter((c) => {
    const days = daysUntil(c.endDate);
    return c.status === 'ACTIVE' && days !== null && days >= 0 && days <= 90;
  }).length;

  const siteHeadcount = useMemo(() => {
    const bySite: Record<string, number> = {};
    assignments.filter((a) => a.deploymentStatus === 'ACTIVE').forEach((a) => {
      const site = a.deploymentSite || 'Unspecified site';
      bySite[site] = (bySite[site] ?? 0) + 1;
    });
    return Object.entries(bySite).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [assignments]);

  return (
    <>
      <div className="dash-kpi-grid">
        <KpiCard
          label="Active Deployments"
          value={loading ? '…' : String(activeCount)}
          secondary="seconded personnel"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          }
          color={CHART.info}
        />
        <KpiCard
          label="Est. Monthly Billing"
          value={loading ? '…' : 'RWF ' + estBilling.toLocaleString()}
          secondary="derived from contract rates"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          }
          color={CHART.success}
        />
        <KpiCard
          label="Expiring ≤ 90 Days"
          value={loading ? '…' : String(expiringSoon)}
          secondary="secondment contracts"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          }
          color={CHART.warning}
        />
        <KpiCard
          label="On-Bench Staff"
          value={loading ? '…' : String(bench.length)}
          secondary="ready for deployment"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="9" y1="9" x2="15" y2="9"/>
              <line x1="9" y1="13" x2="15" y2="13"/>
              <line x1="9" y1="17" x2="13" y2="17"/>
            </svg>
          }
          color={CHART.error}
        />
      </div>

      <div className="dash-row-2">
        <div className="dash-chart-card">
          <h3 className="dash-chart-card__title">Deployment Site Headcount</h3>
          {loading ? (
            <p className="muted small">Loading…</p>
          ) : siteHeadcount.length > 0 ? (
            <ul className="stat-list">
              {siteHeadcount.map(([site, count]) => (
                <li key={site} className="stat-item">
                  <span className="stat-item__name">{site}</span>
                  <span className="stat-item__meta" style={{ fontWeight: 700 }}>{count} employee{count === 1 ? '' : 's'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small" style={{ margin: 0 }}>No active deployments yet</p>
          )}
        </div>

        <div className="dash-chart-card">
          <h3 className="dash-chart-card__title">Top Clients by Active Deployments</h3>
          {loading ? (
            <p className="muted small">Loading…</p>
          ) : (() => {
            const byClient: Record<string, number> = {};
            assignments.filter((a) => a.deploymentStatus === 'ACTIVE').forEach((a) => {
              byClient[a.clientName] = (byClient[a.clientName] ?? 0) + 1;
            });
            const top = Object.entries(byClient).sort((a, b) => b[1] - a[1]).slice(0, 5);
            return top.length > 0 ? (
              <ul className="stat-list">
                {top.map(([client, count]) => (
                  <li key={client} className="stat-item">
                    <span className="stat-item__name">{client}</span>
                    <span className="stat-item__meta" style={{ fontWeight: 700 }}>{count} deployed</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small" style={{ margin: 0 }}>No active client deployments yet</p>
            );
          })()}
        </div>
      </div>

      <div className="dash-row-2" style={{ marginBottom: 0 }}>
        <div className="dash-chart-card">
          <h3 className="dash-chart-card__title">Secondment Contract Alerts</h3>
          {loading ? (
            <p className="muted small">Loading contracts…</p>
          ) : contracts.length > 0 ? (
            <ul className="stat-list">
              {contracts.slice(0, 3).map((c) => (
                <li key={c.id} className="stat-item">
                  <div>
                    <span className="stat-item__name">{c.role} - {c.clientName}</span>
                    <div className="stat-item__meta">Expires: {new Date(c.endDate || '').toLocaleDateString()}</div>
                  </div>
                  <span className="status-badge status-badge--active">{c.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small" style={{ margin: 0 }}>No secondment contracts recorded yet</p>
          )}
        </div>
        <div className="dash-chart-card">
          <h3 className="dash-chart-card__title">Outsourcing Tools</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Link to="/payroll/outsourcing" className="adm-module" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.9rem' }}>
              <span className="adm-module__icon" style={{ fontSize: '1.2rem' }}>👥</span>
              <span className="adm-module__name" style={{ fontSize: '0.88rem' }}>Deploy Seconded Staff</span>
            </Link>
            <Link to="/payroll/contracts" className="adm-module" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.9rem' }}>
              <span className="adm-module__icon" style={{ fontSize: '1.2rem' }}>📄</span>
              <span className="adm-module__name" style={{ fontSize: '0.88rem' }}>Billing Rate Agreements</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Employee Self-Service Sub-Dashboard ───────────────────────────────────────

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function EmployeeDashboard({ me }: { me?: any }) {
  const [employee, setEmployee] = useState<PayrollEmployee | null>(null);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const emp = await fetchMyEmployee();
        if (cancelled) return;
        setEmployee(emp);
        if (!emp) {
          setNotFound(true);
          return;
        }
        const year = new Date().getFullYear();
        const [balances, reqs, gls, cons, slips, myTasks, notices] = await Promise.all([
          fetchLeaveBalances(emp.id, year).catch(() => []),
          fetchLeaveRequests(undefined, emp.id).catch(() => []),
          fetchGoals(emp.id).catch(() => []),
          fetchMyContracts().catch(() => []),
          fetchMyPayslips().catch(() => []),
          fetchMyTasks().catch(() => []),
          fetchAnnouncements().catch(() => []),
        ]);
        if (cancelled) return;
        setLeaveBalances(balances);
        setLeaveRequests(reqs || []);
        setGoals(Array.isArray(gls) ? gls : []);
        setContracts(Array.isArray(cons) ? cons : []);
        setPayslips(Array.isArray(slips) ? slips : []);
        setTasks(myTasks);
        setAnnouncements(notices);
      } catch {
        // Most commonly a 403 from fetchMyEmployee() — no Employee record linked to this
        // account yet. Same empty-state messaging as the explicit !emp branch above.
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [me?.email]);

  const openTasks = tasks.filter((t) => t.status !== 'DONE');

  const onQuickComplete = async (id: string) => {
    try {
      await updateTaskStatus(id, 'DONE');
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'DONE' } : t)));
    } catch {
      // Non-fatal — the task stays open if this fails; user can retry from the Tasks page.
    }
  };

  const totalAllocated = leaveBalances.reduce((s, b) => s + Number(b.allocatedDays), 0);
  const totalUsed = leaveBalances.reduce((s, b) => s + Number(b.usedDays), 0);
  const leaveRemaining = totalAllocated - totalUsed;

  const activeGoals = goals.filter((g: any) => g.status !== 'REJECTED');
  const avgProgress = activeGoals.length
    ? Math.round(activeGoals.reduce((s: number, g: any) => s + (Number(g.progress) || 0), 0) / activeGoals.length)
    : null;

  const activeContract = contracts.find((c: any) => c.status === 'ACTIVE') ?? contracts[0] ?? null;
  const daysToReview = activeContract?.endDate
    ? Math.max(0, Math.ceil((new Date(activeContract.endDate).getTime() - Date.now()) / 86400000))
    : null;

  const sortedPayslips = [...payslips].sort((a: any, b: any) =>
    (b.periodYear - a.periodYear) || (b.periodMonth - a.periodMonth));
  const latestPayslip = sortedPayslips[0] ?? null;

  return (
    <>
      <div className="dash-kpi-grid">
        <KpiCard
          label="Leave Balance"
          value={loading ? '…' : leaveBalances.length ? leaveRemaining.toFixed(1) : '—'}
          secondary={loading ? '' : leaveBalances.length ? `of ${totalAllocated.toFixed(0)} total days` : 'no allocation yet'}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          }
          color={CHART.success}
        />
        <KpiCard
          label="Active Goals"
          value={loading ? '…' : avgProgress !== null ? `${avgProgress}%` : '—'}
          secondary={loading ? '' : activeGoals.length ? `${activeGoals.length} active goal${activeGoals.length === 1 ? '' : 's'}` : 'no goals set'}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="6"/>
              <circle cx="12" cy="12" r="2"/>
            </svg>
          }
          color={CHART.info}
        />
        <KpiCard
          label="Next Contract Review"
          value={loading ? '…' : daysToReview !== null ? String(daysToReview) : '—'}
          secondary={loading ? '' : daysToReview !== null ? 'days left' : 'no active contract'}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          }
          color={CHART.warning}
        />
        <KpiCard
          label="Latest Payslip"
          value={loading ? '…' : latestPayslip ? MONTH_NAMES[latestPayslip.periodMonth - 1]?.slice(0, 3) ?? String(latestPayslip.periodMonth) : '—'}
          secondary={loading ? '' : latestPayslip ? String(latestPayslip.periodYear) : 'none yet'}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          }
          color={CHART.primary}
        />
      </div>

      {notFound && !loading && (
        <div className="alert alert--warn" style={{ marginBottom: '1rem' }}>
          No employee record is linked to your account email yet — showing empty state until HR links your profile.
        </div>
      )}

      <div className="dash-row-2">
        <div className="dash-chart-card">
          <h3 className="dash-chart-card__title">My Profile & Contract Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
            <div>
              <span className="muted small">Job Title</span>
              <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{(employee as any)?.jobTitle ?? '—'}</div>
            </div>
            <div>
              <span className="muted small">Department</span>
              <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{employee?.department ?? '—'}</div>
            </div>
            <div>
              <span className="muted small">Contract Type</span>
              <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{activeContract?.contractType ?? '—'}</div>
            </div>
            <div>
              <span className="muted small">Join Date</span>
              <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
                {employee?.startDate ? new Date(employee.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
              </div>
            </div>
          </div>
        </div>

        <div className="dash-chart-card">
          <h3 className="dash-chart-card__title">Recent Leave Requests</h3>
          {loading ? (
            <p className="muted small">Loading leave history…</p>
          ) : leaveRequests.length > 0 ? (
            <ul className="stat-list">
              {leaveRequests.slice(0, 3).map((r) => (
                <li key={r.id} className="stat-item">
                  <div>
                    <span className="stat-item__name">Leave ({parseFloat(r.numberOfDays)} days)</span>
                    <div className="stat-item__meta">{r.startDate} to {r.endDate}</div>
                  </div>
                  <span className={`status-badge status-badge--${r.status.toLowerCase()}`}>{r.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small" style={{ margin: 0 }}>No leave requests yet</p>
          )}
          <div style={{ marginTop: '1rem' }}>
            <Link to="/leave" className="btn btn--primary small">Request New Leave</Link>
          </div>
        </div>
      </div>

      <div className="dash-row-2" style={{ marginBottom: 0 }}>
        <div className="dash-chart-card">
          <h3 className="dash-chart-card__title">Active Performance Goals</h3>
          {loading ? (
            <p className="muted small">Loading goals…</p>
          ) : activeGoals.length > 0 ? (
            <ul className="stat-list">
              {activeGoals.slice(0, 4).map((g: any) => {
                const progress = Math.max(0, Math.min(100, Number(g.progress) || 0));
                return (
                  <li key={g.id} className="stat-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="stat-item__name">{g.title}</span>
                      <span className="stat-item__meta">{progress}%</span>
                    </div>
                    <div style={{ background: 'var(--surface)', height: '6px', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ background: 'var(--brand)', height: '100%', width: `${progress}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted small" style={{ margin: 0 }}>No goals set for the current cycle yet</p>
          )}
        </div>

        <div className="dash-chart-card">
          <h3 className="dash-chart-card__title">Recent Monthly Payslips</h3>
          {loading ? (
            <p className="muted small">Loading payslips…</p>
          ) : sortedPayslips.length > 0 ? (
            <ul className="stat-list">
              {sortedPayslips.slice(0, 3).map((p: any, i: number) => (
                <li key={i} className="stat-item">
                  <div>
                    <span className="stat-item__name">{MONTH_NAMES[p.periodMonth - 1] ?? p.periodMonth} {p.periodYear} Payslip</span>
                    <div className="stat-item__meta">RWF {Number(p.netPay).toLocaleString()} · Net Salary</div>
                  </div>
                  <Link to={p.runId ? `/payroll/runs/${p.runId}` : '/payroll/reports'} className="btn btn--ghost small">
                    View
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small" style={{ margin: 0 }}>No payslips issued yet</p>
          )}
        </div>
      </div>

      <div className="dash-row-2" style={{ marginBottom: 0, marginTop: '1.5rem' }}>
        <div className="dash-chart-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 className="dash-chart-card__title" style={{ margin: 0 }}>My Tasks</h3>
            <Link to="/platform/tasks" className="btn btn--ghost small">View All →</Link>
          </div>
          {loading ? (
            <p className="muted small">Loading tasks…</p>
          ) : openTasks.length > 0 ? (
            <ul className="stat-list">
              {openTasks.slice(0, 4).map((t) => (
                <li key={t.id} className="stat-item">
                  <div>
                    <span className="stat-item__name">{t.title}</span>
                    <div className="stat-item__meta">
                      {t.dueDate ? `Due ${new Date(t.dueDate).toLocaleDateString()}` : 'No due date'} · {t.assignedByName}
                    </div>
                  </div>
                  <button type="button" className="btn btn--ghost small" onClick={() => onQuickComplete(t.id)}>
                    Mark Done
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small" style={{ margin: 0 }}>Nothing on your list right now</p>
          )}
        </div>

        <div className="dash-chart-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 className="dash-chart-card__title" style={{ margin: 0 }}>Announcements</h3>
            <Link to="/platform/announcements" className="btn btn--ghost small">View All →</Link>
          </div>
          {loading ? (
            <p className="muted small">Loading announcements…</p>
          ) : announcements.length > 0 ? (
            <ul className="stat-list">
              {announcements.slice(0, 3).map((a) => (
                <li key={a.id} className="stat-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.2rem' }}>
                  <span className="stat-item__name">{a.title}</span>
                  <span className="stat-item__meta">{a.team?.name ?? 'Company-wide'} · {a.postedByName}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small" style={{ margin: 0 }}>No announcements yet</p>
          )}
        </div>
      </div>
    </>
  );
}

// ── Company Dashboard (active tenant switcher wrapper) ────────────────────────

function CompanyDashboard({ displayName }: { displayName: string }) {
  const { me } = useAdminContext();
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const userRoles = me?.roles || [];
  const canSeeWorkforce = canSeeDashboardTab(userRoles, 'workforce');
  const canSeeRecruitment = canSeeDashboardTab(userRoles, 'recruitment');
  const canSeePayroll = canSeeDashboardTab(userRoles, 'payroll');
  const canSeeClient = canSeeDashboardTab(userRoles, 'client');
  const canSeeEmployee = canSeeDashboardTab(userRoles, 'employee');
  const roleLabel = primaryWorkspaceLabel(userRoles);
  const adminHome = isCompanyAdminOnly(userRoles);
  const roleDefaultTab = useMemo(() => defaultDashboardTab(userRoles), [userRoles]);

  const load = useCallback(async () => {
    if (!canSeeRecruitment) {
      setLoading(false);
      return;
    }
    setErr(null);
    setLoading(true);
    try {
      const [jobs, applications, interviews, placements] = await Promise.all([
        fetchJobs(),
        fetchApplications(),
        fetchInterviews(),
        fetchPlacements(),
      ]);
      setData({ jobs, applications, interviews, placements });
    } catch (e) {
      setErr(parseError(e));
    } finally {
      setLoading(false);
    }
  }, [canSeeRecruitment]);

  useEffect(() => { load(); }, [load]);

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    data?.applications.forEach(a => {
      counts[a.stage] = (counts[a.stage] ?? 0) + 1;
    });
    return counts;
  }, [data]);

  const topJobs = useMemo<TopItem[]>(() => {
    if (!data) return [];
    const byJob: Record<string, { name: string; count: number }> = {};
    data.applications.forEach(a => {
      const title = a.job?.title ?? a.jobId;
      if (!byJob[a.jobId]) byJob[a.jobId] = { name: title, count: 0 };
      byJob[a.jobId].count += 1;
    });
    return Object.values(byJob)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(j => ({ name: j.name, value: j.count }));
  }, [data]);

  const topClients = useMemo<TopItem[]>(() => {
    if (!data?.placements.length) return [];
    const byClient: Record<string, number> = {};
    data.placements.forEach(p => {
      const name = p.clientName ?? 'Direct';
      byClient[name] = (byClient[name] ?? 0) + 1;
    });
    return Object.entries(byClient)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [data]);

  const openJobs = data?.jobs.filter(j => j.status === 'OPEN').length ?? 0;
  const inPipeline =
    (stageCounts['APPLIED'] ?? 0) +
    (stageCounts['SCREENED'] ?? 0) +
    (stageCounts['SHORTLISTED'] ?? 0) +
    (stageCounts['INTERVIEWED'] ?? 0);
  const totalApps = Object.values(stageCounts).reduce((a, b) => a + b, 0);
  const placements = data?.placements.length ?? 0;
  const scheduled = data?.interviews.filter(i => i.status === 'SCHEDULED').length ?? 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const todayStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const tabs = useMemo(() => {
    const list: { id: DashboardTabId; label: string }[] = [];
    if (canSeeDashboardTab(userRoles, 'company')) list.push({ id: 'company', label: 'Company admin' });
    if (canSeeWorkforce) list.push({ id: 'workforce', label: 'Workforce & HR' });
    if (canSeeRecruitment) list.push({ id: 'recruitment', label: 'Hiring & ATS' });
    if (canSeePayroll) list.push({ id: 'payroll', label: 'Finance & Payroll' });
    if (canSeeClient) list.push({ id: 'client', label: 'Client Operations' });
    if (canSeeEmployee) list.push({ id: 'employee', label: 'My work' });
    return list;
  }, [canSeeWorkforce, canSeeRecruitment, canSeePayroll, canSeeClient, canSeeEmployee]);

  const [selectedTab, setSelectedTab] = useState<DashboardTabId>(roleDefaultTab);

  useEffect(() => {
    setSelectedTab((prev) => {
      if (tabs.some((t) => t.id === prev)) return prev;
      if (tabs.some((t) => t.id === roleDefaultTab)) return roleDefaultTab;
      return tabs[0]?.id ?? prev;
    });
  }, [tabs, roleDefaultTab]);

  return (
    <>
      <div className="dash-welcome">
        <div>
          <p className="dash-welcome__role">{roleLabel} workspace</p>
          <h1 className="dash-welcome__greeting">{greeting}, {displayName}!</h1>
          <p className="dash-welcome__sub">
            {selectedTab === 'company' &&
              'Users, branding, modules, and tenant setup — HR operations use dedicated HR accounts.'}
            {selectedTab === 'workforce' && 'People, payroll health, and performance at a glance.'}
            {selectedTab === 'recruitment' && 'Pipeline, interviews, and hiring progress.'}
            {selectedTab === 'payroll' && 'Payroll runs, payouts, and finance exports.'}
            {selectedTab === 'client' && 'Client outsourcing and billing operations.'}
            {selectedTab === 'employee' && 'Your tasks, leave, payslips, and goals.'}
          </p>
        </div>
        <div className="dash-welcome__date">{todayStr}</div>
      </div>

      {adminHome && (
        <div className="dash-role-banner" style={{ marginBottom: '1rem' }}>
          <div>
            <strong>Company administration</strong>
            <p className="muted small" style={{ margin: '0.25rem 0 0' }}>
              Manage users, branding, and modules here. Executive financial overview (YTD payroll cost, board
              summaries) is only for Managing Director / CEO and CFO accounts.
            </p>
          </div>
          <div className="dash-quick-links">
            <Link to="/platform/users" className="btn btn--ghost btn--sm">
              Team & roles
            </Link>
            <Link to="/platform/settings" className="btn btn--primary btn--sm">
              Company settings
            </Link>
          </div>
        </div>
      )}

      {err && (
        <div className="alert alert--err" role="alert" style={{ marginBottom: '1rem' }}>
          {err}{' '}
          <button type="button" className="btn btn--ghost" style={{ fontSize: '0.8rem', padding: '0 0.5rem' }} onClick={load}>
            Retry
          </button>
        </div>
      )}

      {tabs.length > 0 && (
        <div className="dash-tabs" role="tablist" aria-label="Dashboard views">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selectedTab === tab.id}
              className={`dash-tab ${selectedTab === tab.id ? 'dash-tab--active' : ''}`}
              onClick={() => setSelectedTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {selectedTab === 'company' && adminHome && (
        <p className="muted type-body" style={{ margin: '0 0 1.5rem', maxWidth: '40rem' }}>
          Open <strong>Settings</strong> or <strong>Team</strong> in the sidebar to manage this company. HR
          Dashboard, payroll, recruitment, and leave modules appear only for HR, finance, and staff roles — not
          Company Admin.
        </p>
      )}

      {selectedTab === 'workforce' && <WorkforceDashboard />}

      {selectedTab === 'recruitment' && (
        <RecruitmentDashboard
          data={data}
          loading={loading}
          stageCounts={stageCounts}
          topJobs={topJobs}
          topClients={topClients}
          openJobs={openJobs}
          inPipeline={inPipeline}
          placements={placements}
          scheduled={scheduled}
          totalApps={totalApps}
        />
      )}

      {selectedTab === 'payroll' && <FinanceDashboard />}

      {selectedTab === 'client' && <ClientDashboard />}

      {selectedTab === 'employee' && <EmployeeDashboard me={me} />}
    </>
  );
}

// ── Pending company banner ────────────────────────────────────────────────────

function PendingBanner({ myTenant }: { myTenant: TenantRow }) {
  return (
    <section className="adm-card">
      <h2 className="adm-card__title">Your company</h2>
      <p style={{ margin: '0 0 0.5rem' }}>
        <strong style={{ fontSize: '1.1rem' }}>{myTenant.name}</strong>{' '}
        <StatusBadge status={myTenant.status} />
      </p>
      <p className="muted small" style={{ margin: 0 }}>
        Workspace slug: <code>{myTenant.slug}</code>
        {myTenant.plan ? ` · Plan: ${myTenant.plan}` : null}
      </p>
      {myTenant.status === 'PENDING_ACTIVATION' && (
        <p className="muted" style={{ marginTop: '0.75rem' }}>
          Your registration is under review. Full access unlocks once the platform team approves your company.
        </p>
      )}
      {myTenant.status === 'REJECTED' && (
        <p className="alert alert--err" style={{ marginTop: '0.75rem' }}>
          Registration was not approved.{myTenant.rejectionReason ? ` ${myTenant.rejectionReason}` : null}
        </p>
      )}
      {myTenant.status === 'SUSPENDED' && (
        <p className="alert alert--err" style={{ marginTop: '0.75rem' }}>
          This company account has been suspended. Please contact your administrator or support for details.
        </p>
      )}
      {myTenant.status === 'EXPIRED' && (
        <p className="alert alert--warn" style={{ marginTop: '0.75rem' }}>
          This company's subscription has expired. Please renew to continue using E-Watu.
        </p>
      )}
    </section>
  );
}

// ── Calendar card ─────────────────────────────────────────────────────────────

const WEEKDAY_SHORT = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function CalendarCard() {
  const today = new Date();
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const monthLabel = cursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const dayName = today.toLocaleDateString('en-GB', { weekday: 'long' });

  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday-first grid
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const out: { day: number | null; isToday: boolean }[] = [];
    for (let i = 0; i < startOffset; i++) out.push({ day: null, isToday: false });
    for (let d = 1; d <= daysInMonth; d++) {
      out.push({
        day: d,
        isToday: d === today.getDate() && month === today.getMonth() && year === today.getFullYear(),
      });
    }
    return out;
  }, [cursor, today]);

  return (
    <div className="dash-chart-card dash-calendar-card">
      <div className="dash-calendar-card__today">
        <div className="dash-calendar-card__dayname">{dayName}</div>
        <div className="dash-calendar-card__daynum">{today.getDate()}</div>
        <div className="dash-calendar-card__month">{today.toLocaleDateString('en-GB', { month: 'long' })}</div>
      </div>
      <div className="dash-calendar-card__grid-wrap">
        <div className="dash-calendar-card__nav">
          <button type="button" aria-label="Previous month" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>‹</button>
          <span>{monthLabel}</span>
          <button type="button" aria-label="Next month" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>›</button>
        </div>
        <div className="dash-calendar-card__weekdays">
          {WEEKDAY_SHORT.map((w) => <span key={w}>{w}</span>)}
        </div>
        <div className="dash-calendar-card__days">
          {cells.map((c, i) => (
            <span key={i} className={c.day === null ? 'dash-calendar-card__day--empty' : c.isToday ? 'dash-calendar-card__day--today' : ''}>
              {c.day ?? ''}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Super admin dashboard ─────────────────────────────────────────────────────

function SuperDashboard({
  tenants,
  pending,
  busyId,
  err,
  onApprove,
  onReject,
  onSuspend,
  onReactivate,
  onArchive,
  onPurgePermanent,
  onEditSave,
}: {
  tenants: TenantRow[];
  pending: TenantRow[];
  busyId: string | null;
  err: string | null;
  onApprove: (id: string) => void | Promise<void>;
  onReject: (id: string, reason?: string) => void | Promise<void>;
  onSuspend: (id: string) => void | Promise<void>;
  onReactivate: (id: string) => void | Promise<void>;
  onArchive: (id: string) => void | Promise<void>;
  onPurgePermanent: (id: string, confirmSlug: string) => void | Promise<void>;
  onEditSave: (id: string, body: { name: string; plan: string; country: string }) => void | Promise<void>;
}) {
  const active = tenants.filter(t => t.status === 'ACTIVE').length;
  const rejected = tenants.filter(t => t.status === 'REJECTED').length;
  const todayStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const recentTenants = useMemo(
    () => [...tenants].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
    [tenants],
  );

  return (
    <>
      <div className="dash-welcome">
        <div>
          <h1 className="dash-welcome__greeting">Platform overview</h1>
          <p className="dash-welcome__sub">Manage subscribed companies, approvals, and platform health.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          <div className="dash-welcome__date">{todayStr}</div>
          <Link to="/platform/tenants" className="btn btn--primary small">
            Create tenant
          </Link>
        </div>
      </div>

      {err && <div className="alert alert--err" role="alert" style={{ marginBottom: '1rem' }}>{err}</div>}

      <div className="dash-row-cal">
        <CalendarCard />
        <div className="dash-kpi-grid dash-kpi-grid--2x2">
          <KpiCard label="Total Companies" value={String(tenants.length)} secondary="registered tenants" icon={<IcoBriefcase />} color={CHART.primary} />
          <KpiCard label="Active" value={String(active)} secondary="running workspaces" icon={<IcoAward />} color={CHART.success} />
          <KpiCard label="Pending Approval" value={String(pending.length)} secondary={pending.length > 0 ? 'need review' : 'all clear'} icon={<IcoCalendar />} color={CHART.warning} />
          <KpiCard label="Rejected" value={String(rejected)} secondary="not approved" icon={<IcoUsers />} color={CHART.error} />
        </div>
      </div>

      <div className="dash-chart-card" style={{ marginBottom: '1rem' }}>
        <h3 className="dash-chart-card__title">Recently registered companies</h3>
        {recentTenants.length > 0 ? (
          <ul className="stat-list">
            {recentTenants.map((t) => (
              <li key={t.id} className="stat-item">
                <div>
                  <span className="stat-item__name">{t.name}</span>
                  <div className="stat-item__meta">
                    <code>{t.slug}</code> · registered {new Date(t.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <div className="stat-item__aside">
                  <StatusBadge status={t.status} />
                  <TenantCrudActions
                    tenant={t}
                    busyId={busyId}
                    compact
                    onApprove={onApprove}
                    onReject={onReject}
                    onSuspend={onSuspend}
                    onReactivate={onReactivate}
                    onArchive={onArchive}
                    onPurgePermanent={onPurgePermanent}
                    onEditSave={onEditSave}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small" style={{ margin: 0 }}>No companies registered yet</p>
        )}
      </div>

      {pending.length > 0 && (
        <div className="dash-chart-card" style={{ marginBottom: '1rem' }}>
          <h3 className="dash-chart-card__title">Needs your attention</h3>
          <div className="adm-pending-list">
            {pending.slice(0, 5).map((t) => (
              <div key={t.id} className="adm-pending-row">
                <div>
                  <strong>{t.name}</strong>
                  <div className="muted small">
                    <code>{t.slug}</code>
                    {t.businessEmail ? ` · ${t.businessEmail}` : null}
                    {t.emailVerifiedAt ? ' · email verified' : ' · email not verified'}
                  </div>
                </div>
                <div className="stat-item__aside">
                  <StatusBadge status={t.status} />
                  <TenantCrudActions
                    tenant={t}
                    busyId={busyId}
                    compact
                    onApprove={onApprove}
                    onReject={onReject}
                    onSuspend={onSuspend}
                    onReactivate={onReactivate}
                    onArchive={onArchive}
                    onPurgePermanent={onPurgePermanent}
                    onEditSave={onEditSave}
                  />
                </div>
              </div>
            ))}
          </div>
          {pending.length > 5 && (
            <p className="muted small" style={{ marginTop: '0.75rem' }}>
              <Link to="/platform/tenants">View all {pending.length} pending →</Link>
            </p>
          )}
        </div>
      )}

      <div className="dash-row-2">
        <div className="dash-chart-card">
          <h3 className="dash-chart-card__title">Tenant status</h3>
          <DonutChart
            segments={[
              { label: 'Active',  count: active,          color: CHART.success },
              { label: 'Pending', count: pending.length,  color: CHART.warning },
              { label: 'Rejected',count: rejected,        color: CHART.error },
              { label: 'Other',   count: Math.max(0, tenants.length - active - pending.length - rejected), color: 'var(--color-neutral-200)' },
            ].filter(s => s.count > 0)}
          />
        </div>
        <div className="dash-chart-card">
          <h3 className="dash-chart-card__title">Quick links</h3>
          <div className="adm-modules">
            <Link to="/platform/tenants" className="adm-module">
              <span className="adm-module__icon">⌂</span>
              <span className="adm-module__name">Tenant directory</span>
              <span className="adm-module__desc">Approve, reject, or create companies</span>
            </Link>
            <Link to="/platform/system" className="adm-module">
              <span className="adm-module__icon">⚙</span>
              <span className="adm-module__name">System health</span>
              <span className="adm-module__desc">Service status and connectivity</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function AdminOverviewPage() {
  const { me, isSuper } = useAdminContext();

  const [tenants, setTenants] = useState<TenantRow[] | null>(null);
  const [pending, setPending] = useState<TenantRow[] | null>(null);
  const [myTenant, setMyTenant] = useState<TenantRow | null | undefined>(undefined);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      if (isSuper) {
        const [all, pend] = await Promise.all([fetchTenants(), fetchPendingTenants()]);
        setTenants(all);
        setPending(pend);
        setMyTenant(undefined);
      } else {
        const t = me.tenant_id ? await fetchMyTenant() : null;
        setMyTenant(t);
        setTenants(null);
        setPending(null);
      }
    } catch (e) {
      setErr(parseError(e));
    } finally {
      setLoading(false);
    }
  }, [isSuper, me.tenant_id]);

  useEffect(() => { load(); }, [load]);

  const withTenantAction = async (id: string, action: () => Promise<void>, successMessage?: string) => {
    setBusyId(id);
    setErr(null);
    try {
      await action();
      await load();
      if (successMessage) toast.success(successMessage);
    } catch (e) {
      const message = parseError(e);
      setErr(message);
      toast.error(message);
    } finally {
      setBusyId(null);
    }
  };

  const tenantName = (id: string) => tenants?.find((row) => row.id === id)?.name ?? 'Company';

  const onApprove = (id: string) =>
    withTenantAction(id, () => approveTenant(id), `${tenantName(id)} approved`);
  const onReject = (id: string, reason?: string) =>
    withTenantAction(id, () => rejectTenant(id, reason), `${tenantName(id)} rejected`);
  const onSuspend = (id: string) =>
    withTenantAction(id, () => suspendTenant(id), `${tenantName(id)} suspended`);
  const onReactivate = (id: string) =>
    withTenantAction(id, () => reactivateTenant(id), `${tenantName(id)} activated`);
  const onArchive = (id: string) =>
    withTenantAction(id, () => archiveTenant(id), `${tenantName(id)} archived`);
  const onPurgePermanent = (id: string, confirmSlug: string) =>
    withTenantAction(id, () => purgeTenantPermanent(id, confirmSlug), `${confirmSlug} permanently deleted`);
  const onEditSave = (id: string, body: { name: string; plan: string; country: string }) =>
    withTenantAction(id, () => updateTenant(id, body), `${body.name} updated`);

  const displayName = me.username ?? me.email?.split('@')[0] ?? 'there';

  if (loading) {
    return (
      <div className="adm-page">
        <p className="muted">Loading workspace…</p>
      </div>
    );
  }

  return (
    <div className="adm-page">
      {err && (
        <div className="alert alert--err" role="alert" style={{ marginBottom: '1rem' }}>
          {err}{' '}
          <button type="button" className="btn btn--ghost" style={{ fontSize: '0.8rem', padding: '0 0.5rem' }} onClick={load}>
            Retry
          </button>
        </div>
      )}

      {isSuper && tenants && pending && (
        <SuperDashboard
          tenants={tenants}
          pending={pending}
          busyId={busyId}
          err={null}
          onApprove={onApprove}
          onReject={onReject}
          onSuspend={onSuspend}
          onReactivate={onReactivate}
          onArchive={onArchive}
          onPurgePermanent={onPurgePermanent}
          onEditSave={onEditSave}
        />
      )}

      {!isSuper && myTenant !== undefined && (
        myTenant?.status === 'ACTIVE' ? (
          <CompanyDashboard displayName={displayName} />
        ) : myTenant ? (
          <PendingBanner myTenant={myTenant} />
        ) : (
          !err && <p className="muted">No company is linked to this account.</p>
        )
      )}
    </div>
  );
}
