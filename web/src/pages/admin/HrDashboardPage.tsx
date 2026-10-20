import { useCallback, useEffect, useState } from 'react';
import { fetchHrDashboardSummary, type HrDashboardSummary } from '../../payrollApi';
import { fetchJobs, fetchApplications, type Job, type Application } from '../../recruitmentApi';
import { CHART } from '../../lib/brand';
import { parseApiError } from '../../lib/parseApiError';
import './dashboard.css';

function Dot({ color }: { color: string }) {
  return <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: color }} />;
}

function KpiCard({ label, value, secondary, color }: { label: string; value: string; secondary: string; color: string }) {
  return (
    <div className="dash-kpi">
      <div className="dash-kpi__icon-wrap" style={{ background: `${color}1a`, color }}>
        <Dot color={color} />
      </div>
      <div className="dash-kpi__body">
        <div className="dash-kpi__label">{label}</div>
        <div className="dash-kpi__value">{value}</div>
        <div className="dash-kpi__secondary">{secondary}</div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="adm-card" style={{ marginBottom: '1.25rem' }}>
      <h3 style={{ margin: '0 0 0.75rem' }}>{title}</h3>
      {children}
    </div>
  );
}

const STAGES: { stage: string; label: string }[] = [
  { stage: 'APPLIED', label: 'Applied' },
  { stage: 'SCREENED', label: 'Screened' },
  { stage: 'SHORTLISTED', label: 'Shortlisted' },
  { stage: 'INTERVIEWED', label: 'Interviewed' },
  { stage: 'OFFERED', label: 'Offered' },
  { stage: 'PLACED', label: 'Placed' },
];

export function HrDashboardPage() {
  const [summary, setSummary] = useState<HrDashboardSummary | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [s, j, a] = await Promise.all([
        fetchHrDashboardSummary(),
        fetchJobs().catch(() => []),
        fetchApplications().catch(() => []),
      ]);
      setSummary(s);
      setJobs(j);
      setApplications(a);
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
    return (
      <div className="adm-page">
        <p className="muted">Loading HR dashboard…</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="adm-page">
        <div className="alert alert--err">{error ?? 'Could not load the HR dashboard.'}</div>
      </div>
    );
  }

  const openJobs = jobs.filter((j) => j.status === 'OPEN' || j.status === 'IN_PROGRESS').length;
  const stageCounts: Record<string, number> = {};
  applications.forEach((a) => {
    stageCounts[a.stage] = (stageCounts[a.stage] ?? 0) + 1;
  });

  const { headcount, leave, payroll, lifecycleAlerts, performance, turnover, disciplinary, attendance, training, grievances } = summary;
  const avgTrainingCompletion =
    training.length > 0 ? Math.round(training.reduce((sum, t) => sum + t.completionPct, 0) / training.length) : null;

  return (
    <div className="adm-page">
      <header className="adm-page__head">
        <h1 className="adm-page__title">HR Dashboard</h1>
        <p className="adm-page__lead">Workforce overview and people-management tools.</p>
      </header>

      <div className="dash-row-2" style={{ marginBottom: '1.25rem' }}>
        <KpiCard label="Headcount" value={String(headcount.total)} secondary="active employees" color={CHART.primary} />
        <KpiCard label="Pending Leave Approvals" value={String(leave.pendingApprovals)} secondary="awaiting a decision" color={CHART.warning} />
        <KpiCard
          label="Payroll Exceptions"
          value={String(payroll.exceptionsCount)}
          secondary={`${payroll.inProgressPeriods.length} cycle(s) in progress`}
          color={payroll.exceptionsCount > 0 ? CHART.error : CHART.success}
        />
        <KpiCard label="Turnover (12mo)" value={`${turnover.ratePct}%`} secondary={`${turnover.terminatedLast12Months} exits`} color={CHART.info} />
      </div>

      <div className="dash-row-2" style={{ marginBottom: '1.25rem' }}>
        <KpiCard
          label="Open Grievances"
          value={String(grievances.openCount + grievances.investigatingCount)}
          secondary={`${grievances.openCount} open, ${grievances.investigatingCount} investigating`}
          color={grievances.openCount > 0 ? CHART.error : CHART.success}
        />
        <KpiCard
          label="Attendance On-Time Rate"
          value={attendance.onTimeRatePct === null ? '—' : `${attendance.onTimeRatePct}%`}
          secondary={`${attendance.lateCount30d} late, ${attendance.absentCount30d} absent (30d)`}
          color={CHART.primary}
        />
        <KpiCard
          label="Training Compliance"
          value={avgTrainingCompletion === null ? '—' : `${avgTrainingCompletion}%`}
          secondary={`${training.length} mandatory course(s)`}
          color={CHART.success}
        />
        <KpiCard
          label="Probation Ending Soon"
          value={String(lifecycleAlerts.probationsEndingSoon.length)}
          secondary="next 90 days"
          color={CHART.warning}
        />
      </div>

      <div className="dash-row-2">
        <Section title="Headcount by Department">
          {headcount.byDepartment.length === 0 ? (
            <p className="muted">No employee data yet.</p>
          ) : (
            <table className="table">
              <tbody>
                {headcount.byDepartment.map((d) => (
                  <tr key={d.department}>
                    <td>{d.department}</td>
                    <td style={{ textAlign: 'right' }}>{d.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="Headcount by Type">
          {headcount.byType.length === 0 ? (
            <p className="muted">No employee data yet.</p>
          ) : (
            <table className="table">
              <tbody>
                {headcount.byType.map((t) => (
                  <tr key={t.type}>
                    <td>{t.type}</td>
                    <td style={{ textAlign: 'right' }}>{t.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="Headcount by Location">
          {headcount.byLocation.length === 0 ? (
            <p className="muted">No employee data yet.</p>
          ) : (
            <table className="table">
              <tbody>
                {headcount.byLocation.map((l) => (
                  <tr key={l.location}>
                    <td>{l.location}</td>
                    <td style={{ textAlign: 'right' }}>{l.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      </div>

      <Section title="Recruitment Pipeline">
        <div className="dash-row-2" style={{ marginBottom: '0.75rem' }}>
          <div>Open roles: <strong>{openJobs}</strong></div>
          <div>Total applications: <strong>{applications.length}</strong></div>
        </div>
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
          {STAGES.map((s) => (
            <div key={s.stage}>
              <div className="muted small">{s.label}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{stageCounts[s.stage] ?? 0}</div>
            </div>
          ))}
        </div>
      </Section>

      <div className="dash-row-2">
        <Section title="Leave Management">
          <table className="table">
            <tbody>
              <tr><td>Pending approvals</td><td style={{ textAlign: 'right' }}>{leave.pendingApprovals}</td></tr>
              <tr><td>Approved this month</td><td style={{ textAlign: 'right' }}>{leave.approvedThisMonth}</td></tr>
              <tr><td>Rejected this month</td><td style={{ textAlign: 'right' }}>{leave.rejectedThisMonth}</td></tr>
            </tbody>
          </table>
        </Section>

        <Section title="Disciplinary Cases">
          <table className="table">
            <tbody>
              <tr><td>Active PIPs</td><td style={{ textAlign: 'right' }}>{disciplinary.activeCount}</td></tr>
              <tr><td>Escalated</td><td style={{ textAlign: 'right' }}>{disciplinary.escalatedCount}</td></tr>
            </tbody>
          </table>
        </Section>
      </div>

      <Section title="Payroll Cycle Status">
        {payroll.inProgressPeriods.length === 0 ? (
          <p className="muted">No payroll cycles in progress.</p>
        ) : (
          <table className="table" style={{ marginBottom: payroll.exceptions.length > 0 ? '1rem' : 0 }}>
            <thead>
              <tr><th>Period</th><th>Status</th><th style={{ textAlign: 'right' }}>Records</th></tr>
            </thead>
            <tbody>
              {payroll.inProgressPeriods.map((p) => (
                <tr key={p.id}>
                  <td>{p.periodMonth}/{p.periodYear}</td>
                  <td><span className="badge badge--neutral">{p.status.replace(/_/g, ' ')}</span></td>
                  <td style={{ textAlign: 'right' }}>{p.recordCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {payroll.exceptions.length > 0 && (
          <>
            <h4 style={{ margin: '0.5rem 0' }}>Exceptions</h4>
            <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
              {payroll.exceptions.map((e, i) => (
                <li key={i}>{e.employeeName} — {e.issue}</li>
              ))}
            </ul>
          </>
        )}
      </Section>

      <Section title="Lifecycle Alerts (next 90 days)">
        <div className="dash-row-2">
          <div>
            <h4 style={{ margin: '0 0 0.5rem' }}>Contracts Expiring</h4>
            {lifecycleAlerts.contractsExpiringSoon.length === 0 ? (
              <p className="muted small">None.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {lifecycleAlerts.contractsExpiringSoon.map((c) => (
                  <li key={c.id}>{c.employeeName} — {new Date(c.endDate).toLocaleDateString()}</li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h4 style={{ margin: '0 0 0.5rem' }}>Permits Expiring</h4>
            {lifecycleAlerts.permitsExpiringSoon.length === 0 ? (
              <p className="muted small">None.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {lifecycleAlerts.permitsExpiringSoon.map((p) => (
                  <li key={p.id}>{p.employeeName} — {p.permitType} — {new Date(p.expiryDate).toLocaleDateString()}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="dash-row-2" style={{ marginTop: '1rem', marginBottom: 0 }}>
          <div>
            <h4 style={{ margin: '0 0 0.5rem' }}>Probation Ending</h4>
            {lifecycleAlerts.probationsEndingSoon.length === 0 ? (
              <p className="muted small">None.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {lifecycleAlerts.probationsEndingSoon.map((p) => (
                  <li key={p.employeeId}>{p.employeeName} — {new Date(p.probationEndDate).toLocaleDateString()}</li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h4 style={{ margin: '0 0 0.5rem' }}>Documents Expiring (licenses, certs)</h4>
            {lifecycleAlerts.documentsExpiringSoon.length === 0 ? (
              <p className="muted small">None.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {lifecycleAlerts.documentsExpiringSoon.map((d) => (
                  <li key={d.id}>{d.employeeName} — {d.documentName} — {new Date(d.expiryDate).toLocaleDateString()}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Section>

      <Section title="Performance Review Cycle">
        {performance === null ? (
          <p className="muted">No active review cycle.</p>
        ) : (
          <table className="table">
            <tbody>
              <tr><td>Cycle</td><td style={{ textAlign: 'right' }}>{performance.cycleName}</td></tr>
              <tr><td>Completion</td><td style={{ textAlign: 'right' }}>{performance.completionPct}% ({performance.completedCount}/{performance.totalEmployees})</td></tr>
              {performance.overdueCount > 0 && (
                <tr><td>Overdue</td><td style={{ textAlign: 'right', color: '#ef4444' }}>{performance.overdueCount}</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Training Compliance">
        {training.length === 0 ? (
          <p className="muted">No mandatory training courses yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Course</th><th style={{ textAlign: 'right' }}>Completion</th><th style={{ textAlign: 'right' }}>Overdue</th></tr>
            </thead>
            <tbody>
              {training.map((t) => (
                <tr key={t.courseId}>
                  <td>{t.courseName}</td>
                  <td style={{ textAlign: 'right' }}>{t.completionPct}% ({t.completedCount}/{t.totalAssigned})</td>
                  <td style={{ textAlign: 'right', color: t.overdueCount > 0 ? '#ef4444' : undefined }}>{t.overdueCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}
