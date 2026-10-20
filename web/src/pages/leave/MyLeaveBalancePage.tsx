import { useEffect, useState } from 'react';
import { parseApiError } from '../../lib/parseApiError';
import { fetchMyEmployee, fetchLeaveBalances, type LeaveBalance } from '../../payrollApi';

export function MyLeaveBalancePage() {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noRecord, setNoRecord] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        setNoRecord(false);
        const me = await fetchMyEmployee();
        if (me) {
          setBalances(await fetchLeaveBalances(me.id));
        } else {
          setNoRecord(true);
        }
      } catch (err) {
        setError(parseApiError(err).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="rec-page" style={{ textAlign: 'center', padding: '3rem' }}>
        <p className="muted">Loading your leave balances…</p>
      </div>
    );
  }

  return (
    <div className="rec-page">
      <div className="rec-page__header">
        <div>
          <h1 className="rec-page__title">My Leave Balance</h1>
          <p className="muted">Your leave allocations and usage for {new Date().getFullYear()}.</p>
        </div>
      </div>

      {error && <div className="alert alert--err">{error}</div>}
      {noRecord && !error && (
        <div className="alert alert--warn">No employee record is linked to your account yet — ask HR to link your profile.</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
        {balances.length === 0 ? (
          <div className="rec-empty" style={{ gridColumn: '1/-1' }}>
            No leave balances initialized yet. Submit a leave request to initialize your balance.
          </div>
        ) : (
          balances.map((b) => {
            const isUnpaid = b.leaveType?.code === 'UNPAID';
            const remaining = Number(b.allocatedDays) - Number(b.usedDays);
            const pct = !isUnpaid && Number(b.allocatedDays) > 0
              ? Math.round((remaining / Number(b.allocatedDays)) * 100)
              : null;
            return (
              <div className="card" key={b.id} style={{ borderLeft: `4px solid var(--accent, #0284c7)` }}>
                <div className="muted" style={{ fontSize: '0.85rem', fontWeight: 600 }}>{b.leaveType?.name}</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '0.4rem 0' }}>
                  {isUnpaid ? 'Unlimited' : remaining}{' '}
                  {!isUnpaid && <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: 'var(--ink-muted)' }}>days left</span>}
                </div>
                {!isUnpaid && (
                  <>
                    <div className="muted" style={{ fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                      Allocated: {b.allocatedDays} | Used: {b.usedDays}
                    </div>
                    <div style={{ height: 6, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent, #0284c7)' }} />
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
