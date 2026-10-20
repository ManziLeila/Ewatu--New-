import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchMe } from '../../api';
import { parseApiError } from '../../lib/parseApiError';
import {
  fetchLeaveTypes,
  fetchEmployees,
  fetchMyEmployee,
  createLeaveRequest,
  fetchLeaveRequest,
  updateLeaveRequest,
  uploadLeaveAttachment,
  type LeaveType,
  type Employee,
} from '../../payrollApi';

function calculateWorkingDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

const HR_APPLY_FOR_OTHERS_ROLES = ['TENANT_ADMIN', 'HR_MANAGER', 'MANAGING_DIRECTOR'] as const;

function toDateInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export function LeaveApplyPage() {
  const navigate = useNavigate();
  const { requestId } = useParams<{ requestId?: string }>();
  const isEdit = Boolean(requestId);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [myEmployee, setMyEmployee] = useState<Employee | null>(null);
  const [canApplyForOthers, setCanApplyForOthers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    employeeId: '',
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: '',
    delegateToEmployeeId: '',
    emergencyContactPhone: '',
  });
  const [attachment, setAttachment] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [types, matchedEmp, me] = await Promise.all([
          fetchLeaveTypes(),
          fetchMyEmployee(),
          fetchMe().catch(() => null),
        ]);
        setLeaveTypes(types);
        setMyEmployee(matchedEmp);
        const hrApply =
          me?.roles?.some((r) => (HR_APPLY_FOR_OTHERS_ROLES as readonly string[]).includes(r)) ?? false;
        setCanApplyForOthers(hrApply);

        if (matchedEmp && !requestId) {
          setFormData((prev) => ({ ...prev, employeeId: matchedEmp.id }));
        }

        if (requestId) {
          const existing = await fetchLeaveRequest(requestId);
          if (existing.status !== 'PENDING') {
            setLoadError('Only pending requests can be edited.');
            return;
          }
          setFormData({
            employeeId: existing.employeeId,
            leaveTypeId: existing.leaveTypeId,
            startDate: toDateInput(existing.startDate),
            endDate: toDateInput(existing.endDate),
            reason: existing.reason ?? '',
            delegateToEmployeeId: existing.delegateToEmployeeId ?? '',
            emergencyContactPhone: existing.emergencyContactPhone ?? '',
          });
        }

        if (hrApply) {
          try {
            setEmployees(await fetchEmployees());
          } catch {
            setEmployees(matchedEmp ? [matchedEmp] : []);
          }
        } else {
          setEmployees(matchedEmp ? [matchedEmp] : []);
        }
      } catch (err) {
        setLoadError(parseApiError(err).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [requestId]);

  const workingDays = calculateWorkingDays(formData.startDate, formData.endDate);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.employeeId || !formData.leaveTypeId || !formData.startDate || !formData.endDate) {
      setFormError('Please fill in all required fields.');
      return;
    }
    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      setFormError('End date cannot be before start date.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        leaveTypeId: formData.leaveTypeId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason,
        delegateToEmployeeId: formData.delegateToEmployeeId || undefined,
        emergencyContactPhone: formData.emergencyContactPhone || undefined,
      };

      if (isEdit && requestId) {
        await updateLeaveRequest(requestId, payload);
        if (attachment) {
          try {
            await uploadLeaveAttachment(requestId, attachment);
          } catch {
            /* non-fatal */
          }
        }
        navigate('/leave/requests', { state: { updated: true } });
        return;
      }

      const created = await createLeaveRequest({
        employeeId: formData.employeeId,
        ...payload,
      });

      if (attachment) {
        try {
          await uploadLeaveAttachment(created.id, attachment);
        } catch {
          // Non-fatal: the request itself was created successfully.
        }
      }

      navigate('/leave/requests', { state: { submitted: true } });
    } catch (err) {
      setFormError(parseApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="rec-page" style={{ textAlign: 'center', padding: '3rem' }}>
        <p className="muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="rec-page">
      <div className="rec-page__header">
        <div>
          <h1 className="rec-page__title">{isEdit ? 'Edit leave request' : 'Apply for Leave'}</h1>
          <p className="muted">
            {isEdit
              ? 'Update your pending request before a manager approves it.'
              : 'Submit a new time-off request for approval.'}
          </p>
        </div>
      </div>

      {loadError && <div className="alert alert--err">{loadError}</div>}

      {!loadError && !myEmployee && !canApplyForOthers && (
        <div className="alert alert--err" role="alert">
          We could not find an employee profile linked to your account. Ask HR to link your login email to an
          employee record, or visit <Link to="/platform/profile">My Profile</Link>.
        </div>
      )}

      <section className="card" style={{ maxWidth: 640 }}>
        {formError && <div className="alert alert--err">{formError}</div>}
        <form onSubmit={handleSubmit}>
          {canApplyForOthers && !isEdit ? (
            <div style={{ marginBottom: '1rem' }}>
              <label className="rec-form__label">Employee (HR: apply on behalf of)</label>
              <select
                className="auth-input"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                required
              >
                <option value="">Select employee</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName} ({e.email})
                  </option>
                ))}
              </select>
            </div>
          ) : myEmployee ? (
            <div
              style={{
                marginBottom: '1rem',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--surface-2, #f1f5f9)',
                border: '1px solid var(--border, #e2e8f0)',
              }}
            >
              <div className="rec-form__label" style={{ marginBottom: '0.25rem' }}>
                Applying as
              </div>
              <strong>
                {myEmployee.firstName} {myEmployee.lastName}
              </strong>
              {myEmployee.email && (
                <span className="muted" style={{ display: 'block', fontSize: '0.88rem' }}>
                  {myEmployee.email}
                </span>
              )}
            </div>
          ) : null}

          <div style={{ marginBottom: '1rem' }}>
            <label className="rec-form__label">Leave Category</label>
            <select
              className="auth-input"
              value={formData.leaveTypeId}
              onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })}
              required
            >
              <option value="">Select Leave Type</option>
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.defaultDays} default days)
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '0.4rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="rec-form__label">Start Date</label>
              <input
                type="date"
                className="auth-input"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="rec-form__label">End Date</label>
              <input
                type="date"
                className="auth-input"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
            </div>
          </div>
          {formData.startDate && formData.endDate && (
            <div className="muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
              {workingDays > 0
                ? `${workingDays} working day${workingDays === 1 ? '' : 's'} (weekends excluded)`
                : 'End date must be on or after the start date.'}
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label className="rec-form__label">Reason for Request</label>
            <textarea
              className="auth-input"
              style={{ minHeight: '80px' }}
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Provide context for your manager / HR..."
            />
          </div>

          <div style={{ marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="rec-form__label">Delegate Work To</label>
              <select
                className="auth-input"
                value={formData.delegateToEmployeeId}
                onChange={(e) => setFormData({ ...formData, delegateToEmployeeId: e.target.value })}
              >
                <option value="">None</option>
                {employees.filter((e) => e.id !== formData.employeeId).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="rec-form__label">Emergency Contact</label>
              <input
                type="tel"
                className="auth-input"
                value={formData.emergencyContactPhone}
                onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                placeholder="Phone number"
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label className="rec-form__label">Attachment (optional)</label>
            <input
              type="file"
              className="auth-input"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.csv"
              onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
            />
            <p className="muted" style={{ fontSize: '0.78rem', marginTop: '0.3rem' }}>
              e.g. medical certificate, approval letter, supporting documents.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button type="button" className="btn btn--ghost" onClick={() => navigate('/leave')}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={submitting || (!canApplyForOthers && !myEmployee)}
            >
              {submitting ? (isEdit ? 'Saving…' : 'Submitting…') : isEdit ? 'Save changes' : 'Submit Leave Request'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
