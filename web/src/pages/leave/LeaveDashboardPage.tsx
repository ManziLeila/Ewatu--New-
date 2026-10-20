import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchMe } from '../../api';
import { parseApiError } from '../../lib/parseApiError';
import {
  fetchMyEmployee,
  fetchLeaveBalances,
  fetchLeaveRequests,
  fetchHolidays,
  fetchTeamOut,
  approveLeaveRequest,
  rejectLeaveRequest,
  type LeaveBalance,
  type LeaveRequest,
  type Holiday,
  type TeamOutRequest,
} from '../../payrollApi';
import { fetchNotifications, markNotificationRead, type Notification } from '../../notificationApi';
import { CHART, CSS_VAR } from '../../lib/brand';

const TYPE_COLORS: Record<string, string> = {
  ANNUAL: CHART.info,
  SICK: CHART.success,
  MATERNITY: CHART.warning,
  PATERNITY: CHART.primary,
  COMPASSIONATE: CHART.info,
  STUDY: CHART.secondary,
  UNPAID: CSS_VAR.textMuted,
};

function colorFor(code: string | undefined, index: number): string {
  if (code && TYPE_COLORS[code]) return TYPE_COLORS[code];
  const palette = [CHART.primary, CHART.success, CHART.warning, CHART.secondary, CHART.info, CHART.error];
  return palette[index % palette.length];
}

function ProgressRing({ pct, color, size = 56 }: { pct: number; color: string; size?: number }) {
  const r = size / 2 - 5;
  const cx = size / 2;
  const cy = size / 2;
  const C = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-neutral-200)" strokeWidth="6" />
      <g transform={`rotate(-90 ${cx} ${cy})`}>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${(clamped / 100) * C} ${C}`}
        />
      </g>
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--ink, #0f172a)">
        {Math.round(clamped)}%
      </text>
    </svg>
  );
}

function BalanceDonut({ balances }: { balances: LeaveBalance[] }) {
  const segments = balances
    .filter((b) => b.leaveType?.code !== 'UNPAID')
    .map((b, i) => ({
      label: b.leaveType?.name ?? 'Leave',
      remaining: Math.max(0, Number(b.allocatedDays) - Number(b.usedDays)),
      allocated: Number(b.allocatedDays),
      color: colorFor(b.leaveType?.code, i),
    }));

  const total = segments.reduce((s, seg) => s + seg.remaining, 0);
  const r = 52;
  const cx = 70;
  const cy = 70;
  const C = 2 * Math.PI * r;
  const GAP = 3;

  let cumulative = 0;
  const arcs = segments.map((seg) => {
    const rawLen = total ? (seg.remaining / total) * C : 0;
    const len = Math.max(0, rawLen - GAP);
    const arc = { ...seg, len, offset: cumulative };
    cumulative += rawLen;
    return arc;
  });

  return (
    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
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
          days left
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: 180 }}>
        {segments.length === 0 && <p className="muted small">No leave balances yet</p>}
        {segments.map((seg, i) => {
          const pct = seg.allocated > 0 ? Math.round((seg.remaining / seg.allocated) * 100) : 0;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: seg.color, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{seg.label}</span>
              <span className="muted">{seg.remaining} / {seg.allocated} days</span>
              <span style={{ fontWeight: 600, minWidth: 40, textAlign: 'right' }}>{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BalanceRingCard({ balance }: { balance: LeaveBalance }) {
  const allocated = Number(balance.allocatedDays);
  const used = Number(balance.usedDays);
  const remaining = Math.max(0, allocated - used);
  const pct = allocated > 0 ? (remaining / allocated) * 100 : 0;
  const color = colorFor(balance.leaveType?.code, 0);
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
      <ProgressRing pct={pct} color={color} />
      <div>
        <div className="muted" style={{ fontSize: '0.78rem', fontWeight: 600 }}>{balance.leaveType?.name ?? 'Leave'}</div>
        <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{remaining} days</div>
        <div className="muted" style={{ fontSize: '0.72rem' }}>of {allocated} allocated</div>
      </div>
    </div>
  );
}

function StatCard({ label, value, secondary, color }: { label: string; value: string; secondary: string; color: string }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <div className="muted" style={{ fontSize: '0.8rem', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: '1.6rem', fontWeight: 700, color }}>{value}</div>
      <div className="muted" style={{ fontSize: '0.75rem' }}>{secondary}</div>
    </div>
  );
}

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday as start
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function LeaveDashboardPage() {
  const [firstName, setFirstName] = useState('');
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [teamOut, setTeamOut] = useState<TeamOutRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decisionComments, setDecisionComments] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const me = await fetchMe();
        const matchedEmp = await fetchMyEmployee();
        setFirstName(matchedEmp?.firstName ?? me.username ?? me.email?.split('@')[0] ?? 'there');

        const empId = matchedEmp?.id;
        const today = new Date();
        const start = startOfWeek(today);
        const end = new Date(start);
        end.setDate(start.getDate() + 13); // this week + next week

        const [reqs, bals, hols, out, notes, toApprove] = await Promise.all([
          fetchLeaveRequests(undefined, empId),
          empId ? fetchLeaveBalances(empId) : Promise.resolve([]),
          fetchHolidays().catch(() => []),
          fetchTeamOut(start.toISOString(), end.toISOString()).catch(() => []),
          fetchNotifications().catch(() => []),
          fetchLeaveRequests('PENDING', undefined).catch(() => []),
        ]);
        setRequests(reqs);
        setBalances(bals);
        setHolidays(hols);
        setTeamOut(out);
        setNotifications(notes);
        // Requests server-scoped to teams the caller leads — empty for anyone who isn't a lead.
        setPendingApprovals(toApprove.filter((r) => r.employeeId !== empId));
      } catch (err) {
        setError(parseApiError(err).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    } catch {
      // Non-fatal — the notification stays unread if this fails.
    }
  };

  const handleDecision = async (id: string, decision: 'approve' | 'reject') => {
    try {
      const note = decisionComments[id];
      if (decision === 'approve') await approveLeaveRequest(id, note);
      else await rejectLeaveRequest(id, note);
      setPendingApprovals((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert(parseApiError(err).message);
    }
  };

  if (loading) {
    return (
      <div className="rec-page" style={{ textAlign: 'center', padding: '3rem' }}>
        <p className="muted">Loading your leave dashboard…</p>
      </div>
    );
  }

  const currentYear = new Date().getFullYear();
  const pending = requests.filter((r) => r.status === 'PENDING');
  const approvedThisYear = requests.filter(
    (r) => r.status === 'APPROVED' && new Date(r.startDate).getFullYear() === currentYear,
  );
  const totalDaysTaken = approvedThisYear.reduce((sum, r) => sum + Number(r.numberOfDays), 0);
  const entitledTotal = balances
    .filter((b) => b.leaveType?.code !== 'UNPAID')
    .reduce((sum, b) => sum + Number(b.allocatedDays), 0);

  const ringBalances = [...balances]
    .filter((b) => b.leaveType)
    .sort((a, b) => {
      const order = ['ANNUAL', 'SICK', 'COMPASSIONATE', 'UNPAID'];
      const ai = order.indexOf(a.leaveType!.code);
      const bi = order.indexOf(b.leaveType!.code);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    })
    .slice(0, 4);

  const recentRequests = [...requests]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const nextHoliday = holidays[0];
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="rec-page">
      {error && <div className="alert alert--err">{error}</div>}

      {/* Welcome banner + prominent Apply CTA */}
      <div
        style={{
          borderRadius: 'var(--radius, 12px)',
          padding: '1.75rem 2rem',
          marginBottom: '1.5rem',
          background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
          color: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Welcome back, {firstName}!</h1>
          <p style={{ opacity: 0.9, margin: '0.4rem 0 0', fontSize: '0.9rem' }}>
            Manage your leave requests, check your balances, and track your leave history.
          </p>
        </div>
        <Link to="/leave/apply" className="btn" style={{ background: 'var(--color-surface-light)', color: 'var(--color-primary)', border: '1px solid var(--color-surface-light)', whiteSpace: 'nowrap' }}>
          + Apply for Leave
        </Link>
      </div>

      {/* Row 1: balance-by-type rings */}
      <div className="rec-stats-grid" style={{ marginBottom: '1rem' }}>
        {ringBalances.map((b) => (
          <BalanceRingCard key={b.id} balance={b} />
        ))}
      </div>

      {/* Row 2: summary stat cards */}
      <div className="rec-stats-grid" style={{ marginBottom: '1.5rem' }}>
        <StatCard
          label="Days Used This Year"
          value={`${totalDaysTaken} / ${entitledTotal}`}
          secondary={`${currentYear} entitlement`}
          color={CHART.info}
        />
        <StatCard
          label="Pending Requests"
          value={String(pending.length)}
          secondary="awaiting approval"
          color={CHART.warning}
        />
        <StatCard
          label="Next Public Holiday"
          value={nextHoliday ? nextHoliday.name : '—'}
          secondary={nextHoliday ? new Date(nextHoliday.nextDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : 'none configured'}
          color={CHART.primary}
        />
        <StatCard
          label="Team Out (2 weeks)"
          value={String(teamOut.length)}
          secondary={teamOut.length ? 'teammates on leave' : 'nobody on leave'}
          color={CHART.success}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Recent requests */}
        <section className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>My Leave Requests</h2>
            <Link to="/leave/requests" className="btn btn--ghost small">View All →</Link>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Leave Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Days</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="muted" style={{ textAlign: 'center', padding: '1.5rem' }}>
                      No leave requests yet.
                    </td>
                  </tr>
                ) : (
                  recentRequests.map((r, i) => (
                    <tr key={r.id}>
                      <td>{i + 1}</td>
                      <td>{r.leaveType?.name}</td>
                      <td>{new Date(r.startDate).toLocaleDateString()}</td>
                      <td>{new Date(r.endDate).toLocaleDateString()}</td>
                      <td>{r.numberOfDays}</td>
                      <td>
                        <span className={`badge ${
                          r.status === 'APPROVED' ? 'badge--green' : r.status === 'REJECTED' ? 'badge--red' : 'badge--orange'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Balance donut */}
        <section className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Leave Balance Overview</h2>
            <Link to="/leave/balance" className="btn btn--ghost small">View Details →</Link>
          </div>
          <BalanceDonut balances={balances} />
        </section>
      </div>

      {pendingApprovals.length > 0 && (
        <section className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 1rem' }}>
            Requests Awaiting My Approval <span className="badge badge--orange">{pendingApprovals.length}</span>
          </h2>
          <p className="muted small" style={{ marginTop: '-0.6rem', marginBottom: '1rem' }}>
            Leave requests from people on a team you lead.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {pendingApprovals.map((r) => (
              <div key={r.id} style={{ background: 'rgba(148, 163, 184, 0.08)', padding: '1rem', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div>
                    <strong>{r.employee?.firstName} {r.employee?.lastName}</strong>
                    <span className="muted"> — {r.leaveType?.name}</span>
                  </div>
                  <span className="muted">
                    {new Date(r.startDate).toLocaleDateString()} – {new Date(r.endDate).toLocaleDateString()} ({r.numberOfDays} days)
                  </span>
                </div>
                {r.reason && <p className="muted small" style={{ marginBottom: '0.6rem' }}>{r.reason}</p>}
                <input
                  className="auth-input"
                  placeholder="Comment (optional)"
                  style={{ marginBottom: '0.6rem' }}
                  value={decisionComments[r.id] || ''}
                  onChange={(e) => setDecisionComments({ ...decisionComments, [r.id]: e.target.value })}
                />
                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <button type="button" className="btn btn--success small" onClick={() => handleDecision(r.id, 'approve')}>
                    Approve
                  </button>
                  <button type="button" className="btn btn--danger small" onClick={() => handleDecision(r.id, 'reject')}>
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Who's out */}
        <section className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Who's Out — Your Team</h2>
            <Link to="/leave/calendar" className="btn btn--ghost small">Calendar →</Link>
          </div>
          {teamOut.length === 0 ? (
            <p className="muted small">
              Nobody on your team is on leave in the next two weeks — or you're not yet on a team
              (ask an admin to add you under Departments).
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {teamOut.map((r) => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>{r.employee.firstName} {r.employee.lastName} <span className="muted">— {r.leaveType?.name}</span></span>
                  <span className="muted">
                    {new Date(r.startDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                    {' – '}
                    {new Date(r.endDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Notifications feed */}
        <section className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
              Notifications {unreadCount > 0 && <span className="badge badge--orange">{unreadCount} new</span>}
            </h2>
          </div>
          {notifications.length === 0 ? (
            <p className="muted small">No notifications yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 220, overflowY: 'auto' }}>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.readAt && handleMarkRead(n.id)}
                  style={{
                    fontSize: '0.85rem',
                    padding: '0.5rem 0.6rem',
                    borderRadius: 6,
                    background: n.readAt ? 'transparent' : 'rgba(37, 99, 235, 0.08)',
                    cursor: n.readAt ? 'default' : 'pointer',
                  }}
                >
                  <div style={{ fontWeight: n.readAt ? 400 : 600 }}>{n.title}</div>
                  <div className="muted" style={{ fontSize: '0.78rem' }}>{n.body}</div>
                  <div className="muted" style={{ fontSize: '0.7rem', marginTop: '0.15rem' }}>
                    {new Date(n.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Public holidays */}
        <section className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Upcoming Holidays</h2>
            <Link to="/leave/holidays" className="btn btn--ghost small">View Calendar →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {holidays.length === 0 ? (
              <p className="muted small">No holidays configured.</p>
            ) : (
              holidays.slice(0, 3).map((h) => (
                <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span>{h.name}</span>
                  <span className="muted">{new Date(h.nextDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Leave policy */}
        <section className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '2rem' }}>📘</div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 0.35rem' }}>Leave Policy & Guidelines</h2>
            <p className="muted" style={{ fontSize: '0.85rem', margin: '0 0 0.75rem' }}>
              Review entitlements and rules before submitting a request.
            </p>
            <Link to="/leave/policy" className="btn btn--primary small">View Leave Policy</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
