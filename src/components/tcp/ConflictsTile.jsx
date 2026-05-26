import Sparkline from './Sparkline.jsx';

/* ============================================================
   Tile D · Conflicts
   ------------------------------------------------------------
   Live count + a 7-day overlap-trend sparkline.
   Sparkline values are derived client-side from the conflicts
   list (each conflict has a date / window — group by day).
   Click → opens ConflictsModal.
   ============================================================ */
export default function ConflictsTile({ conflicts = [], onOpen }) {
  // Build trailing-7-day counts from conflict items.
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const buckets = Array.from({ length: 7 }, () => 0);

  for (const c of conflicts) {
    // Try a few common date fields
    const raw = c.date || c.start_date || c.first_date || c.day;
    if (!raw) continue;
    const t = Date.parse(raw);
    if (Number.isNaN(t)) continue;
    const daysAgo = Math.round((today - t) / 86400000);
    if (daysAgo >= 0 && daysAgo < 7) buckets[6 - daysAgo] += 1;
  }
  // If no per-day data could be inferred, show flat-line based on totals.
  const hasTrend = buckets.some((v) => v > 0);
  const series = hasTrend ? buckets : Array.from({ length: 7 }, () => conflicts.length);

  const count = conflicts.length;
  const tone = count >= 8 ? 'bad' : count >= 1 ? 'warn' : 'ok';

  return (
    <button type="button" className={`tcp-tile tcp-sm tcp-sm-${tone}`} onClick={onOpen}>
      <div className="tcp-tile-head">
        <span className="tcp-tile-label">CONFLICTS</span>
        <span className={`tcp-tile-pulse tcp-pulse-${tone}`} />
      </div>
      <div className="tcp-tile-num">{count}</div>
      <div className="tcp-tile-sparkline">
        <Sparkline
          values={series}
          width={160}
          height={36}
          stroke={tone === 'bad' ? 'var(--neon-red)' : tone === 'warn' ? 'var(--neon-yellow)' : 'var(--neon-green)'}
          fill={
            tone === 'bad'  ? 'rgba(239, 68, 68, 0.15)' :
            tone === 'warn' ? 'rgba(245, 158, 11, 0.15)' :
                              'rgba(16, 185, 129, 0.12)'
          }
          ariaLabel="7-day conflicts trend"
        />
      </div>
      <div className="tcp-tile-sub">
        {count === 0 ? 'All clear · 7-day window' : 'open · click to inspect'}
      </div>
    </button>
  );
}
