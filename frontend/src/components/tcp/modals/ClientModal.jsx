import { useMemo } from 'react';
import TcpModal from '../TcpModal.jsx';

/* ClientModal — drill-down for a single client. Lists the
   client's deliveries within the active date range and the
   distinct trainers assigned to them. */

const TYPE_COLOR = {
  FT:         'var(--neon-red)',
  SME:        'var(--neon-purple)',
  WILP:       'var(--wilp)',
  FREELANCER: 'var(--neon-yellow)',
};

export default function ClientModal({ client, days = [], deliveries = [], onClose }) {
  const summary = useMemo(() => {
    if (!client) return { totalDays: 0, trainers: [], programmes: [] };
    const trainerCounts = new Map();
    const programmes = new Map();
    let totalDays = 0;
    for (const d of days || []) {
      for (const o of (d.occupied || [])) {
        if ((o.client || '').toLowerCase() !== client.toLowerCase()) continue;
        totalDays += 1;
        const key = o.name;
        if (!trainerCounts.has(key)) trainerCounts.set(key, { name: o.name, type: o.type, days: 0, courses: new Set() });
        const e = trainerCounts.get(key);
        e.days += 1;
        if (o.course) e.courses.add(o.course);
        const pkey = o.course || o.cell || '—';
        if (!programmes.has(pkey)) programmes.set(pkey, { course: pkey, days: 0, trainers: new Set() });
        const p = programmes.get(pkey);
        p.days += 1;
        if (o.name) p.trainers.add(o.name);
      }
    }
    return {
      totalDays,
      trainers: Array.from(trainerCounts.values()).sort((a, b) => b.days - a.days),
      programmes: Array.from(programmes.values()).sort((a, b) => b.days - a.days),
    };
  }, [client, days]);

  // Mention deliveries record for context, if the master list has rows for this client.
  const knownDeliveries = useMemo(() => {
    if (!client) return [];
    const arr = Array.isArray(deliveries) ? deliveries : (deliveries?.deliveries || []);
    return arr.filter((d) => (d.client || d.client_name || '').toLowerCase() === client.toLowerCase()).slice(0, 8);
  }, [client, deliveries]);

  return (
    <TcpModal
      title={client || 'Client'}
      sub={`${summary.totalDays} trainer-day${summary.totalDays === 1 ? '' : 's'} in the active range`}
      onClose={onClose}
      width={840}
    >
      {summary.programmes.length === 0 ? (
        <div className="tcp-modal-empty">No engagements for this client in the current range.</div>
      ) : (
        <>
          <div className="tcp-modal-section-head">Programmes</div>
          <ul className="tcp-prog-list">
            {summary.programmes.slice(0, 12).map((p, i) => (
              <li key={i} className="tcp-prog-row">
                <span className="tcp-prog-course">{p.course}</span>
                <span className="tcp-prog-meta">
                  <strong>{p.days}</strong> day{p.days === 1 ? '' : 's'} · {p.trainers.size} trainer{p.trainers.size === 1 ? '' : 's'}
                </span>
              </li>
            ))}
          </ul>

          <div className="tcp-modal-section-head">Trainers</div>
          <div className="tcp-modal-roster">
            {summary.trainers.slice(0, 20).map((t) => (
              <div key={t.name} className="tcp-modal-roster-row">
                <span className="tcp-type-dot" style={{ background: TYPE_COLOR[t.type] || 'var(--text-muted)' }} />
                <div className="tcp-modal-roster-body">
                  <div className="tcp-modal-roster-name">{t.name}</div>
                  <div className="tcp-modal-roster-meta">
                    <strong>{t.days}</strong> day{t.days === 1 ? '' : 's'}
                    <span className="tcp-dot-sep">·</span>
                    <span>{[...t.courses].slice(0, 3).join(' · ') || t.type}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {knownDeliveries.length > 0 && (
            <>
              <div className="tcp-modal-section-head">Known deliveries</div>
              <ul className="tcp-prog-list">
                {knownDeliveries.map((d, i) => (
                  <li key={i} className="tcp-prog-row">
                    <span className="tcp-prog-course">{d.course || d.delivery || d.delivery_id || '—'}</span>
                    <span className="tcp-prog-meta">
                      {d.start_date || d.start || ''}{d.end_date ? ` → ${d.end_date}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </TcpModal>
  );
}
