import { type FormEvent, useEffect, useState } from 'react';
import type { TenantRow } from '../../api';
import { AdminModal } from './AdminModal';

const PLAN_OPTIONS = ['starter', 'professional', 'enterprise', 'custom'] as const;

type TenantEditDialogProps = {
  tenant: TenantRow | null;
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onSave: (id: string, body: { name: string; plan: string; country: string }) => void | Promise<void>;
};

export function TenantEditDialog({ tenant, open, busy, onClose, onSave }: TenantEditDialogProps) {
  const [name, setName] = useState('');
  const [plan, setPlan] = useState<string>('starter');
  const [country, setCountry] = useState('RW');
  const [localErr, setLocalErr] = useState<string | null>(null);

  useEffect(() => {
    if (!tenant || !open) return;
    setName(tenant.name);
    setPlan(tenant.plan ?? 'starter');
    setCountry(tenant.country ?? 'RW');
    setLocalErr(null);
  }, [tenant, open]);

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault();
    if (!tenant) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setLocalErr('Company name is required.');
      return;
    }
    if (country.trim().length !== 2) {
      setLocalErr('Country must be a 2-letter code (e.g. RW).');
      return;
    }
    setLocalErr(null);
    void onSave(tenant.id, {
      name: trimmed,
      plan,
      country: country.trim().toUpperCase(),
    });
  };

  return (
    <AdminModal
      open={open && Boolean(tenant)}
      onClose={onClose}
      title="Edit company"
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="tenant-edit-form" className="btn btn--primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </>
      }
    >
      {tenant ? (
        <form id="tenant-edit-form" className="form adm-modal__form" onSubmit={onSubmit}>
          <p className="muted small" style={{ marginTop: 0 }}>
            Slug <code>{tenant.slug}</code> cannot be changed here.
          </p>
          {localErr && (
            <div className="alert alert--err" role="alert">
              {localErr}
            </div>
          )}
          <label>
            Company name
            <input className="auth-input" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Plan
            <select className="auth-input" value={plan} onChange={(e) => setPlan(e.target.value)}>
              {PLAN_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label>
            Country
            <input
              className="auth-input"
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase())}
              maxLength={2}
              required
            />
          </label>
        </form>
      ) : null}
    </AdminModal>
  );
}
