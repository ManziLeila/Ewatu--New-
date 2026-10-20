import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  createContract,
  fetchContracts,
  fetchEmployee,
  fetchEmployeePayslips,
  terminateEmployee,
  uploadContractFile,
  type Employee,
} from '../../payrollApi';

const CONTRACT_TYPES = ['PERMANENT', 'FIXED_TERM', 'SECONDMENT'] as const;

const INIT_CONTRACT = {
  contractType: 'PERMANENT' as (typeof CONTRACT_TYPES)[number],
  startDate: '',
  endDate: '',
  salary: '',
  currency: 'RWF',
};

export function PayrollEmployeeDetailPage() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<any[]>([]);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [tab, setTab] = useState<'profile' | 'contracts' | 'payslips'>('profile');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showContractForm, setShowContractForm] = useState(false);
  const [contractForm, setContractForm] = useState(INIT_CONTRACT);
  const [busy, setBusy] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    setErr(null);
    try {
      const [emp, contractData, payslipData] = await Promise.all([
        fetchEmployee(employeeId),
        fetchContracts(employeeId),
        fetchEmployeePayslips(employeeId),
      ]);
      setEmployee(emp);
      setContracts(Array.isArray(contractData) ? contractData : (contractData as any)?.items ?? []);
      setPayslips(Array.isArray(payslipData) ? payslipData : (payslipData as any)?.items ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    load();
  }, [load]);

  const onCreateContract = async (e: FormEvent) => {
    e.preventDefault();
    if (!employeeId) return;
    setBusy(true);
    setErr(null);
    try {
      await createContract(employeeId, {
        contractType: contractForm.contractType,
        startDate: contractForm.startDate,
        endDate: contractForm.endDate || undefined,
        salary: Number(contractForm.salary),
        currency: contractForm.currency,
      });
      setShowContractForm(false);
      setContractForm(INIT_CONTRACT);
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : String(ex));
    } finally {
      setBusy(false);
    }
  };

  const onUploadContract = async (contractId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,.pdf';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setBusy(true);
      setUploadMsg(null);
      setErr(null);
      try {
        const { uploadUrl } = (await uploadContractFile(contractId, file.type || 'application/pdf', file.size)) as {
          uploadUrl: string;
          objectKey: string;
        };
        const putRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type || 'application/pdf' },
          body: file,
        });
        if (!putRes.ok) throw new Error('Failed to upload file to storage');
        setUploadMsg('Contract PDF uploaded successfully.');
        await load();
      } catch (ex) {
        setErr(ex instanceof Error ? ex.message : String(ex));
      } finally {
        setBusy(false);
      }
    };
    input.click();
  };

  if (loading) return <div className="rec-page"><p className="muted">Loading employee…</p></div>;
  if (!employee) return <div className="rec-page"><p className="alert alert--err">{err ?? 'Employee not found'}</p></div>;

  return (
    <div className="rec-page">
      <div className="rec-page__header">
        <div>
          <p className="muted small"><Link to="/payroll/employees">Employees</Link> / {employee.firstName} {employee.lastName}</p>
          <h1 className="rec-page__title">{employee.firstName} {employee.lastName}</h1>
          <p className="rec-page__sub">{(employee as any).employmentStatus ?? (employee as any).status}</p>
        </div>
        <div className="rec-page__actions">
          <button className="btn btn--ghost" onClick={() => navigate(`/payroll/employees/${employee.id}/edit`)}>Edit</button>
          <button className="btn btn--danger" onClick={async () => {
            if (!confirm('Terminate this employee?')) return;
            await terminateEmployee(employee.id);
            await load();
          }}>Terminate</button>
        </div>
      </div>

      {err && <div className="alert alert--err">{err}</div>}
      {uploadMsg && <div className="alert alert--ok">{uploadMsg}</div>}

      <div className="rec-page__actions" style={{ marginBottom: '0.75rem' }}>
        <button className={`btn ${tab === 'profile' ? 'btn--primary' : 'btn--ghost'}`} onClick={() => setTab('profile')}>Profile</button>
        <button className={`btn ${tab === 'contracts' ? 'btn--primary' : 'btn--ghost'}`} onClick={() => setTab('contracts')}>Contracts</button>
        <button className={`btn ${tab === 'payslips' ? 'btn--primary' : 'btn--ghost'}`} onClick={() => setTab('payslips')}>Payslips</button>
      </div>

      {tab === 'profile' && (
        <div className="card">
          <h2 className="rec-form-card__title">Personal Info</h2>
          <p>Email: {(employee as any).email ?? '-'}</p>
          <p>Phone: {(employee as any).phone ?? '-'}</p>
          <p>Date of birth: {(employee as any).dateOfBirth?.slice(0, 10) ?? '-'}</p>
          <p>Gender: {(employee as any).gender ?? '-'}</p>
          <p>Nationality: {(employee as any).nationality ?? '-'}</p>
          <h3>Job Info</h3>
          <p>Department: {(employee as any).department ?? '-'}</p>
          <p>Job title: {(employee as any).jobTitle ?? '-'}</p>
          <p>Employee type: {(employee as any).employeeType ?? '-'}</p>
          <p>Start date: {(employee as any).startDate?.slice(0, 10) ?? '-'}</p>
          <p>End date: {(employee as any).endDate?.slice(0, 10) ?? '-'}</p>
          <p>Status: {(employee as any).employmentStatus ?? '-'}</p>
          <p>
            RSSB number: {(employee as any).rssbNumber ?? 'Not on file'}{' '}
            {!((employee as any).rssbNumber) ? (
              <span className="muted small">(optional — payroll still uses Rwanda statutory rates from salary)</span>
            ) : null}
          </p>
          <p>RAMA insurance: {(employee as any).ramaEnabled === false ? 'Excluded' : 'Included'}</p>
          <h3>Salary</h3>
          <p>Basic salary: {(employee as any).basicSalary ?? '-'}</p>
          <p>Housing allowance: {(employee as any).housingAllowance ?? '-'}</p>
          <p>Transport allowance: {(employee as any).transportAllowance ?? '-'}</p>
          <p>Other allowances: {(employee as any).otherAllowances ?? '-'}</p>
        </div>
      )}

      {tab === 'contracts' && (
        <div className="card">
          <div className="rec-page__header" style={{ marginBottom: '1rem' }}>
            <h2 className="rec-form-card__title" style={{ margin: 0 }}>Contracts</h2>
            <button className="btn btn--primary" onClick={() => setShowContractForm((v) => !v)}>
              {showContractForm ? 'Cancel' : '+ Add Contract'}
            </button>
          </div>

          {showContractForm && (
            <form className="rec-form" onSubmit={onCreateContract} style={{ marginBottom: '1.25rem' }}>
              <div className="rec-form__grid">
                <label className="rec-form__label">
                  Contract type
                  <select
                    className="auth-input"
                    value={contractForm.contractType}
                    onChange={(e) => setContractForm((p) => ({ ...p, contractType: e.target.value as typeof contractForm.contractType }))}
                  >
                    {CONTRACT_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                  </select>
                </label>
                <label className="rec-form__label">
                  Start date <span className="rec-form__req">*</span>
                  <input className="auth-input" type="date" required value={contractForm.startDate} onChange={(e) => setContractForm((p) => ({ ...p, startDate: e.target.value }))} />
                </label>
                <label className="rec-form__label">
                  End date {contractForm.contractType === 'PERMANENT' ? '(optional)' : ''}
                  <input className="auth-input" type="date" value={contractForm.endDate} onChange={(e) => setContractForm((p) => ({ ...p, endDate: e.target.value }))} />
                </label>
                <label className="rec-form__label">
                  Salary (RWF) <span className="rec-form__req">*</span>
                  <input className="auth-input" type="number" min={0} required value={contractForm.salary} onChange={(e) => setContractForm((p) => ({ ...p, salary: e.target.value }))} />
                </label>
                <label className="rec-form__label">
                  Currency
                  <input className="auth-input" value={contractForm.currency} onChange={(e) => setContractForm((p) => ({ ...p, currency: e.target.value }))} />
                </label>
              </div>
              <div className="rec-form__actions">
                <button className="btn btn--primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Create contract'}</button>
              </div>
            </form>
          )}

          <div className="rec-table-wrap">
          <table className="rec-table">
            <thead><tr><th>Type</th><th>Start</th><th>End</th><th>Salary</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {contracts.length === 0 && (
                <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: '1.5rem' }}>No contracts yet</td></tr>
              )}
              {contracts.map((contract) => (
                <tr key={contract.id}>
                  <td>{contract.contractType}</td>
                  <td>{contract.startDate?.slice(0, 10)}</td>
                  <td>{contract.endDate?.slice(0, 10) ?? '-'}</td>
                  <td>{contract.salary}</td>
                  <td>{contract.status}</td>
                  <td>
                    <button className="btn btn--ghost small" disabled={busy} onClick={() => onUploadContract(contract.id)}>
                      Upload Contract PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {tab === 'payslips' && (
        <div className="card">
          <h2 className="rec-form-card__title">Payslips</h2>
          <ul>
            {payslips.map((p) => (
              <li key={p.id ?? p.periodId}>
                {p.periodMonth}/{p.periodYear} — {p.netPay}{' '}
                {p.downloadUrl && (
                  <a className="btn btn--ghost small" href={p.downloadUrl} target="_blank" rel="noreferrer">Download PDF</a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
