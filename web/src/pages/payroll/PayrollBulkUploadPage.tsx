import { type FormEvent, useEffect, useRef, useState } from 'react';
import { fetchMe } from '../../api';
import { bulkImportEmployees, type EmployeeBulkImportResult, type EmployeeBulkImportRow } from '../../payrollApi';
import { parseApiError } from '../../lib/parseApiError';
import { PayrollPageShell } from './PayrollPageShell';

type CsvRow = EmployeeBulkImportRow;

const REQUIRED_COLUMNS = ['firstName', 'lastName', 'email', 'jobTitle', 'startDate'];
const OPTIONAL_COLUMNS = ['phone', 'department', 'clientId', 'basicSalary', 'rssbNumber', 'ramaEnabled'];

function parseCsv(text: string): { rows: CsvRow[]; skippedLines: number } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { rows: [], skippedLines: 0 };

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows: CsvRow[] = [];
  let skippedLines = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = cols[idx] ?? '';
    });

    if (!obj.firstName || !obj.lastName || !obj.email || !obj.jobTitle || !obj.startDate) {
      skippedLines++;
      continue;
    }

    rows.push({
      firstName: obj.firstName,
      lastName: obj.lastName,
      email: obj.email,
      jobTitle: obj.jobTitle,
      startDate: obj.startDate,
      phone: obj.phone || undefined,
      department: obj.department || undefined,
      clientId: obj.clientId || undefined,
      basicSalary: obj.basicSalary ? Number(obj.basicSalary) : undefined,
      rssbNumber: obj.rssbNumber || undefined,
      ramaEnabled:
        obj.ramaEnabled === 'false' || obj.ramaEnabled === '0' ? false : obj.ramaEnabled ? true : undefined,
    });
  }

  return { rows, skippedLines };
}

function downloadTemplate() {
  const header = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS].join(',');
  const sample =
    'Jane,Uwase,jane.uwase@example.com,HR Officer,2026-01-15,0788123456,Human Resources,,350000,20655128,true';
  const blob = new Blob([`${header}\n${sample}\n`], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'employee-bulk-upload-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function PayrollBulkUploadPage() {
  const [email, setEmail] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [payPeriod, setPayPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [frequency, setFrequency] = useState('MONTHLY');
  const [includeRama, setIncludeRama] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CsvRow[] | null>(null);
  const [skippedLines, setSkippedLines] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<EmployeeBulkImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMe()
      .then((me) => {
        setEmail(me.email ?? '');
        setRoles(me.roles);
      })
      .catch(() => {});
  }, []);

  const onFileSelected = async (f: File | null) => {
    setFile(f);
    setResult(null);
    setErr(null);
    setPreview(null);
    if (!f) return;
    try {
      const text = await f.text();
      const { rows, skippedLines: skipped } = parseCsv(text);
      setSkippedLines(skipped);
      if (rows.length === 0) {
        setErr('No valid rows found. Use the template columns: firstName, lastName, email, jobTitle, startDate.');
        return;
      }
      setPreview(rows);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  const onImport = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!preview || preview.length === 0) return;
    setBusy(true);
    setErr(null);
    try {
      const rows = preview.map((row) => ({
        ...row,
        ramaEnabled: row.ramaEnabled ?? includeRama,
      }));
      const res = await bulkImportEmployees(rows);
      setResult(res);
      setPreview(null);
    } catch (e) {
      setErr(parseApiError(e).message);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setErr(null);
    setSkippedLines(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <PayrollPageShell pageTitle="Bulk employee upload" breadcrumb="Bulk operations" email={email} roles={roles}>
      <p className="payroll-bulk-lead">
        <span className="payroll-bulk-lead__tag">Bulk operations</span>
        Upload multiple salaries
      </p>
      <p className="payroll-bulk-intro">
        Upload a spreadsheet with employee salary data to process multiple salaries at once. After HR and MD approve
        the payroll period, finance or the managing director can send payslip emails from{' '}
        <strong>Payroll periods</strong> or the <strong>approval dashboard</strong>.
      </p>

      {err && (
        <div className="payroll-finance-banner payroll-finance-banner--err" role="alert">
          <p>{err}</p>
        </div>
      )}

      <section className="payroll-finance-card payroll-bulk-step">
        <h2 className="payroll-bulk-step__title">
          <span className="payroll-bulk-step__num">1</span>
          Prepare your Excel file
        </h2>
        <p className="payroll-bulk-step__text">
          Download the RSSB-style template (.csv for now). Required: names, email, job title, start date, and monthly
          basic salary. Optional: RSSB number (for exports only — statutory deductions still apply without it), and
          ramaEnabled.
        </p>
        <div className="payroll-bulk-hints">
          <div>
            <strong>Required</strong>
            <span>firstName, lastName, email, jobTitle, startDate</span>
          </div>
          <div>
            <strong>Optional ID</strong>
            <span>clientId, phone, department</span>
          </div>
          <div>
            <strong>Salary</strong>
            <span>basicSalary (RWF)</span>
          </div>
          <div>
            <strong>Statutory</strong>
            <span>rssbNumber, ramaEnabled (true/false)</span>
          </div>
          <div>
            <strong>Bank</strong>
            <span>Add via employee profile after import</span>
          </div>
        </div>
        <button type="button" className="payroll-bulk-download" onClick={downloadTemplate}>
          Download RSSB template (.csv)
        </button>
      </section>

      <section className="payroll-finance-card payroll-bulk-step">
        <h2 className="payroll-bulk-step__title">
          <span className="payroll-bulk-step__num">2</span>
          Configure upload settings
        </h2>
        <div className="payroll-bulk-form-row">
          <label>
            Pay period
            <input
              type="month"
              className="payroll-finance-select"
              value={payPeriod}
              onChange={(e) => setPayPeriod(e.target.value)}
            />
          </label>
          <label>
            Pay frequency
            <select className="payroll-finance-select" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
              <option value="MONTHLY">Monthly</option>
              <option value="BI_MONTHLY">Bi-monthly</option>
              <option value="WEEKLY">Weekly</option>
            </select>
          </label>
        </div>
        <label className="payroll-bulk-check">
          <input type="checkbox" checked={includeRama} onChange={(e) => setIncludeRama(e.target.checked)} />
          Include RAMA insurance (7.5%) — applied when payroll is calculated for this period
        </label>
        <p className="payroll-bulk-step__note muted small">
          Period: {payPeriod} · {frequency.replace(/_/g, ' ').toLowerCase()}
          {includeRama ? ' · RAMA on' : ' · RAMA off'}
        </p>
      </section>

      <section className="payroll-finance-card payroll-bulk-step">
        <h2 className="payroll-bulk-step__title">
          <span className="payroll-bulk-step__num">3</span>
          Upload Excel file
        </h2>

        {result ? (
          <div className="payroll-bulk-result">
            <p className="payroll-bulk-result__ok">
              Import complete: <strong>{result.created}</strong> created, <strong>{result.skipped}</strong> skipped,{' '}
              <strong>{result.errors.length}</strong> errors.
            </p>
            {result.errors.length > 0 && (
              <ul className="payroll-bulk-result__errors">
                {result.errors.map((e, i) => (
                  <li key={i}>
                    Row {e.row}: {e.error}
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className="payroll-finance-btn payroll-finance-btn--primary" onClick={reset}>
              Import another file
            </button>
          </div>
        ) : (
          <form onSubmit={onImport}>
            <div className="payroll-bulk-drop">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="payroll-bulk-drop__input"
                onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
              />
              <p>{file ? file.name : 'Choose CSV file (Excel import coming soon)'}</p>
            </div>

            {file && preview && (
              <p className="payroll-bulk-preview-meta">
                <strong>{preview.length}</strong> valid row{preview.length === 1 ? '' : 's'}
                {skippedLines > 0 ? ` · ${skippedLines} skipped` : ''}
              </p>
            )}

            <button
              type="submit"
              className="payroll-bulk-submit"
              disabled={busy || !preview || preview.length === 0}
            >
              {busy ? 'Processing…' : 'Upload & process'}
            </button>
          </form>
        )}
      </section>
    </PayrollPageShell>
  );
}
