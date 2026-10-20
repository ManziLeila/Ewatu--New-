import { useEffect, useState } from 'react';
import { fetchMe } from '../../api';
import {
  fetchFeedbackRequests,
  createFeedbackRequest,
  submitFeedbackResponse,
  fetchEmployees,
  fetchMyEmployee,
  fetchAppraisals,
  fetchCompetencyFramework,
} from '../../payrollApi';

export function Feedback360Page() {
  const [me, setMe] = useState<any>(null);
  const [requestsSent, setRequestsSent] = useState<any[]>([]);
  const [requestsReceived, setRequestsReceived] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [appraisals, setAppraisals] = useState<any[]>([]);
  const [framework, setFramework] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Nominate Form State
  const [showNominateModal, setShowNominateModal] = useState(false);
  const [nominateForm, setNominateForm] = useState({
    appraisalId: '',
    reviewerId: '',
    relationship: 'PEER',
  });

  // Answer Survey Form State
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [surveyRatings, setSurveyRatings] = useState<Record<string, number>>({});
  const [surveyComments, setSurveyComments] = useState<Record<string, string>>({});
  const [generalComment, setGeneralComment] = useState('');
  const [anonymized, setAnonymized] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const user = await fetchMe();
      setMe(user);

      const matchedEmp = await fetchMyEmployee();
      try {
        // Listing all employees requires HR/admin privileges — used here only to populate
        // the "select reviewer" picker. A plain employee without that access still gets
        // their own requests below; the reviewer picker just falls back to empty.
        setEmployees(await fetchEmployees());
      } catch {
        setEmployees(matchedEmp ? [matchedEmp] : []);
      }
      const empId = matchedEmp?.id;

      if (empId) {
        // Load requests sent by current employee
        const sent: any = await fetchFeedbackRequests(undefined, empId);
        setRequestsSent(sent || []);

        // Load requests received by current employee to fill out
        const received: any = await fetchFeedbackRequests(empId, undefined);
        setRequestsReceived(received || []);

        // Load appraisals to nominate under
        const appList: any = await fetchAppraisals(empId);
        setAppraisals(appList || []);
        if (Array.isArray(appList) && appList[0]) {
          setNominateForm((prev) => ({ ...prev, appraisalId: appList[0].id }));
        }
      }

      const fw = await fetchCompetencyFramework();
      setFramework(fw);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize 360 feedback page');
    } finally {
      setLoading(false);
    }
  };

  const handleNominate = async (e: React.FormEvent) => {
    e.preventDefault();
    const matchedMeEmp = employees.find((e) => e.email.toLowerCase() === me?.email?.toLowerCase());
    if (!matchedMeEmp) return;

    if (!nominateForm.appraisalId || !nominateForm.reviewerId) {
      alert('Please fill out all fields');
      return;
    }

    try {
      await createFeedbackRequest({
        ...nominateForm,
        employeeId: matchedMeEmp.id,
      });
      setShowNominateModal(false);
      setNominateForm((prev) => ({ ...prev, reviewerId: '' }));
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to request peer feedback');
    }
  };

  const handleOpenSurvey = (req: any) => {
    setActiveRequest(req);
    setSurveyRatings({});
    setSurveyComments({});
    setGeneralComment('');
    setAnonymized(true);
    setShowSurveyModal(true);
  };

  const handleSubmitSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRequest) return;

    const competencyRatingsMap: Record<string, { rating: number; comment?: string }> = {};
    framework?.competencies?.forEach((c: any) => {
      competencyRatingsMap[c.id] = {
        rating: surveyRatings[c.id] || 3,
        comment: surveyComments[c.id] || '',
      };
    });

    try {
      await submitFeedbackResponse(activeRequest.id, {
        anonymized,
        competencyRatings: competencyRatingsMap,
        generalComment,
      });
      setShowSurveyModal(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit response');
    }
  };

  if (loading) {
    return (
      <div className="rec-page text-center" style={{ padding: '3rem' }}>
        <div className="spinner">Loading 360 feedback dashboard...</div>
      </div>
    );
  }

  return (
    <div className="rec-page">
      <div className="rec-page__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="rec-page__title">360-Degree Feedback</h1>
          <p className="muted">Request feedback from peers and subordinates, and complete review requests for colleagues.</p>
        </div>
        <button className="btn btn--primary" onClick={() => setShowNominateModal(true)}>
          + Nominate Peer Reviewer
        </button>
      </div>

      {error && <div className="alert alert--danger">{error}</div>}

      {/* Received Requests to Complete */}
      <section className="card mb-8">
        <h2 className="card-title mb-4">Feedback Requests for You to Complete</h2>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Colleague Name</th>
                <th>Relationship</th>
                <th>Cycle Period</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requestsReceived.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-muted">No feedback requests received.</td>
                </tr>
              ) : (
                requestsReceived.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.employee?.firstName} {r.employee?.lastName}</strong>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>{r.employee?.jobTitle}</div>
                    </td>
                    <td><span className="badge badge--neutral">{r.relationship}</span></td>
                    <td>{r.appraisal?.cycle?.name}</td>
                    <td>
                      <span className={`badge ${r.status === 'COMPLETED' ? 'badge--active' : 'badge--warning'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      {r.status === 'PENDING' ? (
                        <button className="btn btn--primary btn--sm" onClick={() => handleOpenSurvey(r)}>
                          Fill Survey
                        </button>
                      ) : (
                        <span className="text-muted">Response Submitted</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Nominations Sent */}
      <section className="card mb-8">
        <h2 className="card-title mb-4">Your Peer Nominations (Feedback Requested)</h2>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Reviewer Name</th>
                <th>Relationship</th>
                <th>Cycle Period</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {requestsSent.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-muted">You have not nominated any reviewers for this cycle.</td>
                </tr>
              ) : (
                requestsSent.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.reviewer?.firstName} {r.reviewer?.lastName}</strong>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>{r.reviewer?.jobTitle}</div>
                    </td>
                    <td><span className="badge badge--neutral">{r.relationship}</span></td>
                    <td>{r.appraisal?.cycle?.name}</td>
                    <td>
                      <span className={`badge ${r.status === 'COMPLETED' ? 'badge--active' : 'badge--warning'}`}>
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

      {/* Anonymized 360 Results view */}
      <section className="card">
        <h2 className="card-title mb-4">Anonymized 360 Feedback Received</h2>
        <p className="muted mb-4">Reviews provided by peers and subordinates are anonymized to encourage honest feedback.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {requestsSent.filter((r) => r.status === 'COMPLETED' && r.response).length === 0 ? (
            <div className="text-center text-muted" style={{ padding: '2rem' }}>No completed peer reviews yet.</div>
          ) : (
            requestsSent
              .filter((r) => r.status === 'COMPLETED' && r.response)
              .map((r) => (
                <div className="card" key={r.id} style={{ borderLeft: '4px solid var(--color-secondary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span className="badge badge--neutral">Reviewer Relationship: {r.relationship}</span>
                    <span className="text-muted" style={{ fontSize: '0.8rem' }}>Submitted: {new Date(r.response.createdAt).toLocaleDateString()}</span>
                  </div>
                  {r.response.generalComment && (
                    <p style={{ fontStyle: 'italic', marginBottom: '1rem' }}>
                      &ldquo;{r.response.generalComment}&rdquo;
                    </p>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    {framework?.competencies?.map((comp: any) => {
                      const ratingVal = r.response.competencyRatings?.[comp.id];
                      return (
                        <div key={comp.id} style={{ background: '#f9f9f9', padding: '0.8rem', borderRadius: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                            <strong>{comp.name}</strong>
                            <strong style={{ color: 'var(--primary-color)' }}>{ratingVal?.rating || 'N/A'}/5</strong>
                          </div>
                          {ratingVal?.comment && (
                            <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.3rem', fontStyle: 'italic' }}>
                              Comment: {ratingVal.comment}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
          )}
        </div>
      </section>

      {/* Nominate modal */}
      {showNominateModal && (
        <div className="rec-modal-backdrop">
          <div className="rec-modal" style={{ maxWidth: '500px', padding: '2rem' }}>
            <h3 className="rec-modal__title mb-4">Nominate Peer Reviewer</h3>
            <form onSubmit={handleNominate}>
              <div className="mb-4">
                <label className="rec-form__label">Select Cycle Appraisal</label>
                <select
                  className="auth-input"
                  value={nominateForm.appraisalId}
                  onChange={(e) => setNominateForm({ ...nominateForm, appraisalId: e.target.value })}
                  required
                >
                  <option value="">Select appraisal</option>
                  {appraisals.map((a) => (
                    <option key={a.id} value={a.id}>{a.cycle?.name} (status: {a.status})</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="rec-form__label">Select Reviewer</label>
                <select
                  className="auth-input"
                  value={nominateForm.reviewerId}
                  onChange={(e) => setNominateForm({ ...nominateForm, reviewerId: e.target.value })}
                  required
                >
                  <option value="">Select colleague</option>
                  {employees
                    .filter((e) => e.email.toLowerCase() !== me?.email?.toLowerCase())
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.firstName} {e.lastName} ({e.jobTitle})
                      </option>
                    ))}
                </select>
              </div>

              <div className="mb-6">
                <label className="rec-form__label">Relationship</label>
                <select
                  className="auth-input"
                  value={nominateForm.relationship}
                  onChange={(e) => setNominateForm({ ...nominateForm, relationship: e.target.value })}
                >
                  <option value="PEER">Peer / Colleague</option>
                  <option value="SUBORDINATE">Subordinate</option>
                  <option value="MANAGER">Manager</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn--neutral" onClick={() => setShowNominateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary">
                  Request Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Survey Modal */}
      {showSurveyModal && activeRequest && (
        <div className="rec-modal-backdrop">
          <div className="rec-modal" style={{ maxWidth: '650px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="rec-modal__title mb-2">Colleague Performance Survey</h3>
            <p className="muted mb-4">
              Providing feedback for: <strong>{activeRequest.employee?.firstName} {activeRequest.employee?.lastName}</strong> ({activeRequest.employee?.jobTitle})
            </p>

            <form onSubmit={handleSubmitSurvey}>
              {framework?.competencies?.map((comp: any) => (
                <div key={comp.id} className="mb-6" style={{ background: '#f9f9f9', padding: '1rem', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <strong style={{ fontSize: '1rem' }}>{comp.name}</strong>
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          type="button"
                          key={val}
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '50%',
                            border: '1px solid #ccc',
                            background: surveyRatings[comp.id] === val ? 'var(--primary-color)' : '#fff',
                            color: surveyRatings[comp.id] === val ? '#fff' : '#333',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                          }}
                          onClick={() => setSurveyRatings({ ...surveyRatings, [comp.id]: val })}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="text-muted mb-3" style={{ fontSize: '0.8rem' }}>{comp.description}</div>
                  <input
                    type="text"
                    placeholder="Specific comments on this competency..."
                    className="auth-input"
                    value={surveyComments[comp.id] || ''}
                    onChange={(e) => setSurveyComments({ ...surveyComments, [comp.id]: e.target.value })}
                  />
                </div>
              ))}

              <div className="mb-4">
                <label className="rec-form__label">General Review Summary</label>
                <textarea
                  className="auth-input"
                  style={{ minHeight: '80px' }}
                  placeholder="Optional high-level comments..."
                  value={generalComment}
                  onChange={(e) => setGeneralComment(e.target.value)}
                />
              </div>

              <div className="mb-6" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="anonymized"
                  checked={anonymized}
                  onChange={(e) => setAnonymized(e.target.checked)}
                />
                <label htmlFor="anonymized" className="font-semibold" style={{ cursor: 'pointer' }}>
                  Submit Anonymously (Hides your name on final scores)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn--neutral" onClick={() => setShowSurveyModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary">
                  Submit Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
