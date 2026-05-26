import { useEffect } from 'react';

/* ============================================================
   TcpModal — shared modal chrome for the Trainer Capacity
   Planner detail drill-downs. X close lives top-right inside
   the header (matches the .db-detail-panel pattern). Closes on
   Escape and on backdrop click.
   ============================================================ */
export default function TcpModal({ title, sub, onClose, width = 720, children, footer }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    // Lock body scroll while a modal is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="tcp-modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      role="dialog"
      aria-modal="true"
    >
      <div className="tcp-modal" style={{ width: `min(${width}px, calc(100vw - 48px))` }}>
        <header className="tcp-modal-head">
          <div className="tcp-modal-title-block">
            <div className="tcp-modal-title">{title}</div>
            {sub && <div className="tcp-modal-sub">{sub}</div>}
          </div>
          <button
            type="button"
            className="tcp-modal-close"
            onClick={onClose}
            aria-label="Close"
            title="Close (Esc)"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>
        <div className="tcp-modal-body">{children}</div>
        {footer && <div className="tcp-modal-foot">{footer}</div>}
      </div>
    </div>
  );
}
