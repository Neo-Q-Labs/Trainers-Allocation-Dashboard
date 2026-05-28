import { useMemo } from 'react';

/* ============================================================
   Tile H · Utilisation Histogram
   ------------------------------------------------------------
   Buckets the active roster by % of days in the committed
   range that they are occupied (vs free). Five bands. Click a
   bar → BandModal listing trainers in that band.
   ============================================================ */
const BANDS = [
  { id: 'idle',  label: '0%',      lo: 0,    hi: 0.001, tone: 'low' },
  { id: 'low',   label: '1-25%',   lo: 0.001, hi: 0.25,  tone: 'low' },
  { id: 'mid',   label: '26-50%',  lo: 0.25,  hi: 0.5,   tone: 'mid' },
  { id: 'high',  label: '51-75%',  lo: 0.5,   hi: 0.75,  tone: 'good' },
  { id: 'over',  label: '76-100%', lo: 0.75,  hi: 1.01,  tone: 'over' },
];

export function bucketUtilisation(trainers, days) {
  // Returns map { bandId: [{ name, employee_id, type, util }] }
  const isoSet = new Set((days || []).map((d) => d.date));
  const totalDays = isoSet.size;
  if (!totalDays) return { counts: BANDS.map(() => 0), members: {} };

  const members = Object.fromEntries(BANDS.map((b) => [b.id, []]));
  const FREE = new Set(['', 'not alloted', 'not allocated', 'na', 'n/a']);

  for (const t of trainers || []) {
    if (!t.type || t.type === 'EXIT') continue;
    const sched = t.schedule || {};
    let occupied = 0;
    for (const iso of isoSet) {
      const cell = (sched[iso] || '').trim().toLowerCase();
      if (!FREE.has(cell)) occupied += 1;
    }
    const util = occupied / totalDays;
    const band = BANDS.find((b) => util >= b.lo && util < b.hi) || BANDS[BANDS.length - 1];
    members[band.id].push({
      name: t.name,
      employee_id: t.employee_id,
      type: t.type,
      type_raw: t.type_raw,
      util: Math.round(util * 100),
    });
  }
  // Sort each band by descending utilisation, then name.
  for (const k of Object.keys(members)) {
    members[k].sort((a, b) => (b.util - a.util) || a.name.localeCompare(b.name));
  }
  const counts = BANDS.map((b) => members[b.id].length);
  return { counts, members };
}

export default function UtilHistogram({ trainers = [], days = [], onPickBand }) {
  const { counts, members } = useMemo(() => bucketUtilisation(trainers, days), [trainers, days]);
  const max = Math.max(1, ...counts);

  if (counts.every((c) => c === 0)) {
    return <div className="tcp-empty-tile">No utilisation data.</div>;
  }

  return (
    <div className="tcp-hist">
      <div className="tcp-hist-bars">
        {BANDS.map((b, i) => {
          const v = counts[i];
          const pct = (v / max) * 100;
          return (
            <button
              key={b.id}
              type="button"
              className={`tcp-hist-col tcp-hist-${b.tone}`}
              onClick={() => onPickBand?.({ id: b.id, label: b.label, members: members[b.id] })}
              title={`${v} trainer${v === 1 ? '' : 's'} at ${b.label} utilisation · click for list`}
            >
              <span className="tcp-hist-num">{v}</span>
              <span className="tcp-hist-bar" style={{ height: `${pct}%` }} />
              <span className="tcp-hist-lab">{b.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
