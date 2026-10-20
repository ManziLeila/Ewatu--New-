import { type FormEvent, useCallback, useEffect, useState } from 'react';
import {
  createPayrollConfig,
  fetchPayrollConfig,
  updatePayrollConfig,
} from '../../payrollApi';

const RWANDA_DEFAULTS = {
  payDay: 28,
  currency: 'RWF',
  payeEnabled: true,
  rssbPensionEmployee: 0.05,
  rssbPensionEmployer: 0.05,
  rssbMedical: 0.075,
  cbhiRate: 0.005,
  maternityLevy: 0.003,
  occupationalHazardRate: 0.02,
};

export function PayrollConfigPage() {
  const [clientId, setClientId] = useState('');
  const [loadedClientId, setLoadedClientId] = useState<string | null>(null);
  const [form, setForm] = useState(RWANDA_DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);

  const load = useCallback(async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      const data = (await fetchPayrollConfig(id.trim())) as Record<string, unknown>;
      setLoadedClientId(id.trim());
      setIsNew(false);
      setForm({
        payDay: Number(data.payDay ?? RWANDA_DEFAULTS.payDay),
        currency: String(data.currency ?? RWANDA_DEFAULTS.currency),
        payeEnabled: Boolean(data.payeEnabled ?? RWANDA_DEFAULTS.payeEnabled),
        rssbPensionEmployee: Number(data.rssbPensionEmployee ?? RWANDA_DEFAULTS.rssbPensionEmployee),
        rssbPensionEmployer: Number(data.rssbPensionEmployer ?? RWANDA_DEFAULTS.rssbPensionEmployer),
        rssbMedical: Number(data.rssbMedical ?? RWANDA_DEFAULTS.rssbMedical),
        cbhiRate: Number(data.cbhiRate ?? RWANDA_DEFAULTS.cbhiRate),
        maternityLevy: Number(data.maternityLevy ?? RWANDA_DEFAULTS.maternityLevy),
        occupationalHazardRate: Number(data.occupationalHazardRate ?? RWANDA_DEFAULTS.occupationalHazardRate),
      });
    } catch (e) {
      setLoadedClientId(null);
      setIsNew(true);
      setForm(RWANDA_DEFAULTS);
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (clientId.trim()) load(clientId);
  }, [clientId, load]);

  const onSave = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!clientId.trim()) {
      setErr('Client ID is required.');
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    const body = {
      clientId: clientId.trim(),
      payDay: form.payDay,
      currency: form.currency,
      payeEnabled: form.payeEnabled,
      rssbPensionEmployee: form.rssbPensionEmployee,
      rssbPensionEmployer: form.rssbPensionEmployer,
      rssbMedical: form.rssbMedical,
      cbhiRate: form.cbhiRate,
      maternityLevy: form.maternityLevy,
      occupationalHazardRate: form.occupationalHazardRate,
    };
    try {
      if (isNew || loadedClientId !== clientId.trim()) {
        await createPayrollConfig(body);
      } else {
        await updatePayrollConfig(clientId.trim(), body);
      }
      setLoadedClientId(clientId.trim());
      setIsNew(false);
      setMsg('Configuration saved.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rec-page">
      <h1 className="rec-page__title">Payroll configuration</h1>
      <p className="rec-page__sub">Per-client Rwanda statutory rates and pay settings</p>
      {err && <div className="alert alert--err">{err}</div>}
      {msg && <div className="alert alert--ok">{msg}</div>}

      <form className="card rec-form-card" onSubmit={onSave}>
        <div className="rec-form__grid">
          <label className="rec-form__label rec-form__label--full">
            Client ID <span className="rec-form__req">*</span>
            <input
              className="auth-input"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="client-001"
              required
            />
          </label>
        </div>

        {loading ? (
          <p className="muted">Loading configuration…</p>
        ) : clientId.trim() ? (
          <>
            <div className="rec-form__grid">
              <label className="rec-form__label">
                Currency
                <input
                  className="auth-input"
                  value={form.currency}
                  onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
                />
              </label>
              <label className="rec-form__label">
                Pay day (day of month)
                <input
                  className="auth-input"
                  type="number"
                  min={1}
                  max={31}
                  value={form.payDay}
                  onChange={(e) => setForm((p) => ({ ...p, payDay: Number(e.target.value) }))}
                />
              </label>
              <label className="rec-form__label">
                PAYE enabled
                <select
                  className="auth-input"
                  value={form.payeEnabled ? 'true' : 'false'}
                  onChange={(e) => setForm((p) => ({ ...p, payeEnabled: e.target.value === 'true' }))}
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </label>
              <label className="rec-form__label">
                RSSB pension — employee (5%)
                <input
                  className="auth-input"
                  type="number"
                  step="0.0001"
                  value={form.rssbPensionEmployee}
                  onChange={(e) => setForm((p) => ({ ...p, rssbPensionEmployee: Number(e.target.value) }))}
                />
              </label>
              <label className="rec-form__label">
                RSSB pension — employer (5%)
                <input
                  className="auth-input"
                  type="number"
                  step="0.0001"
                  value={form.rssbPensionEmployer}
                  onChange={(e) => setForm((p) => ({ ...p, rssbPensionEmployer: Number(e.target.value) }))}
                />
              </label>
              <label className="rec-form__label">
                RSSB medical (7.5%)
                <input
                  className="auth-input"
                  type="number"
                  step="0.0001"
                  value={form.rssbMedical}
                  onChange={(e) => setForm((p) => ({ ...p, rssbMedical: Number(e.target.value) }))}
                />
              </label>
              <label className="rec-form__label">
                CBHI (0.5%)
                <input
                  className="auth-input"
                  type="number"
                  step="0.0001"
                  value={form.cbhiRate}
                  onChange={(e) => setForm((p) => ({ ...p, cbhiRate: Number(e.target.value) }))}
                />
              </label>
              <label className="rec-form__label">
                Maternity levy — employer (0.3%)
                <input
                  className="auth-input"
                  type="number"
                  step="0.0001"
                  value={form.maternityLevy}
                  onChange={(e) => setForm((p) => ({ ...p, maternityLevy: Number(e.target.value) }))}
                />
              </label>
              <label className="rec-form__label">
                Occupational hazard — employer (2%)
                <input
                  className="auth-input"
                  type="number"
                  step="0.0001"
                  value={form.occupationalHazardRate}
                  onChange={(e) => setForm((p) => ({ ...p, occupationalHazardRate: Number(e.target.value) }))}
                />
              </label>
            </div>
            <div className="rec-form__actions">
              <button className="btn btn--primary" type="submit" disabled={busy}>
                {busy ? 'Saving…' : isNew ? 'Create configuration' : 'Save changes'}
              </button>
            </div>
          </>
        ) : (
          <p className="muted">Enter a client ID to load or create payroll configuration.</p>
        )}
      </form>
    </div>
  );
}
