import { useMemo, useState } from 'react';
import TcpModal from '../TcpModal.jsx';

/* ConflictsModal — full list of open conflicts, severity-sorted. */

const SEVERITY_TONE = { high: 'bad', critical: 'bad', medium: 'warn', low: 'ok', mild: 'ok' };

export default function ConflictsModal({ conflicts = [], onClose }) {
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    const items = (conflicts || []).map((c) => ({
      trainer: c.trainer || c.name || c.trainer_name || '',
      date:    c.date || c.start_date || c.first_date || c.day || '',
      severity: (c.severity || c.level || '').toLowerCase(),
      summary: c.description || c.summary || c.message || c.detail || '',
      raw: c,
    }));
    // Sort: severity bucket first (bad → warn → ok), then date asc.
    const bucket = (s) => (SEVERITY_TONE[s] === 'bad' ? 0 : SEVERITY_TONE[s] === 'warn' ? 1 : 2);
    items.sort((a, b) => bucket(a.severity) - bucket(b.severity) || String(a.date).localeCompare(String(b.date)));
    if (!q.trim()) return items;
    const needle = q.trim().toLowerCase();
    return items.filter((i) =>
      i.trainer.toLowerCase().includes(needle) ||
      i.summary.toLowerCase().includes(needle) ||
      String(i.date).toLowerCase().includes(needle)
    );
  }, [conflicts, q]);

  return (
    <TcpModal
      title="Open conflicts"
      sub={`${list.length} unresolved · sorted by severity`}
      onClose={onClose}
      width={760}
    >
      <div className="tcp-modal-search">
        <input
          autoFocus
          placeholder="Search trainer, date or summary…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {list.length === 0 ? (
        <div className="tcp-modal-empty">No open conflicts. 🎉</div>
      ) : (
        <ul className="tcp-modal-feed">
          {list.map((c, i) => {
            const tone = SEVERITY_TONE[c.severity] || 'warn';
            return (
              <li key={i} className={`tcp-feed-row tcp-feed-${tone}`}>
                <span className={`tcp-feed-dot tcp-dot-${tone}`} />
                <div className="tcp-feed-body">
                  <div className="tcp-feed-line">
                    <span className="tcp-feed-trainer">{c.trainer || 'Unattributed'}</span>
                    {c.date && <span className="tcp-feed-date mono">{String(c.date).slice(0, 10)}</span>}
                    {c.severity && <span className={`tcp-chip tcp-chip-${tone}`}>{c.severity.toUpperCase()}</span>}
                  </div>
                  {c.summary && <div className="tcp-feed-sub">{c.summary}</div>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </TcpModal>
  );
}
