import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { TenantRow } from '../../api';
import { AdminConfirmDialog } from './AdminConfirmDialog';
import { TenantEditDialog } from './TenantEditDialog';
import { TenantPermanentDeleteDialog } from './TenantPermanentDeleteDialog';
import { TenantRejectDialog } from './TenantRejectDialog';

type Props = {
  tenant: TenantRow;
  busyId?: string | null;
  compact?: boolean;
  onApprove: (id: string) => void | Promise<void>;
  onReject: (id: string, reason?: string) => void | Promise<void>;
  onSuspend: (id: string) => void | Promise<void>;
  onReactivate: (id: string) => void | Promise<void>;
  onArchive: (id: string) => void | Promise<void>;
  onPurgePermanent: (id: string, confirmSlug: string) => void | Promise<void>;
  onEditSave: (id: string, body: { name: string; plan: string; country: string }) => void | Promise<void>;
};

export function TenantCrudActions({
  tenant: t,
  busyId,
  compact,
  onApprove,
  onReject,
  onSuspend,
  onReactivate,
  onArchive,
  onPurgePermanent,
  onEditSave,
}: Props) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const busy = busyId === t.id;
  const canPurge = t.status === 'ARCHIVED' || t.status === 'REJECTED';
  const canArchive = t.status !== 'ARCHIVED';

  const closeReject = () => {
    setRejectOpen(false);
    setRejectReason('');
  };

  return (
    <>
      <div className={`admin__actions${compact ? ' admin__actions--row' : ''}`}>
        {!compact && (
          <Link to="/platform/tenants" className="btn btn--ghost small">
            Directory
          </Link>
        )}
        {t.status !== 'ARCHIVED' && (
          <button type="button" className="btn btn--ghost small" disabled={busy} onClick={() => setEditOpen(true)}>
            Edit
          </button>
        )}
        {t.status === 'PENDING_ACTIVATION' && (
          <>
            <button type="button" className="btn btn--primary small" disabled={busy} onClick={() => onApprove(t.id)}>
              {busy ? '…' : 'Approve'}
            </button>
            <button type="button" className="btn small" disabled={busy} onClick={() => setRejectOpen(true)}>
              Reject
            </button>
          </>
        )}
        {(t.status === 'ACTIVE' || t.status === 'TRIAL') && (
          <button type="button" className="btn small" disabled={busy} onClick={() => onSuspend(t.id)}>
            Suspend
          </button>
        )}
        {t.status === 'SUSPENDED' && (
          <button type="button" className="btn btn--primary small" disabled={busy} onClick={() => onReactivate(t.id)}>
            Activate
          </button>
        )}
        {canArchive && (
          <button type="button" className="btn small" disabled={busy} onClick={() => setArchiveOpen(true)}>
            Archive
          </button>
        )}
        {canPurge && (
          <button type="button" className="btn btn--danger small" disabled={busy} onClick={() => setPurgeOpen(true)}>
            Delete permanently
          </button>
        )}
      </div>

      <AdminConfirmDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        title="Archive company?"
        confirmLabel="Archive"
        description={
          <>
            Archive <strong>{t.name}</strong>? Users lose access, but data stays in the system. You can{' '}
            <strong>Delete permanently</strong> afterward to wipe all data.
          </>
        }
        busy={busy}
        onConfirm={async () => {
          await onArchive(t.id);
          setArchiveOpen(false);
        }}
      />

      <TenantPermanentDeleteDialog
        tenant={t}
        open={purgeOpen}
        busy={busy}
        onClose={() => setPurgeOpen(false)}
        onConfirm={async (confirmSlug) => {
          await onPurgePermanent(t.id, confirmSlug);
          setPurgeOpen(false);
        }}
      />

      <TenantRejectDialog
        open={rejectOpen}
        companyName={t.name}
        reason={rejectReason}
        busy={busy}
        onReasonChange={setRejectReason}
        onClose={closeReject}
        onConfirm={async () => {
          await onReject(t.id, rejectReason.trim() || undefined);
          closeReject();
        }}
      />

      <TenantEditDialog
        tenant={t}
        open={editOpen}
        busy={busy}
        onClose={() => setEditOpen(false)}
        onSave={async (id, body) => {
          await onEditSave(id, body);
          setEditOpen(false);
        }}
      />
    </>
  );
}
