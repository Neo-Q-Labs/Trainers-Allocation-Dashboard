import Sparkline from './Sparkline.jsx';

/* ============================================================
   Tile E · Open Gap (pending allocations)
   ------------------------------------------------------------
   Live total of unfilled trainer slots across pending
   requirements + a 14-day cumulative trend.
   Click → opens GapModal.
   ============================================================ */
export default function OpenGapTile({ pending = {}, onOpen }) {
  const slots = pending.slots || [];
  // Headline = number of pending requirements (rows). Total unfilled
  // trainer-days lives in the sub-line so the tile stays scannable.
  const openCount = slots.length;
  const trainerDayGap = slots.reduce((s, p) => s + (Number(p.gap) || 0), 0);

  // Build a 14-day urgency-skewed trend: slots starting sooner pile up the curve.
  const series = Array.from({ length: 14 }, () => 0);
  for (const p of slots) {
    const d = Number(p.days_to_start);
    if (!Number.isFinite(d)) continue;
    if (d < 0) series[0] += 1;
    else if (d < 14) series[d] += 1;
  }
  const hasTrend = series.some((v) => v > 0);
  const filled = hasTrend
    ? series.map((_, i, a) => a.slice(0, i + 1).reduce((s, v) => s + v, 0))
    : Array.from({ length: 14 }, () => openCount);

  const tone = openCount >= 10 ? 'bad' : openCount >= 3 ? 'warn' : 'ok';

  return (
    <button type="button" className={`tcp-tile tcp-sm tcp-sm-${tone}`} onClick={onOpen}>
      <div className="tcp-tile-head">
        <span className="tcp-tile-label">OPEN GAP</span>
        <span className={`tcp-tile-pulse tcp-pulse-${tone}`} />
      </div>
      <div className="tcp-tile-num">{openCount}</div>
      <div className="tcp-tile-sparkline">
        <Sparkline
          values={filled}
          width={160}
          height={36}
          stroke={tone === 'bad' ? 'var(--neon-red)' : tone === 'warn' ? 'var(--neon-yellow)' : 'var(--neon-green)'}
          fill={
            tone === 'bad'  ? 'rgba(239, 68, 68, 0.15)' :
            tone === 'warn' ? 'rgba(245, 158, 11, 0.15)' :
                              'rgba(16, 185, 129, 0.12)'
          }
          ariaLabel="14-day cumulative gap trend"
        />
      </div>
      <div className="tcp-tile-sub">
        {trainerDayGap.toLocaleString()} trainer-day{trainerDayGap === 1 ? '' : 's'} unfilled
      </div>
    </button>
  );
}
