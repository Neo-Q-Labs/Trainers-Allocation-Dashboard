import { useMemo } from 'react';

/* ============================================================
   Tile I · Trainer × 14-day Heatmap
   ------------------------------------------------------------
   Picks the 20 most-engaged trainers (by occupied days inside
   the active range) and renders a (trainer × next-14-day) grid
   colour-coded by allotment type. Cell click bubbles
   { trainer, date } so the orchestrator can open a scoped
   day-detail modal.
   ============================================================ */
const ROLE_COLORS = {
  free:    'rgba(16, 185, 129, 0.18)',
  trainer: 'rgba(3, 37, 189, 0.65)',
  ta:      'rgba(155, 92, 246, 0.55)',
  backup:  'rgba(251, 146, 60, 0.55)',
  leave:   'rgba(239, 68, 68, 0.45)',
};

const classify = (cell) => {
  const s = (cell || '').trim().toLowerCase();
  if (!s || s === 'not alloted' || s === 'not allocated' || s === 'na' || s === 'n/a') return 'free';
  if (s === 'exit' || s === 'exited' || s === 'left' || s === 'leave' || s === 'on leave') return 'leave';
  if (s.endsWith('-ta') || s.endsWith(' ta') || s.includes(' ta ') || s.includes('internal ta')) return 'ta';
  if (s.includes('backup') || s.includes('back up') || s.includes('back-up')) return 'backup';
  return 'trainer';
};

const FREE_SET = new Set(['', 'not alloted', 'not allocated', 'na', 'n/a']);

const toIso = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

export default function TrainerHeatmap({ trainers = [], onPickCell, skillFilter }) {
  const today = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => toIso(today), [today]);

  // Build the next-14 day axis (today + 13).
  const dates = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return { iso: toIso(d), label: d.getDate(), wd: d.toLocaleDateString('en-GB', { weekday: 'short' })[0] };
  }), [today]);

  // Rank by engagement count within the 14-day window.
  const ranked = useMemo(() => {
    const isoSet = new Set(dates.map((d) => d.iso));
    return (trainers || [])
      .filter((t) => t.type && t.type !== 'EXIT')
      .filter((t) => !skillFilter || !skillFilter.type || t.type === skillFilter.type)
      .map((t) => {
        const sched = t.schedule || {};
        let busy = 0;
        for (const iso of isoSet) {
          if (!FREE_SET.has((sched[iso] || '').trim().toLowerCase())) busy += 1;
        }
        return { t, busy };
      })
      .sort((a, b) => (b.busy - a.busy) || a.t.name.localeCompare(b.t.name))
      .slice(0, 20)
      .map((r) => r.t);
  }, [trainers, dates, skillFilter]);

  if (ranked.length === 0) {
    return <div className="tcp-empty-tile">No trainer activity to chart.</div>;
  }

  return (
    <div className="tcp-thm-wrap">
      <div className="tcp-thm-grid" style={{ gridTemplateColumns: `170px repeat(14, minmax(28px, 1fr))` }}>
        <div className="tcp-thm-corner">Trainer</div>
        {dates.map((d) => (
          <div key={d.iso} className={`tcp-thm-day-head${d.iso === todayIso ? ' is-today' : ''}`} title={d.iso}>
            <div className="tcp-thm-day-wd">{d.wd}</div>
            <div className="tcp-thm-day-num">{d.label}</div>
          </div>
        ))}
        {ranked.map((t) => {
          const sched = t.schedule || {};
          return (
            <div key={`${t.employee_id || ''}-${t.name}`} style={{ display: 'contents' }}>
              <div className="tcp-thm-row-head" title={t.name}>
                <span className="tcp-thm-row-name">{t.name}</span>
                <span className="tcp-thm-row-type">{t.type}</span>
              </div>
              {dates.map((d) => {
                const cell = sched[d.iso] || '';
                const kind = classify(cell);
                return (
                  <button
                    key={d.iso}
                    type="button"
                    className={`tcp-thm-cell is-${kind}${d.iso === todayIso ? ' is-today' : ''}`}
                    style={{ background: ROLE_COLORS[kind] }}
                    onClick={() => onPickCell?.({ trainer: t, date: d.iso, cell })}
                    title={`${t.name} · ${d.iso} · ${cell || 'Not alloted'}`}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="tcp-thm-legend">
        <span className="tcp-thm-leg"><span className="tcp-thm-swatch is-free" /> Free</span>
        <span className="tcp-thm-leg"><span className="tcp-thm-swatch is-trainer" /> Trainer</span>
        <span className="tcp-thm-leg"><span className="tcp-thm-swatch is-ta" /> TA</span>
        <span className="tcp-thm-leg"><span className="tcp-thm-swatch is-backup" /> Backup</span>
        <span className="tcp-thm-leg"><span className="tcp-thm-swatch is-leave" /> Leave/Exit</span>
      </div>
    </div>
  );
}
