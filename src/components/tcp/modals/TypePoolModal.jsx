import { useMemo, useState } from 'react';
import TcpModal from '../TcpModal.jsx';

/* TypePoolModal — roster list for a single trainer-type bucket. */

const TYPE_LABEL = {
  FT:         'Internal · Fulltime',
  SME:        'Internal · SME',
  WILP:       'Internal · WILP',
  FREELANCER: 'Freelancer',
};
const TYPE_COLOR = {
  FT:         'var(--neon-red)',
  SME:        'var(--neon-purple)',
  WILP:       'var(--wilp)',
  FREELANCER: 'var(--neon-yellow)',
};

const initials = (name) => (name || '?')
  .split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

export default function TypePoolModal({ type, trainers = [], onClose }) {
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    const filtered = trainers
      .filter((t) => t.type === type)
      .sort((a, b) => a.name.localeCompare(b.name));
    if (!q.trim()) return filtered;
    const needle = q.trim().toLowerCase();
    return filtered.filter((t) =>
      (t.name || '').toLowerCase().includes(needle) ||
      (t.employee_id || '').toLowerCase().includes(needle) ||
      (t.email || '').toLowerCase().includes(needle)
    );
  }, [trainers, type, q]);

  return (
    <TcpModal
      title={`${TYPE_LABEL[type] || type} roster`}
      sub={`${list.length} trainer${list.length === 1 ? '' : 's'}`}
      onClose={onClose}
      width={620}
    >
      <div className="tcp-modal-search">
        <input
          autoFocus
          placeholder="Search name, employee ID, or email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {list.length === 0 ? (
        <div className="tcp-modal-empty">No matches.</div>
      ) : (
        <div className="tcp-modal-roster">
          {list.map((t) => (
            <div key={`${t.employee_id || ''}-${t.name}`} className="tcp-modal-roster-row">
              <span className="tcp-modal-avatar" style={{ background: TYPE_COLOR[type] }}>
                {initials(t.name)}
              </span>
              <div className="tcp-modal-roster-body">
                <div className="tcp-modal-roster-name">{t.name}</div>
                <div className="tcp-modal-roster-meta">
                  {t.employee_id && <span className="mono">{t.employee_id}</span>}
                  {t.type_raw && <><span className="tcp-dot-sep">·</span><span>{t.type_raw}</span></>}
                  {t.email && <><span className="tcp-dot-sep">·</span><span>{t.email}</span></>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </TcpModal>
  );
}
