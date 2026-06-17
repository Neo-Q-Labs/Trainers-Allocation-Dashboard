import { useMemo } from 'react';
import TcpModal from '../TcpModal.jsx';

/* DayDetailModal
   ------------------------------------------------------------
   Shows all allocations for a single ISO date — taken from
   `date-blocking days[]`. If `scopedTrainer` is supplied (the
   Trainer Heatmap drill-down), only that trainer's row is
   rendered; otherwise the full occupied + available list. */

const TYPE_COLOR = {
  FT:         'var(--neon-red)',
  SME:        'var(--neon-purple)',
  WILP:       'var(--wilp)',
  FREELANCER: 'var(--neon-yellow)',
};

export default function DayDetailModal({ date, days = [], scopedTrainer, onClose }) {
  const day = useMemo(() => days.find((d) => d.date === date), [days, date]);

  if (!day) {
    return (
      <TcpModal title="Day details" onClose={onClose} width={620}>
        <div className="tcp-modal-empty">No data for {date}.</div>
      </TcpModal>
    );
  }

  const occupied = day.occupied || [];
  const available = day.available || [];

  const filtered = scopedTrainer
    ? occupied.filter((p) => p.name?.toLowerCase() === scopedTrainer.name?.toLowerCase())
    : occupied;

  const title = scopedTrainer
    ? `${scopedTrainer.name} · ${day.label}`
    : day.label || date;
  const sub = scopedTrainer
    ? `Scoped to one trainer · ${date}`
    : `${occupied.length} occupied · ${available.length} available`;

  return (
    <TcpModal title={title} sub={sub} onClose={onClose} width={780}>
      {filtered.length === 0 ? (
        <div className="tcp-modal-empty">
          {scopedTrainer ? `${scopedTrainer.name} is free on this day.` : 'No occupied trainers on this day.'}
        </div>
      ) : (
        <table className="tcp-modal-table">
          <thead>
            <tr>
              <th>Trainer</th>
              <th>Role</th>
              <th>Client</th>
              <th>Assignment</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr key={`${p.name}-${i}`}>
                <td>
                  <div className="tcp-name-cell">
                    <span className="tcp-type-dot" style={{ background: TYPE_COLOR[p.type] || 'var(--text-muted)' }} />
                    <span>{p.name}</span>
                  </div>
                </td>
                <td>
                  <span className={`tcp-chip tcp-chip-${(p.role || 'trainer').toLowerCase()}`}>{p.role || 'Trainer'}</span>
                </td>
                <td>{p.client || <span className="tcp-muted">—</span>}</td>
                <td className="mono">{p.course || p.cell || <span className="tcp-muted">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!scopedTrainer && available.length > 0 && (
        <>
          <div className="tcp-modal-section-head">Available trainers · {available.length}</div>
          <div className="tcp-pill-grid">
            {available.slice(0, 60).map((p, i) => (
              <span key={`${p.name}-${i}`} className="tcp-avail-pill" style={{ '--cat-color': TYPE_COLOR[p.type] }}>
                <span className="tcp-avail-dot" />
                {p.name}
                <span className="tcp-avail-type">{p.type}</span>
              </span>
            ))}
            {available.length > 60 && (
              <span className="tcp-avail-more">+ {available.length - 60} more…</span>
            )}
          </div>
        </>
      )}
    </TcpModal>
  );
}
