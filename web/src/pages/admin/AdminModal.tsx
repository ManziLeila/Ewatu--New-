import { type ReactNode, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';

type AdminModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AdminModal({ open, onClose, title, children, footer }: AdminModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-card adm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="modal-card__title" id={titleId}>
          {title}
        </h3>
        <div className="adm-modal__body">{children}</div>
        {footer ? <div className="adm-modal__footer">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
