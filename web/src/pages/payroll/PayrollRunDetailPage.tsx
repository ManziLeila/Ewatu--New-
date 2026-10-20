import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchMe } from '../../api';
import {
  approvePayrollStage,
  emailPayslips,
  fetchPayrollRun,
  lockPayrollRun,
  recalculatePayrollRun,
  rejectPayrollStage,
  submitPayrollRun,
  updatePayrollLine,
  type PayrollLine,
  type PayrollRun,
} from '../../payrollApi';
import { parseApiError } from '../../lib/parseApiError';
import {
  PAYROLL_STAGE_ORDER,
  canApprovePayrollRun,
  canFinalizePayrollRun,
  canRejectPayrollRun,
  canSubmitPayrollRun,
  pendingActorLabel,
  stageLabelForStatus,
} from '../../lib/payrollApproval';

export function PayrollRunDetailPage() {
  const { runId } = useParams<{ runId: string }>();
  const [run, setRun] = useState<PayrollRun | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editGross, setEditGross] = useState('');
  const [editDeductions, setEditDeductions] = useState('');

  const load = useCallback(async () => {
    if (!runId) return;
    setLoading(true);
    setErr(null);
    try {
      setRun(await fetchPayrollRun(runId));
    } catch (e) {
      setErr(parseApiError(e).message);
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetchMe()
      .then((me) => setRoles(me.roles))
      .catch(() => setRoles([]));
  }, []);

  const act = async (fn: () => Promise<PayrollRun>) => {
    setBusy(true);
    setErr(null);
    try {
      setRun(await fn());
    } catch (e) {
      setErr(parseApiError(e).message);
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (line: PayrollLine) => {
    setEditingLineId(line.id);
    setEditGross(line.grossPay);
    setEditDeductions(line.totalDeductions);
  };

  const saveLine = async () => {
    if (!run || !editingLineId) return;
    await act(() =>
      updatePayrollLine(run.id, editingLineId, {
        grossPay: Number(editGross),
        totalDeductions: Number(editDeductions),
      }),
    );
    setEditingLineId(null);
  };

  if (loading) return <div className="rec-page"><p className="muted">Loading run…</p></div>;
  if (!run) return <div className="rec-page"><p className="alert alert--err">{err ?? 'Run not found'}</p></div>;

  const editable = run.status === 'DRAFT';
  const showApprove = canApprovePayrollRun(roles, run.status);
  const showReject = canRejectPayrollRun(roles, run.status);
  const showSubmit = canSubmitPayrollRun(roles, run.status);
  const showFinalize = canFinalizePayrollRun(roles, run.status, run.clientId);

  const promptComment = (action: 'approve' | 'reject') => {
    const note = window.prompt(
      action === 'approve' ? 'Approval comment (optional):' : 'Rejection reason (recommended):',
      '',
    );
    return note ?? '';
  };

  return (
    <div className="rec-page">
      <div className="rec-page__header">
        <div>
          <p className="muted small"><Link to="/payroll/runs">Runs</Link> / {run.periodYear}-{String(run.periodMonth).padStart(2, '0')}</p>
          <h1 className="rec-page__title">Payroll run</h1>
          <p className="rec-page__sub">
            {stageLabelForStatus(run.status)}
            {run.status !== 'FINALIZED' && (
              <> · Next: {pendingActorLabel(run.status, run.clientId)}</>
            )}
          </p>
        </div>
        <div className="rec-page__actions">
          {editable && (
            <button className="btn btn--ghost" disabled={busy} onClick={() => act(() => recalculatePayrollRun(run.id))}>
              Recalculate
            </button>
          )}
          {showSubmit && (
            <button className="btn btn--primary" disabled={busy} onClick={() => act(() => submitPayrollRun(run.id))}>
              Submit to HR
            </button>
          )}
          {showApprove && (
            <button
              className="btn btn--primary"
              disabled={busy}
              onClick={() => {
                const note = promptComment('approve');
                act(() => approvePayrollStage(run.id, run.status, note));
              }}
            >
              Approve
            </button>
          )}
          {showReject && (
            <button
              className="btn btn--ghost"
              disabled={busy}
              onClick={() => {
                const note = promptComment('reject');
                act(() => rejectPayrollStage(run.id, run.status, note));
              }}
            >
              Reject
            </button>
          )}
          {showFinalize && (
            <button className="btn btn--primary" disabled={busy} onClick={() => act(() => lockPayrollRun(run.id))}>
              Finalize & generate payslips
            </button>
          )}
          {run.status === 'FINALIZED' && (
            <button
              className="btn btn--ghost"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setErr(null);
                try {
                  const result = await emailPayslips(run.id);
                  setErr(null);
                  alert(`Emailed ${result.emailedCount} payslip(s)`);
                } catch (e) {
                  setErr(parseApiError(e).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Email payslips
            </button>
          )}
        </div>
      </div>

      {err && <div className="alert alert--err">{err}</div>}

      <div className="card" style={{ marginBottom: '1rem', padding: '1rem 1.15rem' }}>
        <h2 className="rec-form-card__title" style={{ marginTop: 0, fontSize: '0.95rem' }}>
          Approval workflow
        </h2>
        <ol style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.8, fontSize: '0.88rem' }}>
          {PAYROLL_STAGE_ORDER.map((step) => {
            const idx = PAYROLL_STAGE_ORDER.findIndex((s) => s.status === run.status);
            const stepIdx = PAYROLL_STAGE_ORDER.findIndex((s) => s.status === step.status);
            const done = stepIdx < idx || run.status === 'FINALIZED';
            const current = step.status === run.status;
            return (
              <li key={step.status} style={{ color: current ? 'var(--brand)' : done ? 'var(--ink-muted)' : undefined }}>
                <strong>{step.label}</strong>
                {current ? ' (current)' : done ? ' ✓' : ''}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="rec-table-wrap">
        <table className="rec-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Gross</th>
              <th>Deductions</th>
              <th>Net</th>
              {editable && <th />}
            </tr>
          </thead>
          <tbody>
            {(run.records ?? []).map((line) => (
              <tr key={line.id}>
                <td>
                  {line.employee
                    ? `${line.employee.firstName} ${line.employee.lastName}`
                    : line.employeeId}
                </td>
                {editingLineId === line.id ? (
                  <>
                    <td><input className="auth-input" type="number" min={0} step="0.01" value={editGross} onChange={(e) => setEditGross(e.target.value)} /></td>
                    <td><input className="auth-input" type="number" min={0} step="0.01" value={editDeductions} onChange={(e) => setEditDeductions(e.target.value)} /></td>
                    <td>{Math.max(0, Number(editGross) - Number(editDeductions)).toFixed(2)}</td>
                    <td>
                      <button type="button" className="btn btn--primary small" disabled={busy} onClick={saveLine}>Save</button>{' '}
                      <button type="button" className="btn btn--ghost small" onClick={() => setEditingLineId(null)}>Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{line.grossPay}</td>
                    <td>{line.totalDeductions}</td>
                    <td>{line.netPay}</td>
                    {editable && (
                      <td>
                        <button type="button" className="btn btn--ghost small" onClick={() => startEdit(line)}>Edit</button>
                      </td>
                    )}
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {run.approvals && run.approvals.length > 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h2 className="rec-form-card__title">Approval chain</h2>
          <ul>
            {run.approvals.map((a) => (
              <li key={a.id}>
                {a.approverRole}: {a.action}
                {a.comments ? ` — ${a.comments}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
