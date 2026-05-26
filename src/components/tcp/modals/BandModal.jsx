import { useMemo, useState } from 'react';
import TcpModal from '../TcpModal.jsx';

/* BandModal — trainers grouped in a utilisation band. The
   members array is computed by the UtilHistogram tile and
   handed in via the payload, so the modal stays a thin view. */

const TYPE_COLOR = {
  FT:         'var(--neon-red)',
  SME:        'var(--neon-purple)',
  WILP:       'var(--wilp)',
  FREELANCER: 'var(--neon-yellow)',
};

const initials = (name) => (name || '?')
  .split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

export default function BandModal({ band, onClose }) {
  const [q, setQ] = useState('');
  const members = band?.members || [];

  const list = useMemo(() => {
    if (!q.trim()) return members;
    const needle = q.trim().toLowerCase();
    return members.filter((m) =>
      (m.name || '').toLowerCase().includes(needle) ||
      (m.employee_id || '').toLowerCase().includes(needle)
    );
  }, [members, q]);

  return (
    <TcpModal
      title={`Utilisation · ${band?.label || '—'}`}
      sub={`${list.length} trainer${list.length === 1 ? '' : 's'} in this band`}
      onClose={onClose}
      width={640}
    >
      <div className="tcp-modal-search">
        <input
          autoFocus
          placeholder="Search name or employee ID…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {list.length === 0 ? (
        <div className="tcp-modal-empty">No trainers in this band.</div>
      ) : (
        <div className="tcp-modal-roster">
          {list.map((m) => (
            <div key={`${m.employee_id || ''}-${m.name}`} className="tcp-modal-roster-row">
              <span className="tcp-modal-avatar" style={{ background: TYPE_COLOR[m.type] || 'var(--text-muted)' }}>
                {initials(m.name)}
              </span>
              <div className="tcp-modal-roster-body">
                <div className="tcp-modal-roster-name">{m.name}</div>
                <div className="tcp-modal-roster-meta">
                  {m.employee_id && <span className="mono">{m.employee_id}</span>}
                  {m.type && <><span className="tcp-dot-sep">·</span><span>{m.type_raw || m.type}</span></>}
                </div>
              </div>
              <span className="tcp-modal-util-num">{m.util}%</span>
            </div>
          ))}
        </div>
      )}
    </TcpModal>
  );
}
