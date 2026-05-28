import { useEffect, useState } from 'react';

/* ============================================================
   Notify — top-center fallback notification
   ------------------------------------------------------------
   Lightweight global notification used when a user action falls
   through gracefully (e.g. clicking a programme whose Delivery
   ID has no matching request-track row). Listens for a custom
   `app-notify` event so any page can fire one via:

     window.notify('Title', 'Body text', 'warn')

   The styled box sits at top-center, auto-dismisses after 5s,
   and stacks if multiple messages arrive within that window.
   ============================================================ */

let _id = 0;

export default function Notify() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const handler = (e) => {
      const { title = '', body = '', type = 'info', ttl = 5000 } = e.detail || {};
      const id = ++_id;
      setItems((prev) => [...prev, { id, title, body, type }]);
      setTimeout(() => {
        setItems((prev) => prev.filter((it) => it.id !== id));
      }, ttl);
    };
    window.addEventListener('app-notify', handler);
    // Expose a tiny imperative API too — same payload shape.
    window.notify = (title, body, type = 'info', ttl) =>
      window.dispatchEvent(new CustomEvent('app-notify', { detail: { title, body, type, ttl } }));
    return () => window.removeEventListener('app-notify', handler);
  }, []);

  if (!items.length) return null;
  return (
    <div className="notify-stack" role="status" aria-live="polite">
      {items.map((it) => (
        <div key={it.id} className={`notify notify-${it.type}`}>
          <span className="notify-icon" aria-hidden="true">
            {it.type === 'err'  && <Icon name="x" />}
            {it.type === 'warn' && <Icon name="warn" />}
            {it.type === 'ok'   && <Icon name="check" />}
            {it.type === 'info' && <Icon name="info" />}
          </span>
          <div className="notify-text">
            {it.title && <div className="notify-title">{it.title}</div>}
            {it.body  && <div className="notify-body">{it.body}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function Icon({ name }) {
  const stroke = 'currentColor';
  if (name === 'check') return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
  if (name === 'warn') return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
  if (name === 'x') return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}
