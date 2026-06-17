import { useMemo, useState } from 'react';
import TcpModal from '../TcpModal.jsx';

/* GapModal — pending allocations from /pending-allocations,
   sorted by urgency (days_to_start asc, then gap desc). */

const URGENCY_TONE = { urgent: 'bad', warn: 'warn', soon: 'warn', planned: 'ok' };

export default function GapModal({ pending = {}, onClose }) {
  const [q, setQ] = useState('');

  const slots = useMemo(() => {
    const list = pending?.slots || [];
    const sorted = [...list].sort((a, b) => {
      const ad = Number.isFinite(a.days_to_start) ? a.days_to_start : 9999;
      const bd = Number.isFinite(b.days_to_start) ? b.days_to_start : 9999;
      return ad - bd || (b.gap || 0) - (a.gap || 0);
    });
    if (!q.trim()) return sorted;
    const needle = q.trim().toLowerCase();
    return sorted.filter((s) =>
      (s.client || s.client_name || '').toLowerCase().includes(needle) ||
      (s.course || s.delivery || '').toLowerCase().includes(needle) ||
      (s.delivery_id || '').toLowerCase().includes(needle)
    );
  }, [pending, q]);

  return (
    <TcpModal
      title="Open gap · pending allocations"
      sub={`${slots.length} requirement${slots.length === 1 ? '' : 's'} with unfilled trainer slots`}
      onClose={onClose}
      width={840}
    >
      <div className="tcp-modal-search">
        <input
          autoFocus
          placeholder="Search client, course, or delivery ID…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {slots.length === 0 ? (
        <div className="tcp-modal-empty">No open gaps. Everything is staffed.</div>
      ) : (
        <table className="tcp-modal-table">
          <thead>
            <tr>
              <th>Delivery</th>
              <th>Client</th>
              <th>Course</th>
              <th>Start</th>
              <th>Gap</th>
              <th>Urgency</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((s, i) => {
              const tone = URGENCY_TONE[s.urgency] || 'warn';
              const days = Number.isFinite(s.days_to_start) ? s.days_to_start : null;
              return (
                <tr key={`${s.delivery_id}-${i}`}>
                  <td className="mono">{s.delivery_id || '—'}</td>
                  <td>{s.client || s.client_name || <span className="tcp-muted">—</span>}</td>
                  <td>{s.course || s.delivery || <span className="tcp-muted">—</span>}</td>
                  <td className="mono">{s.start_date || s.start || '—'}</td>
                  <td className="mono"><strong>{s.gap ?? '—'}</strong></td>
                  <td>
                    <span className={`tcp-chip tcp-chip-${tone}`}>
                      {s.urgency || 'pending'}{days != null ? ` · ${days}d` : ''}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </TcpModal>
  );
}
