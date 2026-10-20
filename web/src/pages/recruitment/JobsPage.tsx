import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createJob,
  deleteJob,
  fetchJobs,
  updateJob,
  type FeeType,
  type Job,
  type JobPriority,
  type JobStatus,
  type JobType,
  type WorkplaceType,
} from '../../recruitmentApi';

const WORKPLACE_LABELS: Record<WorkplaceType, string> = {
  ON_SITE: 'On-site',
  REMOTE: 'Remote',
  HYBRID: 'Hybrid',
};

const JOB_TYPE_LABELS: Record<JobType, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  INTERNSHIP: 'Internship',
};

const PRIORITY_CLASS: Record<JobPriority, string> = {
  STANDARD: 'badge badge--gray',
  URGENT: 'badge badge--orange',
  EXECUTIVE: 'badge badge--purple',
};

const STATUS_CLASS: Record<JobStatus, string> = {
  DRAFT: 'badge badge--gray',
  OPEN: 'badge badge--green',
  IN_PROGRESS: 'badge badge--blue',
  ON_HOLD: 'badge badge--orange',
  FILLED: 'badge badge--blue',
  CANCELLED: 'badge badge--red',
};

const STATUS_LABELS: Record<JobStatus, string> = {
  DRAFT: 'Draft',
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  ON_HOLD: 'On Hold',
  FILLED: 'Filled',
  CANCELLED: 'Cancelled',
};

export function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState<JobType>('FULL_TIME');
  const [status, setStatus] = useState<JobStatus>('OPEN');
  const [priority, setPriority] = useState<JobPriority>('STANDARD');
  const [description, setDescription] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [deadline, setDeadline] = useState('');
  const [requiredSkills, setRequiredSkills] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientId, setClientId] = useState('');
  const [consultantId, setConsultantId] = useState('');
  const [headcount, setHeadcount] = useState('1');
  const [feeType, setFeeType] = useState<FeeType | ''>('');
  const [feeValue, setFeeValue] = useState('');
  const [country, setCountry] = useState('RW');
  const [category, setCategory] = useState('');
  const [workplaceType, setWorkplaceType] = useState<WorkplaceType>('ON_SITE');
  const [salaryText, setSalaryText] = useState('');
  const [responsibilities, setResponsibilities] = useState('');
  const [externalApplyEnabled, setExternalApplyEnabled] = useState(false);
  const [externalApplyUrl, setExternalApplyUrl] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      setJobs(
        await fetchJobs({
          ...(filterStatus ? { status: filterStatus } : {}),
          ...(filterPriority ? { priority: filterPriority } : {}),
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
        }),
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPriority, debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  const startEdit = (job: Job) => {
    setEditingId(job.id);
    setTitle(job.title);
    setDepartment(job.department ?? '');
    setLocation(job.location ?? '');
    setType(job.type);
    setStatus(job.status);
    setPriority(job.priority);
    setDescription(job.description ?? '');
    setQualifications(job.qualifications ?? '');
    setSalaryMin(job.salaryMin != null ? String(job.salaryMin) : '');
    setSalaryMax(job.salaryMax != null ? String(job.salaryMax) : '');
    setDeadline(job.deadline ? job.deadline.slice(0, 10) : '');
    setRequiredSkills(job.requiredSkills.join(', '));
    setClientName(job.clientName ?? '');
    setClientId(job.clientId ?? '');
    setConsultantId(job.consultantId ?? '');
    setHeadcount(String(job.headcount));
    setFeeType(job.feeType ?? '');
    setFeeValue(job.feeValue != null ? String(job.feeValue) : '');
    setCountry(job.country ?? 'RW');
    setCategory(job.category ?? '');
    setWorkplaceType(job.workplaceType ?? 'ON_SITE');
    setSalaryText(job.salaryText ?? '');
    setResponsibilities(job.responsibilities.join('\n'));
    setExternalApplyEnabled(job.externalApplyEnabled);
    setExternalApplyUrl(job.externalApplyUrl ?? '');
    setShowForm(true);
  };

  const resetForm = () => {
    setTitle(''); setDepartment(''); setLocation(''); setDescription('');
    setQualifications(''); setSalaryMin(''); setSalaryMax(''); setDeadline('');
    setRequiredSkills(''); setClientName(''); setClientId(''); setConsultantId('');
    setHeadcount('1'); setFeeType(''); setFeeValue('');
    setPriority('STANDARD'); setType('FULL_TIME'); setStatus('OPEN');
    setCountry('RW'); setCategory(''); setWorkplaceType('ON_SITE');
    setSalaryText(''); setResponsibilities('');
    setExternalApplyEnabled(false); setExternalApplyUrl('');
    setShowAdvanced(false);
    setEditingId(null);
  };

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const skills = requiredSkills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const responsibilityLines = responsibilities
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        title: title.trim(),
        department: department.trim() || undefined,
        location: location.trim() || undefined,
        description: description.trim() || undefined,
        qualifications: qualifications.trim() || undefined,
        responsibilities: responsibilityLines.length > 0 ? responsibilityLines : undefined,
        country: country.trim() || undefined,
        category: category.trim() || undefined,
        workplaceType,
        salaryText: salaryText.trim() || undefined,
        externalApplyEnabled,
        externalApplyUrl: externalApplyEnabled ? externalApplyUrl.trim() || undefined : undefined,
        type,
        status,
        priority,
        salaryMin: salaryMin ? parseInt(salaryMin, 10) : undefined,
        salaryMax: salaryMax ? parseInt(salaryMax, 10) : undefined,
        currency: 'RWF',
        headcount: parseInt(headcount, 10) || 1,
        deadline: deadline || undefined,
        requiredSkills: skills.length > 0 ? skills : undefined,
        clientName: clientName.trim() || undefined,
        clientId: clientId.trim() || undefined,
        consultantId: consultantId.trim() || undefined,
        feeType: feeType || undefined,
        feeValue: feeValue ? parseFloat(feeValue) : undefined,
      };
      if (editingId) await updateJob(editingId, payload);
      else await createJob(payload);
      resetForm();
      setShowForm(false);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const displayed = jobs;

  return (
    <div className="rec-page">
      <div className="rec-page__header">
        <div>
          <h1 className="rec-page__title">Jobs</h1>
          <p className="rec-page__sub">{displayed.length} position{displayed.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="rec-page__actions">
          <select
            className="auth-input"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ width: 'auto', minWidth: 140 }}
          >
            <option value="">All statuses</option>
            {(Object.keys(STATUS_LABELS) as JobStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <select
            className="auth-input"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            style={{ width: 'auto', minWidth: 120 }}
          >
            <option value="">All priorities</option>
            <option value="STANDARD">Standard</option>
            <option value="URGENT">Urgent</option>
            <option value="EXECUTIVE">Executive</option>
          </select>
          <input
            className="auth-input"
            placeholder="Search title…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: 'auto', minWidth: 160 }}
          />
          <button type="button" className="btn btn--primary" onClick={() => { resetForm(); setShowForm((v) => !v); }}>
            {showForm ? 'Cancel' : '+ New job'}
          </button>
        </div>
      </div>

      {err && <div className="alert alert--err">{err}</div>}

      {showForm && (
        <div className="card rec-form-card">
          <h2 className="rec-form-card__title">{editingId ? 'Edit Job' : 'Create New Job'}</h2>
          <form className="rec-form" onSubmit={onSubmit}>
            <div className="rec-form__grid">
              <label className="rec-form__label">
                Job Title *
                <input
                  className="auth-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g., Senior Software Engineer"
                />
              </label>
              <label className="rec-form__label">
                Company *
                <input
                  className="auth-input"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                  placeholder="Company name"
                />
              </label>

              <label className="rec-form__label rec-form__label--full">
                Country / Market *
                <select className="auth-input" value={country} onChange={(e) => setCountry(e.target.value)} required>
                  <option value="RW">Rwanda</option>
                  <option value="KE">Kenya</option>
                  <option value="UG">Uganda</option>
                  <option value="TZ">Tanzania</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>

              <label className="rec-form__label">
                Category *
                <input
                  className="auth-input"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  placeholder="e.g., Information Technology"
                />
              </label>
              <label className="rec-form__label">
                Location *
                <input
                  className="auth-input"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                  placeholder="e.g., Kigali, Rwanda"
                />
              </label>

              <label className="rec-form__label">
                Employment Type *
                <select className="auth-input" value={type} onChange={(e) => setType(e.target.value as JobType)}>
                  {(Object.keys(JOB_TYPE_LABELS) as JobType[]).map((t) => (
                    <option key={t} value={t}>{JOB_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </label>
              <label className="rec-form__label">
                Workplace *
                <select className="auth-input" value={workplaceType} onChange={(e) => setWorkplaceType(e.target.value as WorkplaceType)}>
                  {(Object.keys(WORKPLACE_LABELS) as WorkplaceType[]).map((w) => (
                    <option key={w} value={w}>{WORKPLACE_LABELS[w]}</option>
                  ))}
                </select>
              </label>
              <label className="rec-form__label">
                Salary (optional)
                <input
                  className="auth-input"
                  value={salaryText}
                  onChange={(e) => setSalaryText(e.target.value)}
                  placeholder="e.g., Competitive"
                />
              </label>

              <label className="rec-form__label rec-form__label--full">
                Application Deadline *
                <input
                  className="auth-input"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  required
                />
              </label>

              <label className="rec-form__label rec-form__label--full">
                Job Summary / Description *
                <textarea
                  className="auth-input rec-textarea"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  placeholder="Describe the role, responsibilities, and what makes it exciting…"
                />
              </label>
              <label className="rec-form__label rec-form__label--full">
                Responsibilities (one per line)
                <textarea
                  className="auth-input rec-textarea"
                  rows={4}
                  value={responsibilities}
                  onChange={(e) => setResponsibilities(e.target.value)}
                  placeholder="List key responsibilities, one per line"
                />
              </label>
              <label className="rec-form__label rec-form__label--full">
                Requirements (one per line)
                <textarea
                  className="auth-input rec-textarea"
                  rows={4}
                  value={qualifications}
                  onChange={(e) => setQualifications(e.target.value)}
                  placeholder="List required qualifications, skills, and experience, one per line"
                />
              </label>
              <label className="rec-form__label rec-form__label--full">
                Keywords / Tags (comma-separated)
                <input
                  className="auth-input"
                  value={requiredSkills}
                  onChange={(e) => setRequiredSkills(e.target.value)}
                  placeholder="e.g., React, Node.js, Cloud, Leadership (separate with commas)"
                />
                <span className="muted small">Enter keywords or tags separated by commas. These will be used for search and filtering.</span>
              </label>

              <div className="rec-form__label--full rec-external-apply">
                <label className="rec-external-apply__toggle">
                  <input
                    type="checkbox"
                    checked={externalApplyEnabled}
                    onChange={(e) => setExternalApplyEnabled(e.target.checked)}
                  />
                  <span>
                    <strong>Applicants apply on an external website</strong>
                    <span className="muted small">
                      When enabled, "Apply" on the public job board opens your link (e.g. company careers page or ATS) instead of the HC Solutions application form.
                    </span>
                  </span>
                </label>
                {externalApplyEnabled && (
                  <input
                    className="auth-input"
                    style={{ marginTop: '0.6rem' }}
                    value={externalApplyUrl}
                    onChange={(e) => setExternalApplyUrl(e.target.value)}
                    placeholder="https://company.com/careers/apply"
                    type="url"
                  />
                )}
              </div>

              <button
                type="button"
                className="rec-form__label--full rec-advanced-toggle"
                onClick={() => setShowAdvanced((v) => !v)}
              >
                {showAdvanced ? '– Hide advanced options' : '+ Advanced options (department, headcount, fees, priority…)'}
              </button>

              {showAdvanced && (
                <>
                  <label className="rec-form__label">
                    Department
                    <input className="auth-input" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Finance" />
                  </label>
                  <label className="rec-form__label">
                    Headcount
                    <input className="auth-input" type="number" min="1" value={headcount} onChange={(e) => setHeadcount(e.target.value)} />
                  </label>
                  <label className="rec-form__label">
                    Priority
                    <select className="auth-input" value={priority} onChange={(e) => setPriority(e.target.value as JobPriority)}>
                      <option value="STANDARD">Standard</option>
                      <option value="URGENT">Urgent</option>
                      <option value="EXECUTIVE">Executive</option>
                    </select>
                  </label>
                  <label className="rec-form__label">
                    Status
                    <select className="auth-input" value={status} onChange={(e) => setStatus(e.target.value as JobStatus)}>
                      <option value="DRAFT">Draft</option>
                      <option value="OPEN">Open (publish now)</option>
                    </select>
                  </label>
                  <label className="rec-form__label">
                    Client ID
                    <input className="auth-input" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="UUID" />
                  </label>
                  <label className="rec-form__label">
                    Consultant ID
                    <input className="auth-input" value={consultantId} onChange={(e) => setConsultantId(e.target.value)} placeholder="UUID" />
                  </label>
                  <label className="rec-form__label">
                    Min salary (RWF, structured)
                    <input className="auth-input" type="number" min="0" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} placeholder="e.g. 300000" />
                  </label>
                  <label className="rec-form__label">
                    Max salary (RWF, structured)
                    <input className="auth-input" type="number" min="0" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} placeholder="e.g. 600000" />
                  </label>
                  <label className="rec-form__label">
                    Fee type
                    <select className="auth-input" value={feeType} onChange={(e) => setFeeType(e.target.value as FeeType | '')}>
                      <option value="">— select —</option>
                      <option value="PERCENTAGE">% of annual salary</option>
                      <option value="FLAT_FEE">Flat fee</option>
                      <option value="MONTHLY_RETAINER">Monthly retainer</option>
                    </select>
                  </label>
                  <label className="rec-form__label">
                    Fee value
                    <input
                      className="auth-input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={feeValue}
                      onChange={(e) => setFeeValue(e.target.value)}
                      placeholder={feeType === 'PERCENTAGE' ? 'e.g. 15' : 'e.g. 500000'}
                      disabled={!feeType}
                    />
                  </label>
                </>
              )}
            </div>
            <div className="rec-form__actions">
              <button className="btn btn--ghost" type="button" onClick={() => { setShowForm(false); resetForm(); }}>
                Cancel
              </button>
              <button className="btn btn--primary" type="submit" disabled={busy || !title.trim()}>
                {busy ? 'Saving…' : editingId ? 'Save changes' : 'Create Job'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && <p className="muted">Loading jobs…</p>}

      {!loading && displayed.length === 0 && (
        <div className="rec-empty">
          <p>No jobs yet. Create your first job order above.</p>
        </div>
      )}

      {!loading && displayed.length > 0 && (
        <div className="rec-jobs-list">
          {displayed.map((job) => (
            <div key={job.id} className="rec-job-card">
              <div className="rec-job-card__top">
                <div>
                  <div className="rec-job-card__title">{job.title}</div>
                  <div className="rec-job-card__meta">
                    {job.clientName && <span className="muted">{job.clientName}</span>}
                    {job.department && <span>· {job.department}</span>}
                    {job.location && <span>· {job.location}</span>}
                    <span>· {JOB_TYPE_LABELS[job.type]}</span>
                  </div>
                </div>
                <div className="rec-job-card__badges">
                  <span className={PRIORITY_CLASS[job.priority]}>{job.priority}</span>
                  <span className={STATUS_CLASS[job.status]}>{STATUS_LABELS[job.status]}</span>
                </div>
              </div>
              {job.requiredSkills.length > 0 && (
                <div className="rec-job-card__skills">
                  {job.requiredSkills.slice(0, 4).map((s) => (
                    <span key={s} className="tag">{s}</span>
                  ))}
                  {job.requiredSkills.length > 4 && (
                    <span className="muted small">+{job.requiredSkills.length - 4} more</span>
                  )}
                </div>
              )}
              {(job.salaryMin || job.salaryMax || job.deadline) && (
                <div className="rec-job-card__details">
                  {(job.salaryMin || job.salaryMax) && (
                    <span>
                      {job.salaryMin && job.salaryMax
                        ? `${job.salaryMin.toLocaleString()} – ${job.salaryMax.toLocaleString()} ${job.currency}`
                        : job.salaryMin
                          ? `From ${job.salaryMin.toLocaleString()} ${job.currency}`
                          : `Up to ${job.salaryMax!.toLocaleString()} ${job.currency}`}
                    </span>
                  )}
                  {job.deadline && (
                    <span>Deadline: {new Date(job.deadline).toLocaleDateString()}</span>
                  )}
                </div>
              )}
              <div className="rec-job-card__actions">
                <Link to={`/recruitment/jobs/${job.id}`} className="btn btn--primary small">
                  Pipeline
                </Link>
                <div className="rec-job-card__actions-end">
                  <span className="muted small">Headcount: {job.headcount}</span>
                  <button type="button" className="btn btn--ghost small" onClick={() => startEdit(job)}>
                    Edit
                  </button>
                  {job.status === 'DRAFT' && (
                    <button
                      type="button"
                      className="btn btn--ghost small"
                      onClick={async () => {
                        if (!confirm('Delete this draft job?')) return;
                        await deleteJob(job.id);
                        await load();
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
