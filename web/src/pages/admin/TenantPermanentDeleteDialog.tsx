import { useEffect, useState } from 'react';
import type { TenantRow } from '../../api';
import { AdminModal } from './AdminModal';

type Props = {
  tenant: TenantRow | null;
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (confirmSlug: string) => void | Promise<void>;
};

export function TenantPermanentDeleteDialog({ tenant, open, busy, onClose, onConfirm }: Props) {
  const [slug, setSlug] = useState('');
  const [localErr, setLocalErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSlug('');
      setLocalErr(null);
    }
  }, [open, tenant?.id]);

  const submit = () => {
    if (!tenant) return;
    if (slug.trim().toLowerCase() !== tenant.slug) {
      setLocalErr(`Type the slug exactly: ${tenant.slug}`);
      return;
    }
    setLocalErr(null);
    void onConfirm(tenant.slug);
  };

  return (
    <AdminModal
      open={open && Boolean(tenant)}
      onClose={onClose}
      title="Permanently delete company?"
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn--danger" disabled={busy || !slug.trim()} onClick={submit}>
            {busy ? 'Deleting…' : 'Delete permanently'}
          </button>
        </>
      }
    >
      {tenant ? (
        <>
          <p className="adm-modal__lead">
            This removes <strong>{tenant.name}</strong> and all related data across E-Watu (users, HR,
            payroll, recruitment, files). <strong>This cannot be undone.</strong>
          </p>
          <p className="muted small" style={{ margin: '0.75rem 0 0' }}>
            Type <code>{tenant.slug}</code> to confirm:
          </p>
          {localErr && (
            <div className="alert alert--err" role="alert" style={{ marginTop: '0.75rem' }}>
              {localErr}
            </div>
          )}
          <input
            className="auth-input"
            style={{ marginTop: '0.5rem', width: '100%' }}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder={tenant.slug}
            autoComplete="off"
          />
        </>
      ) : null}
    </AdminModal>
  );
}
