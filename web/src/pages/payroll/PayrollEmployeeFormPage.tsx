import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createEmployee,
  fetchEmployee,
  fetchPayrollConfig,
  updateEmployee,
} from '../../payrollApi';
import { parseApiError } from '../../lib/parseApiError';
import {
  formatRwf,
  pctLabel,
  previewRwandaPayroll,
  RWANDA_PAYROLL_DEFAULTS,
  type RwandaPayrollConfig,
} from '../../lib/rwandaPayrollPreview';
import './payroll-employee-form.css';

const EMPLOYEE_TYPES = [
  { value: 'OUTSOURCED', label: 'Outsourced' },
  { value: 'INTERNAL', label: 'Internal' },
  { value: 'SECONDED', label: 'Seconded' },
];

const GENDERS = [
  { value: '', label: 'Select gender…' },
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other / Prefer not to say' },
];

const NATIONALITIES = [
  { value: '', label: 'Select nationality…' },
  { value: 'Rwandan', label: 'Rwandan' },
  { value: 'Burundian', label: 'Burundian' },
  { value: 'Congolese', label: 'Congolese (DRC)' },
  { value: 'Kenyan', label: 'Kenyan' },
  { value: 'Ugandan', label: 'Ugandan' },
  { value: 'Tanzanian', label: 'Tanzanian' },
  { value: 'Other', label: 'Other' },
];

type Form = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  employeeType: string;
  clientId: string;
  jobTitle: string;
  department: string;
  location: string;
  startDate: string;
  probationEndDate: string;
  basicSalary: string;
  housingAllowance: string;
  transportAllowance: string;
  otherAllowances: string;
  nationalId: string;
  rssbNumber: string;
  bankAccount: string;
  bankName: string;
  bankBranch: string;
  gender: string;
  nationality: string;
  dateOfBirth: string;
  includeRama: boolean;
};

const DEFAULT_FORM: Form = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  employeeType: 'OUTSOURCED',
  clientId: '',
  jobTitle: '',
  department: '',
  location: '',
  startDate: '',
  probationEndDate: '',
  basicSalary: '0',
  housingAllowance: '0',
  transportAllowance: '0',
  otherAllowances: '0',
  nationalId: '',
  rssbNumber: '',
  bankAccount: '',
  bankName: '',
  bankBranch: '',
  gender: '',
  nationality: '',
  dateOfBirth: '',
  includeRama: true,
};

function num(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function configFromApi(data: Record<string, unknown>): RwandaPayrollConfig {
  return {
    payeEnabled: Boolean(data.payeEnabled ?? RWANDA_PAYROLL_DEFAULTS.payeEnabled),
    rssbPensionEmployee: Number(data.rssbPensionEmployee ?? RWANDA_PAYROLL_DEFAULTS.rssbPensionEmployee),
    rssbPensionEmployer: Number(data.rssbPensionEmployer ?? RWANDA_PAYROLL_DEFAULTS.rssbPensionEmployer),
    rssbMedical: Number(data.rssbMedical ?? RWANDA_PAYROLL_DEFAULTS.rssbMedical),
    cbhiRate: Number(data.cbhiRate ?? RWANDA_PAYROLL_DEFAULTS.cbhiRate),
    maternityLevy: Number(data.maternityLevy ?? RWANDA_PAYROLL_DEFAULTS.maternityLevy),
    occupationalHazardRate: Number(
      data.occupationalHazardRate ?? RWANDA_PAYROLL_DEFAULTS.occupationalHazardRate,
    ),
  };
}

export function PayrollEmployeeFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<Form>(DEFAULT_FORM);
  const [payrollConfig, setPayrollConfig] = useState<RwandaPayrollConfig>(RWANDA_PAYROLL_DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validated, setValidated] = useState(false);
  const [validateMsg, setValidateMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchEmployee(id).then((employee: Record<string, unknown>) => {
      setForm((prev) => ({
        ...prev,
        firstName: String(employee.firstName ?? ''),
        lastName: String(employee.lastName ?? ''),
        email: String(employee.email ?? ''),
        phone: String(employee.phone ?? ''),
        employeeType: String(employee.employeeType ?? 'OUTSOURCED'),
        clientId: String(employee.clientId ?? ''),
        jobTitle: String(employee.jobTitle ?? ''),
        department: String(employee.department ?? ''),
        location: String(employee.location ?? ''),
        startDate: employee.startDate ? String(employee.startDate).slice(0, 10) : '',
        probationEndDate: employee.probationEndDate ? String(employee.probationEndDate).slice(0, 10) : '',
        basicSalary: String(employee.basicSalary ?? '0'),
        housingAllowance: String(employee.housingAllowance ?? '0'),
        transportAllowance: String(employee.transportAllowance ?? '0'),
        otherAllowances: String(employee.otherAllowances ?? '0'),
        gender: String(employee.gender ?? ''),
        nationality: String(employee.nationality ?? ''),
        dateOfBirth: employee.dateOfBirth ? String(employee.dateOfBirth).slice(0, 10) : '',
        rssbNumber: String(employee.rssbNumber ?? ''),
        includeRama: employee.ramaEnabled !== false,
      }));
    });
  }, [id]);

  useEffect(() => {
    const client = form.clientId.trim();
    if (!client) {
      setPayrollConfig(RWANDA_PAYROLL_DEFAULTS);
      return;
    }
    let cancelled = false;
    fetchPayrollConfig(client)
      .then((data) => {
        if (!cancelled) setPayrollConfig(configFromApi(data as Record<string, unknown>));
      })
      .catch(() => {
        if (!cancelled) setPayrollConfig(RWANDA_PAYROLL_DEFAULTS);
      });
    return () => {
      cancelled = true;
    };
  }, [form.clientId]);

  const set =
    (key: keyof Form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const t = e.target;
      const value = t.type === 'checkbox' ? (t as HTMLInputElement).checked : t.value;
      setForm((prev) => ({ ...prev, [key]: value }));
      setValidated(false);
      setValidateMsg(null);
    };

  const calc = useMemo(
    () =>
      previewRwandaPayroll(
        {
          basicSalary: num(form.basicSalary),
          housingAllowance: num(form.housingAllowance),
          transportAllowance: num(form.transportAllowance),
          otherAllowances: num(form.otherAllowances),
          includeRama: form.includeRama,
        },
        payrollConfig,
      ),
    [form.basicSalary, form.housingAllowance, form.transportAllowance, form.otherAllowances, form.includeRama, payrollConfig],
  );

  const onValidate = () => {
    const issues: string[] = [];
    if (!form.firstName.trim() || !form.lastName.trim()) issues.push('Enter employee name.');
    if (!form.email.trim()) issues.push('Enter work email.');
    if (!form.jobTitle.trim()) issues.push('Enter job title.');
    if (!form.startDate) issues.push('Enter start date.');
    if (calc.grossPay <= 0) issues.push('Gross salary must be greater than zero.');
    if (issues.length) {
      setValidated(false);
      setValidateMsg(issues.join(' '));
      return;
    }
    setValidated(true);
    setValidateMsg('Calculations look valid for Rwanda statutory rates (preview). Save to create the employee record.');
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const issues: string[] = [];
    if (!form.firstName.trim() || !form.lastName.trim()) issues.push('Enter employee name.');
    if (!form.email.trim()) issues.push('Enter work email.');
    if (!form.jobTitle.trim()) issues.push('Enter job title.');
    if (!form.startDate) issues.push('Enter start date.');
    if (calc.grossPay <= 0) issues.push('Gross salary must be greater than zero.');
    if (issues.length) {
      setValidated(false);
      setValidateMsg(issues.join(' '));
      return;
    }
    setValidated(true);
    setValidateMsg('Saving employee and salary structure…');
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        employeeType: form.employeeType,
        clientId: form.clientId,
        jobTitle: form.jobTitle,
        department: form.department,
        location: form.location,
        startDate: form.startDate,
        probationEndDate: form.probationEndDate,
        basicSalary: num(form.basicSalary),
        housingAllowance: num(form.housingAllowance),
        transportAllowance: num(form.transportAllowance),
        otherAllowances: num(form.otherAllowances),
        nationalId: form.nationalId,
        bankAccount: form.bankAccount,
        bankName: form.bankName,
        bankBranch: form.bankBranch,
        gender: form.gender,
        nationality: form.nationality,
        dateOfBirth: form.dateOfBirth,
        rssbNumber: form.rssbNumber.trim() || undefined,
        ramaEnabled: form.includeRama,
      };
      for (const key of ['dateOfBirth', 'probationEndDate', 'gender', 'nationality', 'clientId', 'phone'] as const) {
        if (payload[key] === '') delete payload[key];
      }
      if (!payload.nationalId) delete payload.nationalId;
      if (!payload.bankAccount) delete payload.bankAccount;
      const result = id ? await updateEmployee(id, payload) : await createEmployee(payload as never);
      navigate(`/payroll/employees/${(result as { id: string }).id}`);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  const penEmp = pctLabel(payrollConfig.rssbPensionEmployee);
  const penEr = pctLabel(payrollConfig.rssbPensionEmployer);
  const med = pctLabel(payrollConfig.rssbMedical);
  const cbhi = pctLabel(payrollConfig.cbhiRate);
  const mat = pctLabel(payrollConfig.maternityLevy);
  const haz = pctLabel(payrollConfig.occupationalHazardRate);

  return (
    <div className="rec-page pef-page">
      <h1 className="pef-page__title">Employee form</h1>
      {id ? <p className="muted small" style={{ marginTop: '-0.75rem', marginBottom: '1rem' }}>Editing existing record</p> : null}

      {error && <div className="alert alert--err">{error}</div>}

      <form className="rec-form" onSubmit={onSubmit}>
        <section className="pef-segment" aria-labelledby="pef-seg-01">
          <div className="pef-segment__head">
            <h2 id="pef-seg-01" className="pef-segment__label">
              Segment 01 — Personal information
            </h2>
          </div>
          <div className="rec-form__grid">
            <label className="rec-form__label">
              First name <span className="rec-form__req">*</span>
              <input className="auth-input" type="text" required value={form.firstName} onChange={set('firstName')} placeholder="Jane" />
            </label>
            <label className="rec-form__label">
              Last name <span className="rec-form__req">*</span>
              <input className="auth-input" type="text" required value={form.lastName} onChange={set('lastName')} placeholder="Uwera" />
            </label>
            <label className="rec-form__label">
              Email <span className="rec-form__req">*</span>
              <input className="auth-input" type="email" required value={form.email} onChange={set('email')} placeholder="jane@example.rw" />
              <small className="rec-form__hint">Must match the email used for self-service login.</small>
            </label>
            <label className="rec-form__label">
              Phone
              <input className="auth-input" type="tel" value={form.phone} onChange={set('phone')} placeholder="+250 7xx xxx xxx" />
            </label>
            <label className="rec-form__label">
              Date of birth
              <input className="auth-input" type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
            </label>
            <label className="rec-form__label">
              Gender
              <select className="auth-input" value={form.gender} onChange={set('gender')}>
                {GENDERS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="rec-form__label">
              Nationality
              <select className="auth-input" value={form.nationality} onChange={set('nationality')}>
                {NATIONALITIES.map((n) => (
                  <option key={n.value} value={n.value}>
                    {n.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="rec-form__label">
              National ID <small className="rec-form__hint">(encrypted at rest)</small>
              <input className="auth-input" type="text" value={form.nationalId} onChange={set('nationalId')} placeholder="e.g. 1 1990 012345678 0 12" />
            </label>
          </div>
        </section>

        <section className="pef-segment" aria-labelledby="pef-seg-02">
          <div className="pef-segment__head">
            <h2 id="pef-seg-02" className="pef-segment__label">
              Segment 02 — Employment &amp; statutory
            </h2>
          </div>
          <div className="rec-form__grid">
            <label className="rec-form__label">
              Employee type <span className="rec-form__req">*</span>
              <select className="auth-input" required value={form.employeeType} onChange={set('employeeType')}>
                {EMPLOYEE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="rec-form__label">
              Client ID
              <input className="auth-input" type="text" value={form.clientId} onChange={set('clientId')} placeholder="default" />
              <small className="rec-form__hint">Loads payroll rates from client config when set.</small>
            </label>
            <label className="rec-form__label">
              Job title <span className="rec-form__req">*</span>
              <input className="auth-input" type="text" required value={form.jobTitle} onChange={set('jobTitle')} placeholder="Finance Officer" />
            </label>
            <label className="rec-form__label">
              Department
              <input className="auth-input" type="text" value={form.department} onChange={set('department')} placeholder="Finance" />
            </label>
            <label className="rec-form__label">
              Location
              <input className="auth-input" type="text" value={form.location} onChange={set('location')} placeholder="Kigali HQ" />
            </label>
            <label className="rec-form__label">
              Start date <span className="rec-form__req">*</span>
              <input className="auth-input" type="date" required value={form.startDate} onChange={set('startDate')} />
            </label>
            <label className="rec-form__label">
              Probation end date
              <input className="auth-input" type="date" value={form.probationEndDate} onChange={set('probationEndDate')} />
            </label>
            <label className="rec-form__label">
              RSSB number <span className="muted">(optional)</span>
              <input className="auth-input" type="text" value={form.rssbNumber} onChange={set('rssbNumber')} placeholder="e.g. 20655128" />
              <small className="rec-form__hint">
                For filing exports only. Many staff do not have a number yet — PAYE, RSSB pension, CBHI, and employer
                levies in segment 04 still apply from gross salary.
              </small>
            </label>
          </div>
          <label className="pef-statutory">
            <input type="checkbox" checked={form.includeRama} onChange={set('includeRama')} />
            Include RAMA / RSSB medical ({med}) — uncheck only if HR confirmed this employee is exempt; pension and PAYE
            still apply
          </label>
        </section>

        <section className="pef-segment" aria-labelledby="pef-seg-03">
          <div className="pef-segment__head">
            <h2 id="pef-seg-03" className="pef-segment__label">
              Segment 03 — Salary &amp; bank (RWF)
            </h2>
          </div>
          <div className="rec-form__grid">
            <label className="rec-form__label">
              Basic salary
              <input className="auth-input" type="number" min="0" step="1000" value={form.basicSalary} onChange={set('basicSalary')} />
            </label>
            <label className="rec-form__label">
              Housing allowance
              <input className="auth-input" type="number" min="0" step="1000" value={form.housingAllowance} onChange={set('housingAllowance')} />
            </label>
            <label className="rec-form__label">
              Transport allowance
              <input className="auth-input" type="number" min="0" step="1000" value={form.transportAllowance} onChange={set('transportAllowance')} />
            </label>
            <label className="rec-form__label">
              Other allowances
              <input className="auth-input" type="number" min="0" step="1000" value={form.otherAllowances} onChange={set('otherAllowances')} />
            </label>
            <label className="rec-form__label">
              Bank name
              <input className="auth-input" type="text" value={form.bankName} onChange={set('bankName')} placeholder="Bank of Kigali" />
            </label>
            <label className="rec-form__label">
              Bank branch
              <input className="auth-input" type="text" value={form.bankBranch} onChange={set('bankBranch')} placeholder="Kigali City" />
            </label>
            <label className="rec-form__label rec-form__label--full">
              Account number <small className="rec-form__hint">(encrypted at rest)</small>
              <input className="auth-input" type="text" value={form.bankAccount} onChange={set('bankAccount')} placeholder="000-XXXXXXXXX-00" />
            </label>
          </div>
        </section>

        <section className="pef-segment" aria-labelledby="pef-seg-04">
          <div className="pef-segment__head">
            <h2 id="pef-seg-04" className="pef-segment__label">
              Segment 04 — Calculated results
            </h2>
            <div className="pef-segment__actions">
              <button type="button" className="btn btn--primary btn--sm" onClick={onValidate}>
                Validate calculations
              </button>
              <button className="btn btn--primary btn--sm" type="submit" disabled={loading} style={{ background: 'var(--success, #059669)' }}>
                {loading ? 'Saving…' : id ? 'Save employee' : 'Create salary'}
              </button>
            </div>
          </div>

          <p className="pef-calc-notice muted small">
            Rwanda statutory amounts below are based on salary and tenant payroll settings, not on whether an RSSB membership
            number is on file.
          </p>

          {validateMsg && (
            <p className={validated ? 'pef-validated' : 'alert alert--err'} role="status" style={validated ? undefined : { marginBottom: '0.75rem' }}>
              {validateMsg}
            </p>
          )}

          <div className="pef-calc-grid">
            <div className="pef-calc-card">
              <p className="pef-calc-card__value">{formatRwf(calc.grossPay)}</p>
              <h3 className="pef-calc-card__title">Gross salary</h3>
              <p className="pef-calc-card__hint">Basic + allowances</p>
            </div>
            <div className="pef-calc-card">
              <p className="pef-calc-card__value">{formatRwf(calc.paye)}</p>
              <h3 className="pef-calc-card__title">PAYE tax</h3>
              <p className="pef-calc-card__hint">Progressive tax (0–30%)</p>
            </div>
            <div className="pef-calc-card">
              <p className="pef-calc-card__value">{formatRwf(calc.netPay)}</p>
              <h3 className="pef-calc-card__title">Net salary</h3>
              <p className="pef-calc-card__hint">After all deductions</p>
            </div>
            <div className="pef-calc-card">
              <p className="pef-calc-card__value">{formatRwf(calc.netPaidToBank)}</p>
              <h3 className="pef-calc-card__title">Net paid to bank</h3>
              <p className="pef-calc-card__hint">Transfer to employee account</p>
            </div>
            <div className="pef-calc-card">
              <h3 className="pef-calc-card__title">Employee deductions</h3>
              <ul className="pef-calc-lines">
                <li>
                  <span>RSSB pension ({penEmp})</span>
                  <span>{formatRwf(calc.rssbEmployee)}</span>
                </li>
                {form.includeRama ? (
                  <li>
                    <span>RAMA insurance ({med})</span>
                    <span>{formatRwf(calc.rssbMedicalEmployee)}</span>
                  </li>
                ) : null}
                <li>
                  <span>CBHI ({cbhi})</span>
                  <span>{formatRwf(calc.cbhi)}</span>
                </li>
              </ul>
            </div>
            <div className="pef-calc-card">
              <h3 className="pef-calc-card__title">Employer contributions</h3>
              <ul className="pef-calc-lines">
                <li>
                  <span>RSSB pension ({penEr})</span>
                  <span>{formatRwf(calc.rssbEmployer)}</span>
                </li>
                <li>
                  <span>RSSB maternity ({mat})</span>
                  <span>{formatRwf(calc.maternityLevy)}</span>
                </li>
                {form.includeRama ? (
                  <li>
                    <span>RAMA insurance ({med})</span>
                    <span>{formatRwf(calc.rssbMedicalEmployer)}</span>
                  </li>
                ) : null}
                <li>
                  <span>Occupational hazard ({haz})</span>
                  <span>{formatRwf(calc.occupationalHazard)}</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <div className="rec-form__actions">
          <button type="button" className="btn" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
