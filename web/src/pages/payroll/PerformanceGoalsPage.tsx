import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { fetchMe } from '../../api';
import { hasAnyRole } from '../../lib/roles';
import {
  fetchGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  fetchGoalTemplates,
  fetchAppraisalCycles,
  fetchEmployees,
  fetchMyEmployee,
} from '../../payrollApi';

const HR_PICKER_ROLES = ['TENANT_ADMIN', 'HR_MANAGER', 'MANAGING_DIRECTOR'] as const;

type PerfOutlet = { roles?: string[]; isAdmin?: boolean; isStaffOnly?: boolean };

export function PerformanceGoalsPage() {
  const outlet = useOutletContext<PerfOutlet | undefined>();
  const [me, setMe] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [cycles, setCycles] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / Form state
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    target: '',
    measurementMethod: '',
    weight: 20,
    deadline: '',
  });

  const [managerComments, setManagerComments] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const user = await fetchMe();
      setMe(user);

      const cycleList: any = await fetchAppraisalCycles();
      setCycles(cycleList || []);
      const activeCycle = (cycleList || []).find((c: any) => c.status === 'ACTIVE') || cycleList?.[0];
      if (activeCycle) setSelectedCycleId(activeCycle.id);

      const matchedEmp = await fetchMyEmployee();
      try {
        // Listing all employees requires HR/admin privileges — used here only to populate
        // the employee picker. A plain employee without that access still gets their own
        // goals below; the picker just falls back to showing only themselves.
        setEmployees(await fetchEmployees());
      } catch {
        setEmployees(matchedEmp ? [matchedEmp] : []);
      }
      if (matchedEmp) setSelectedEmployeeId(matchedEmp.id);

      const tmplList: any = await fetchGoalTemplates();
      setTemplates(tmplList || []);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize Goal Setting page');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCycleId && selectedEmployeeId) {
      loadGoals();
    }
  }, [selectedCycleId, selectedEmployeeId]);

  const loadGoals = async () => {
    try {
      const list: any = await fetchGoals(selectedEmployeeId, selectedCycleId);
      setGoals(list || []);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleImportTemplate = (template: any) => {
    setNewGoal({
      title: template.title,
      description: template.description || '',
      target: template.target,
      measurementMethod: template.measurementMethod,
      weight: Number(template.weight),
      deadline: '',
    });
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCycleId || !selectedEmployeeId) {
      alert('Please select a cycle and employee profile first');
      return;
    }
    try {
      await createGoal({
        ...newGoal,
        employeeId: selectedEmployeeId,
        appraisalCycleId: selectedCycleId,
      });
      setShowGoalModal(false);
      setNewGoal({
        title: '',
        description: '',
        target: '',
        measurementMethod: '',
        weight: 20,
        deadline: '',
      });
      await loadGoals();
    } catch (err: any) {
      alert(err.message || 'Failed to create goal');
    }
  };

  const handleUpdateProgress = async (id: string, progress: number) => {
    try {
      await updateGoal(id, { progress });
      await loadGoals();
    } catch (err: any) {
      alert(err.message || 'Failed to update progress');
    }
  };

  const handleSubmitGoals = async () => {
    try {
      for (const g of goals) {
        if (g.status === 'DRAFT' || g.status === 'REJECTED') {
          await updateGoal(g.id, { status: 'SUBMITTED' });
        }
      }
      alert('Goals submitted to manager for approval!');
      await loadGoals();
    } catch (err: any) {
      alert(err.message || 'Failed to submit goals');
    }
  };

  const handleApproveGoal = async (id: string) => {
    try {
      await updateGoal(id, {
        status: 'APPROVED',
        managerComment: managerComments[id] || 'Goal approved',
      });
      await loadGoals();
    } catch (err: any) {
      alert(err.message || 'Failed to approve goal');
    }
  };

  const handleRejectGoal = async (id: string) => {
    try {
      await updateGoal(id, {
        status: 'REJECTED',
        managerComment: managerComments[id] || 'Goal rejected. Please revise weight or target.',
      });
      await loadGoals();
    } catch (err: any) {
      alert(err.message || 'Failed to reject goal');
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    try {
      await deleteGoal(id);
      await loadGoals();
    } catch (err: any) {
      alert(err.message || 'Failed to delete goal');
    }
  };

  // Check if current user is the manager of the selected employee
  const selectedEmpObj = employees.find((e) => e.id === selectedEmployeeId);
  const matchedMeEmp = employees.find((e) => e.email.toLowerCase() === me?.email?.toLowerCase());
  const isManager = selectedEmpObj && matchedMeEmp && selectedEmpObj.managerId === matchedMeEmp.id;
  const isSelf = matchedMeEmp && matchedMeEmp.id === selectedEmployeeId;
  const roles = outlet?.roles?.length ? outlet.roles : me?.roles ?? [];
  const canPickEmployee = hasAnyRole(roles, [...HR_PICKER_ROLES]);
  const staffView = outlet?.isStaffOnly ?? (roles.length > 0 && !canPickEmployee);

  const totalWeight = goals.reduce((sum, g) => sum + Number(g.weight), 0);

  if (loading) {
    return (
      <div className="rec-page text-center" style={{ padding: '3rem' }}>
        <div className="spinner">Loading goal workspace...</div>
      </div>
    );
  }

  return (
    <div className="rec-page">
      <header className="rec-page__header">
        <div>
          <h1 className="rec-page__title">{staffView ? 'My goals' : 'Goal setting & KPIs'}</h1>
          <p className="muted">
            {staffView
              ? 'Set objectives for the active cycle, track progress, and submit for manager approval.'
              : 'Review team goals, approve submissions, and monitor cycle weighting.'}
          </p>
        </div>
        {isSelf && (
          <div className="rec-page__actions">
            <button type="button" className="btn btn--secondary" onClick={() => setShowGoalModal(true)}>
              + Write goal
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleSubmitGoals}
              disabled={goals.length === 0}
              title={goals.length === 0 ? 'Add at least one goal first' : undefined}
            >
              Submit to manager
            </button>
          </div>
        )}
      </header>

      {error && <div className="alert alert--err">{error}</div>}

      <section className="card perf-workspace-panel">
        <div className={`perf-workspace-panel__grid${canPickEmployee ? '' : ' perf-workspace-panel__grid--single'}`}>
          <div>
            <label className="rec-form__label" htmlFor="perf-cycle-select">
              Appraisal cycle
            </label>
            <select
              id="perf-cycle-select"
              className="auth-input"
              value={selectedCycleId}
              onChange={(e) => setSelectedCycleId(e.target.value)}
            >
              <option value="">Select appraisal cycle</option>
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
              ))}
            </select>
          </div>
          {canPickEmployee ? (
            <div>
              <label className="rec-form__label" htmlFor="perf-employee-select">
                Employee view
              </label>
              <select
                id="perf-employee-select"
                className="auth-input"
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
              >
                <option value="">Select employee</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName}
                    {e.jobTitle ? ` · ${e.jobTitle}` : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : matchedMeEmp ? (
            <div className="perf-workspace-panel__self">
              <span className="rec-form__label">Applying as</span>
              <strong>
                {matchedMeEmp.firstName} {matchedMeEmp.lastName}
              </strong>
            </div>
          ) : (
            <div className="alert alert--warn" style={{ margin: 0 }}>
              No payroll employee record is linked to your login email. Ask HR to create or link your profile.
            </div>
          )}
        </div>
      </section>

      <section className="card perf-weight-panel">
        <div>
          <span className="perf-weight-panel__label">Total goal weight assigned</span>{' '}
          <span
            className={`perf-weight-panel__value ${
              totalWeight === 100 ? 'perf-weight-panel__value--ok' : 'perf-weight-panel__value--warn'
            }`}
          >
            {totalWeight}%
          </span>
          <span className="perf-weight-panel__hint">Should sum to exactly 100% before cycle launch.</span>
        </div>
        <div>
          {totalWeight !== 100 && (
            <span className="badge badge--red">Warning: weights do not sum to 100%</span>
          )}
          {totalWeight === 100 && (
            <span className="badge badge--green">Weighting balanced</span>
          )}
        </div>
      </section>

      {/* Goals List */}
      <section className="mb-6">
        {goals.length === 0 ? (
          <div className="card perf-empty-state">
            No goals set for this cycle. {isSelf ? 'Click "+ Write goal" to set your first objective.' : 'This employee has not created any goals yet.'}
          </div>
        ) : (
          <div className="perf-goal-list">
            {goals.map((g) => (
              <div className="card perf-goal-card" key={g.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>{g.title}</h3>
                    {g.description && <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '0.3rem' }}>{g.description}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className="badge badge--neutral">Weight: {g.weight}%</span>
                    <span className={`badge ${
                      g.status === 'APPROVED'
                        ? 'badge--active'
                        : g.status === 'REJECTED'
                          ? 'badge--danger'
                          : 'badge--warning'
                    }`}>
                      {g.status}
                    </span>
                    {isSelf && g.status === 'DRAFT' && (
                      <button className="btn btn--danger btn--sm" onClick={() => handleDeleteGoal(g.id)}>
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div>
                    <div className="muted font-semibold" style={{ fontSize: '0.8rem' }}>Target:</div>
                    <div style={{ fontSize: '0.95rem' }}>{g.target}</div>
                  </div>
                  <div>
                    <div className="muted font-semibold" style={{ fontSize: '0.8rem' }}>Measurement Method:</div>
                    <div style={{ fontSize: '0.95rem' }}>{g.measurementMethod}</div>
                  </div>
                </div>

                <hr className="perf-goal-card__divider" />

                {/* Progress bar / slider */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'center' }}>
                  <div>
                    <label className="rec-form__label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Progress Tracking:</span>
                      <strong style={{ color: 'var(--primary-color)' }}>{g.progress}%</strong>
                    </label>
                    {isSelf ? (
                      <input
                        type="range"
                        min="0"
                        max="100"
                        className="auth-input"
                        style={{ padding: 0 }}
                        value={g.progress}
                        onChange={(e) => handleUpdateProgress(g.id, parseInt(e.target.value, 10))}
                      />
                    ) : (
                      <div className="perf-progress-track">
                        <div className="perf-progress-fill" style={{ width: `${g.progress}%` }} />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="muted font-semibold" style={{ fontSize: '0.8rem' }}>Deadline:</div>
                    <div style={{ fontSize: '0.9rem' }}>{new Date(g.deadline).toLocaleDateString()}</div>
                  </div>
                </div>

                {g.managerComment && (
                  <div className="alert alert--neutral" style={{ marginTop: '1rem', padding: '0.8rem', fontSize: '0.85rem' }}>
                    <strong>Manager Comments:</strong> {g.managerComment}
                  </div>
                )}

                {/* Manager actions panel */}
                {isManager && g.status === 'SUBMITTED' && (
                  <div className="perf-manager-panel">
                    <div className="mb-3">
                      <label className="rec-form__label">Review Comment (Optional)</label>
                      <input
                        type="text"
                        placeholder="Add feedback or reasons for approval/rejection..."
                        className="auth-input"
                        value={managerComments[g.id] || ''}
                        onChange={(e) => setManagerComments({ ...managerComments, [g.id]: e.target.value })}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button className="btn btn--success btn--sm" onClick={() => handleApproveGoal(g.id)}>
                        Approve Goal
                      </button>
                      <button className="btn btn--danger btn--sm" onClick={() => handleRejectGoal(g.id)}>
                        Reject Goal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Goal Modal */}
      {showGoalModal && (
        <div className="rec-modal-backdrop">
          <div className="rec-modal" style={{ maxWidth: '750px', padding: '2rem', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
            {/* Form Column */}
            <div>
              <h3 className="rec-modal__title mb-4">Write Performance Goal</h3>
              <form onSubmit={handleCreateGoal}>
                <div className="mb-4">
                  <label className="rec-form__label">Goal Title</label>
                  <input
                    type="text"
                    className="auth-input"
                    value={newGoal.title}
                    onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                    placeholder="e.g. Expand candidate pool size"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="rec-form__label">Description</label>
                  <textarea
                    className="auth-input"
                    style={{ minHeight: '60px' }}
                    value={newGoal.description}
                    onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                    placeholder="Optional background details..."
                  />
                </div>

                <div className="mb-4">
                  <label className="rec-form__label">Target Description</label>
                  <input
                    type="text"
                    className="auth-input"
                    value={newGoal.target}
                    onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
                    placeholder="e.g. Reach 500 active profiles"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="rec-form__label">Measurement Method</label>
                  <input
                    type="text"
                    className="auth-input"
                    value={newGoal.measurementMethod}
                    onChange={(e) => setNewGoal({ ...newGoal, measurementMethod: e.target.value })}
                    placeholder="e.g. Database queries monthly"
                    required
                  />
                </div>

                <div className="mb-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="rec-form__label">Weight (%)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      className="auth-input"
                      value={newGoal.weight}
                      onChange={(e) => setNewGoal({ ...newGoal, weight: parseInt(e.target.value, 10) })}
                      required
                    />
                  </div>
                  <div>
                    <label className="rec-form__label">Deadline</label>
                    <input
                      type="date"
                      className="auth-input"
                      value={newGoal.deadline}
                      onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <button type="button" className="btn btn--neutral" onClick={() => setShowGoalModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn--primary">
                    Create Goal
                  </button>
                </div>
              </form>
            </div>

            {/* Template library Column */}
            <div className="perf-modal-templates">
              <h4 className="font-semibold mb-3">Or choose from Template Library</h4>
              <p className="muted" style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>Select standard KPIs configured for your role.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {templates.map((t) => (
                  <div
                    className="card"
                    key={t.id}
                    style={{ padding: '0.8rem', cursor: 'pointer' }}
                    onClick={() => handleImportTemplate(t)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                      <strong>{t.title}</strong>
                      <span className="badge badge--neutral">{t.weight}%</span>
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.3rem' }}>{t.target}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
