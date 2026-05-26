import { useMemo, useState } from 'react';

/* ============================================================
   DemandCapacityChart — Hero analytical chart (compact rebuild)
   ------------------------------------------------------------
   Stacked bars per day (Internal · Freelancer · TA) overlaid
   with a smooth available-capacity line. Data shape from
   /api/v1/kpis → demand_vs_capacity[] :
     { date, d, m, i, f, t, capI, capF }

   Compared to the first cut:
     • Shorter chart (220px vs 360px) to reclaim vertical space
     • Persistent readout strip below the chart (no floating
       tooltip that disappears under other elements)
     • X-axis shows "1 Jun" instead of bare day numbers + month
       only on month boundaries — much more scannable
     • Click a day → bubbles up via onPickDay
   ============================================================ */

const COLORS = {
  internal:   '#22D3A5',
  freelancer: '#A855F7',
  ta:         '#06B6D4',
  capacity:   '#EF4444',
};

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const labelForDate = (iso, prevIso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return '';
  const monthName = MONTHS_SHORT[m - 1];
  if (!prevIso) return `${d} ${monthName}`;
  const prevMonth = Number(prevIso.split('-')[1]);
  return prevMonth !== m ? `${d} ${monthName}` : `${d}`;
};

export default function DemandCapacityChart({ data = [], onPickDay }) {
  const [hover, setHover] = useState(null);

  const W = 980;
  const H = 220;
  const PAD = { l: 34, r: 14, t: 18, b: 28 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const series = useMemo(() => {
    return (data || []).map((d) => ({
      ...d,
      total: (d.i || 0) + (d.f || 0) + (d.t || 0),
      cap:   (d.capI || 0) + (d.capF || 0),
    }));
  }, [data]);

  if (!series.length) {
    return <div className="dash-chart-empty">Capacity timeline data unavailable.</div>;
  }

  const maxY = Math.max(1, ...series.map((d) => Math.max(d.total, d.cap)));
  const step = innerW / series.length;
  const barW = Math.max(8, step * 0.62);
  const yFor = (v) => PAD.t + innerH - (v / maxY) * innerH;
  const xFor = (i) => PAD.l + i * step + step / 2;

  // Capacity line — smooth cubic curve.
  const linePts = series.map((d, i) => [xFor(i), yFor(d.cap)]);
  const linePath = (() => {
    if (linePts.length === 0) return '';
    let p = `M${linePts[0][0]},${linePts[0][1]}`;
    for (let i = 1; i < linePts.length; i++) {
      const [x0, y0] = linePts[i - 1];
      const [x1, y1] = linePts[i];
      const cx = (x0 + x1) / 2;
      p += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
    }
    return p;
  })();

  // Y-axis ticks (0 / mid / max)
  const ticks = [0, 0.5, 1].map((f) => ({
    y: PAD.t + innerH * (1 - f),
    v: Math.round(maxY * f),
  }));

  // X-axis labels — pick ~6 evenly spaced points + always include the first
  // day of any month. Keeps the axis scannable without overlap.
  const labelIndexes = useMemo(() => {
    const set = new Set();
    const idealCount = 8;
    const everyN = Math.max(1, Math.ceil(series.length / idealCount));
    for (let i = 0; i < series.length; i += everyN) set.add(i);
    series.forEach((d, i) => { if (d.d === 1) set.add(i); });
    if (series.length > 0) set.add(series.length - 1);
    return Array.from(set).sort((a, b) => a - b);
  }, [series]);

  const totalDemand = series.reduce((s, d) => s + d.total, 0);
  const totalCapacity = series.reduce((s, d) => s + d.cap, 0);
  const peak = series.reduce((best, d) => (d.total > (best?.total ?? -1) ? d : best), null);

  const active = hover != null ? series[hover] : null;

  return (
    <div className="dash-chart-wrap">
      <div className="dash-chart-meta">
        <div className="dash-chart-legend">
          <span className="dash-leg"><span className="dash-leg-dot" style={{ background: COLORS.internal }} /> INTERNAL</span>
          <span className="dash-leg"><span className="dash-leg-dot" style={{ background: COLORS.freelancer }} /> FREELANCER</span>
          <span className="dash-leg"><span className="dash-leg-dot" style={{ background: COLORS.ta }} /> TA</span>
          <span className="dash-leg"><span className="dash-leg-line" style={{ background: COLORS.capacity }} /> CAPACITY</span>
        </div>
        <div className="dash-chart-totals">
          <span className="dash-chart-tot">Total demand <strong>{totalDemand.toLocaleString()}</strong></span>
          <span className="dash-chart-tot">Capacity ceiling <strong>{totalCapacity.toLocaleString()}</strong></span>
          {peak && <span className="dash-chart-tot">Peak day <strong>{peak.d} {peak.m} · {peak.total}</strong></span>}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="dash-chart-svg" preserveAspectRatio="none">
        {/* gridlines + y labels */}
        {ticks.map((t, i) => (
          <g key={`t${i}`}>
            <line x1={PAD.l} x2={W - PAD.r} y1={t.y} y2={t.y} stroke="rgba(255,255,255,0.05)" strokeDasharray="2 4" />
            <text x={PAD.l - 6} y={t.y + 3} fill="rgba(154,160,188,0.75)" fontSize="9" textAnchor="end" fontFamily="JetBrains Mono, monospace">{t.v}</text>
          </g>
        ))}

        {/* stacked bars + hit bands */}
        {series.map((d, i) => {
          const cx = xFor(i);
          const x = cx - barW / 2;
          let cursorY = PAD.t + innerH;
          const segs = [];
          const layer = (val, color, key) => {
            if (!val) return;
            const h = (val / maxY) * innerH;
            cursorY -= h;
            segs.push({ x, y: cursorY, w: barW, h, color, key });
          };
          layer(d.i, COLORS.internal, 'i');
          layer(d.f, COLORS.freelancer, 'f');
          layer(d.t, COLORS.ta, 't');
          const isHover = hover === i;

          return (
            <g
              key={d.date}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover((h) => (h === i ? null : h))}
              onClick={() => onPickDay?.(d.date)}
              style={{ cursor: onPickDay ? 'pointer' : 'default' }}
            >
              {/* full-height hit band — easier to hover than thin bars */}
              <rect x={cx - step / 2} y={PAD.t} width={step} height={innerH} fill={isHover ? 'rgba(255,255,255,0.025)' : 'transparent'} />
              {segs.map((s) => (
                <rect key={s.key} x={s.x} y={s.y} width={s.w} height={s.h} fill={s.color} rx="2" opacity={isHover ? 1 : 0.92} />
              ))}
              {isHover && (
                <line x1={cx} x2={cx} y1={PAD.t} y2={PAD.t + innerH} stroke="rgba(255,255,255,0.35)" strokeDasharray="2 3" />
              )}
            </g>
          );
        })}

        {/* capacity line on top */}
        <path d={linePath} fill="none" stroke={COLORS.capacity} strokeWidth="2" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 3px ${COLORS.capacity})` }} />
        {hover != null && (
          <circle cx={xFor(hover)} cy={yFor(series[hover].cap)} r={4} fill={COLORS.capacity} />
        )}

        {/* X-axis labels — selective, "1 Jun" on month boundaries, "5" otherwise */}
        {labelIndexes.map((i) => (
          <text
            key={`x${i}`}
            x={xFor(i)}
            y={H - 8}
            fontSize="10"
            fill={hover === i ? 'var(--text-primary)' : 'rgba(154,160,188,0.85)'}
            textAnchor="middle"
            fontFamily="JetBrains Mono, monospace"
            fontWeight={hover === i ? 700 : 500}
          >
            {labelForDate(series[i].date, i > 0 ? series[i - 1].date : null)}
          </text>
        ))}
      </svg>

      {/* Persistent readout strip — replaces the floating tooltip so the
          stats are always visible whether or not the mouse is on the chart */}
      <div className={`dash-chart-readout${active ? ' is-active' : ''}`}>
        {active ? (
          <>
            <span className="dash-readout-day">{active.d} {active.m}</span>
            <span className="dash-readout-stat" style={{ color: COLORS.internal }}>
              <span className="dash-readout-dot" style={{ background: COLORS.internal }} />
              Internal <strong>{active.i ?? 0}</strong>
            </span>
            <span className="dash-readout-stat" style={{ color: COLORS.freelancer }}>
              <span className="dash-readout-dot" style={{ background: COLORS.freelancer }} />
              Freelancer <strong>{active.f ?? 0}</strong>
            </span>
            <span className="dash-readout-stat" style={{ color: COLORS.ta }}>
              <span className="dash-readout-dot" style={{ background: COLORS.ta }} />
              TA <strong>{active.t ?? 0}</strong>
            </span>
            <span className="dash-readout-stat" style={{ color: COLORS.capacity }}>
              <span className="dash-readout-dot" style={{ background: COLORS.capacity }} />
              Capacity <strong>{active.cap ?? 0}</strong>
            </span>
            <span className="dash-readout-spent">
              Util <strong>{active.cap ? Math.round((active.total / active.cap) * 100) : 0}%</strong>
            </span>
            {onPickDay && <span className="dash-readout-hint">Click to inspect</span>}
          </>
        ) : (
          <span className="dash-readout-hint">Hover any day to see the breakdown</span>
        )}
      </div>
    </div>
  );
}
