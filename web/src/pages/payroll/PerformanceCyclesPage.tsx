import { useEffect, useState } from 'react';
import { fetchMe } from '../../api';
import {
  fetchAppraisalCycles,
  createAppraisalCycle,
  updateAppraisalCycleStatus,
  fetchCompetencyFramework,
  fetchGoalTemplates,
  createGoalTemplate,
  fetchPayrollConfigClients,
} from '../../payrollApi';

export function PerformanceCyclesPage() {
  const [me, setMe] = useState<any>(null);
  const [cycles, setCycles] = useState<any[]>([]);
  const [framework, setFramework] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals / Forms State
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const [cycleForm, setCycleForm] = useState({
    name: '',
    frequency: 'ANNUAL',
    startDate: '',
    endDate: '',
    selfAssessmentDeadline: '',
    managerReviewDeadline: '',
    hrValidationDeadline: '',
    clientId: '',
  });

  const [templateForm, setTemplateForm] = useState({
    title: '',
    target: '',
    measurementMethod: '',
    weight: 20,
    roleType: '',
  });

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

      const fw = await fetchCompetencyFramework();
      setFramework(fw);

      const tmplList: any = await fetchGoalTemplates();
      setTemplates(tmplList || []);

      try {
        const clientList = await fetchPayrollConfigClients();
        setClients(clientList);
      } catch (e) {
        // Platform service might not have client endpoint accessible or configured
        setClients([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load performance configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAppraisalCycle(cycleForm);
      setShowCycleModal(false);
      setCycleForm({
        name: '',
        frequency: 'ANNUAL',
        startDate: '',
        endDate: '',
        selfAssessmentDeadline: '',
        managerReviewDeadline: '',
        hrValidationDeadline: '',
        clientId: '',
      });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create cycle');
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createGoalTemplate(templateForm);
      setShowTemplateModal(false);
      setTemplateForm({
        title: '',
        target: '',
        measurementMethod: '',
        weight: 20,
        roleType: '',
      });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create template');
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateAppraisalCycleStatus(id, newStatus);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update cycle status');
    }
  };

  const isHR = me?.roles?.includes('HR_MANAGER') || me?.roles?.includes('TENANT_ADMIN');

  if (loading) {
    return (
      <div className="rec-page text-center" style={{ padding: '3rem' }}>
        <div className="spinner">Loading performance cycles...</div>
      </div>
    );
  }

  return (
    <div className="rec-page">
      <div className="rec-page__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="rec-page__title">Performance Cycles</h1>
          <p className="muted">Configure appraisal cycles, competencies, and KPI template library.</p>
        </div>
        {isHR && (
          <button className="btn btn--primary" onClick={() => setShowCycleModal(true)}>
            + Create Appraisal Cycle
          </button>
        )}
      </div>

      {error && <div className="alert alert--danger">{error}</div>}

      {/* Active Cycles Section */}
      <section className="card mb-8">
        <h2 className="card-title mb-4">Appraisal Cycles</h2>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Cycle Name</th>
                <th>Frequency</th>
                <th>Appraisal Dates</th>
                <th>Self Assessment Deadline</th>
                <th>Review Deadline</th>
                <th>Validation Deadline</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cycles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-muted">No appraisal cycles configured yet.</td>
                </tr>
              ) : (
                cycles.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.name}</strong></td>
                    <td><span className="badge badge--neutral">{c.frequency}</span></td>
                    <td>
                      {new Date(c.startDate).toLocaleDateString()} to {new Date(c.endDate).toLocaleDateString()}
                    </td>
                    <td>{new Date(c.selfAssessmentDeadline).toLocaleDateString()}</td>
                    <td>{new Date(c.managerReviewDeadline).toLocaleDateString()}</td>
                    <td>{new Date(c.hrValidationDeadline).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${
                        c.status === 'ACTIVE'
                          ? 'badge--active'
                          : c.status === 'COMPLETED'
                            ? 'badge--neutral'
                            : 'badge--warning'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td>
                      {isHR && c.status === 'DRAFT' && (
                        <button className="btn btn--success btn--sm" onClick={() => handleStatusChange(c.id, 'ACTIVE')}>
                          Launch Cycle
                        </button>
                      )}
                      {isHR && c.status === 'ACTIVE' && (
                        <button className="btn btn--neutral btn--sm" onClick={() => handleStatusChange(c.id, 'COMPLETED')}>
                          Complete Cycle
                        </button>
                      )}
                      {!isHR && <span className="text-muted">No actions</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Competencies & Templates Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Competencies Framework */}
        <section className="card">
          <h2 className="card-title mb-4">Competency Framework</h2>
          <p className="muted mb-4">Core skills and competencies rated during employee reviews.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {framework?.competencies?.map((comp: any) => (
              <div className="card" key={comp.id} style={{ padding: '1rem', borderLeft: '3px solid var(--color-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <strong>{comp.name}</strong>
                  <span className="badge badge--neutral">Weight: {comp.weight}</span>
                </div>
                <div className="text-muted" style={{ fontSize: '0.85rem' }}>{comp.description}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Goal templates */}
        <section className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="card-title">Goal Library (KPI Templates)</h2>
            {isHR && (
              <button className="btn btn--secondary btn--sm" onClick={() => setShowTemplateModal(true)}>
                + Add Template
              </button>
            )}
          </div>
          <p className="muted mb-4">Standard goals/KPIs employees can import during goal setting.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {templates.length === 0 ? (
              <div className="text-center text-muted" style={{ padding: '2rem' }}>No templates in library.</div>
            ) : (
              templates.map((t) => (
                <div className="card" key={t.id} style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <strong>{t.title}</strong>
                    <span className="badge badge--neutral">Weight: {t.weight}%</span>
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>Target: {t.target}</div>
                  <div className="text-muted" style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>Method: {t.measurementMethod}</div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Cycle Modal */}
      {showCycleModal && (
        <div className="rec-modal-backdrop">
          <div className="rec-modal" style={{ maxWidth: '600px', padding: '2rem' }}>
            <h3 className="rec-modal__title mb-4">Create Appraisal Cycle</h3>
            <form onSubmit={handleCreateCycle}>
              <div className="mb-4">
                <label className="rec-form__label">Cycle Name</label>
                <input
                  type="text"
                  className="auth-input"
                  value={cycleForm.name}
                  onChange={(e) => setCycleForm({ ...cycleForm, name: e.target.value })}
                  placeholder="e.g. Annual Appraisal 2026"
                  required
                />
              </div>

              <div className="mb-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="rec-form__label">Frequency</label>
                  <select
                    className="auth-input"
                    value={cycleForm.frequency}
                    onChange={(e) => setCycleForm({ ...cycleForm, frequency: e.target.value })}
                  >
                    <option value="ANNUAL">Annual</option>
                    <option value="SEMI_ANNUAL">Semi-Annual</option>
                    <option value="QUARTERLY">Quarterly</option>
                  </select>
                </div>
                <div>
                  <label className="rec-form__label">Client Company (Optional)</label>
                  <select
                    className="auth-input"
                    value={cycleForm.clientId}
                    onChange={(e) => setCycleForm({ ...cycleForm, clientId: e.target.value })}
                  >
                    <option value="">All Clients / Internal Staff</option>
                    {clients.map((c) => (
                      <option key={c.clientId} value={c.clientId}>{c.clientId}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="rec-form__label">Start Date</label>
                  <input
                    type="date"
                    className="auth-input"
                    value={cycleForm.startDate}
                    onChange={(e) => setCycleForm({ ...cycleForm, startDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="rec-form__label">End Date</label>
                  <input
                    type="date"
                    className="auth-input"
                    value={cycleForm.endDate}
                    onChange={(e) => setCycleForm({ ...cycleForm, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="mb-6" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="rec-form__label" style={{ fontSize: '0.8rem' }}>Self Assessment Date</label>
                  <input
                    type="date"
                    className="auth-input"
                    value={cycleForm.selfAssessmentDeadline}
                    onChange={(e) => setCycleForm({ ...cycleForm, selfAssessmentDeadline: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="rec-form__label" style={{ fontSize: '0.8rem' }}>Manager Review Date</label>
                  <input
                    type="date"
                    className="auth-input"
                    value={cycleForm.managerReviewDeadline}
                    onChange={(e) => setCycleForm({ ...cycleForm, managerReviewDeadline: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="rec-form__label" style={{ fontSize: '0.8rem' }}>HR Validation Date</label>
                  <input
                    type="date"
                    className="auth-input"
                    value={cycleForm.hrValidationDeadline}
                    onChange={(e) => setCycleForm({ ...cycleForm, hrValidationDeadline: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn--neutral" onClick={() => setShowCycleModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary">
                  Create Cycle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="rec-modal-backdrop">
          <div className="rec-modal" style={{ maxWidth: '500px', padding: '2rem' }}>
            <h3 className="rec-modal__title mb-4">Add Goal Template</h3>
            <form onSubmit={handleCreateTemplate}>
              <div className="mb-4">
                <label className="rec-form__label">Goal Title</label>
                <input
                  type="text"
                  className="auth-input"
                  value={templateForm.title}
                  onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
                  placeholder="e.g. Achieve Sales Target"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="rec-form__label">Target Description</label>
                <input
                  type="text"
                  className="auth-input"
                  value={templateForm.target}
                  onChange={(e) => setTemplateForm({ ...templateForm, target: e.target.value })}
                  placeholder="e.g. Raise average response speed to < 2 hrs"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="rec-form__label">Measurement Method</label>
                <input
                  type="text"
                  className="auth-input"
                  value={templateForm.measurementMethod}
                  onChange={(e) => setTemplateForm({ ...templateForm, measurementMethod: e.target.value })}
                  placeholder="e.g. Ticketing system logs"
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
                    value={templateForm.weight}
                    onChange={(e) => setTemplateForm({ ...templateForm, weight: parseInt(e.target.value, 10) })}
                    required
                  />
                </div>
                <div>
                  <label className="rec-form__label">Target Role (Optional)</label>
                  <input
                    type="text"
                    className="auth-input"
                    value={templateForm.roleType}
                    onChange={(e) => setTemplateForm({ ...templateForm, roleType: e.target.value })}
                    placeholder="e.g. Recruiter"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn--neutral" onClick={() => setShowTemplateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary">
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
