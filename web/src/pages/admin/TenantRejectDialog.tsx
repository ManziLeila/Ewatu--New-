import { AdminModal } from './AdminModal';

type TenantRejectDialogProps = {
  open: boolean;
  companyName: string;
  reason: string;
  busy?: boolean;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export function TenantRejectDialog({
  open,
  companyName,
  reason,
  busy,
  onReasonChange,
  onClose,
  onConfirm,
}: TenantRejectDialogProps) {
  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title="Reject registration"
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn--danger" disabled={busy} onClick={() => void onConfirm()}>
            {busy ? 'Rejecting…' : 'Reject company'}
          </button>
        </>
      }
    >
      <p className="adm-modal__lead">
        Reject <strong>{companyName}</strong>? The applicant can be notified by email with your reason below.
      </p>
      <label className="adm-modal__field">
        Reason (optional)
        <textarea
          className="auth-input"
          rows={3}
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="Brief explanation for the applicant…"
        />
      </label>
    </AdminModal>
  );
}
