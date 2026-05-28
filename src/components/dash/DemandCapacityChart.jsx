import { useMemo, useState } from 'react';

/* ============================================================
   DemandCapacityChart — smooth stacked-area capacity timeline
   ------------------------------------------------------------
   Replaces the previous stacked-bar approach with a flowing,
   layered area chart. Three series (Internal · Freelancer · TA)
   are rendered as smoothed cubic areas, stacked from bottom to
   top, with a high-contrast capacity line floating above.

   Data shape (unchanged):
     { date, d, m, i, f, t, capI, capF }
   ============================================================ */

const COLORS = {
  internal:   '#22D3A5',
  freelancer: '#0325BD',
  ta:         '#9AA0BC',
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

/* Smooth cubic path through a list of [x, y] points. */
function smoothPath(pts) {
  if (!pts.length) return '';
  let p = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    p += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  return p;
}

/* Build a stacked area for one series given a baseline + top values. */
function stackedAreaPath(xs, topVals, baseVals) {
  if (!xs.length) return '';
  const top = xs.map((x, i) => [x, topVals[i]]);
  const bot = xs.map((x, i) => [x, baseVals[i]]).reverse();
  const topPath = smoothPath(top);
  const botPath = smoothPath(bot).replace(/^M/, 'L');
  return `${topPath} ${botPath} Z`;
}

export default function DemandCapacityChart({ data = [], onPickDay }) {
  const [hover, setHover] = useState(null);

  const W = 980;
  const H = 240;
  const PAD = { l: 36, r: 14, t: 22, b: 30 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const series = useMemo(() => (data || []).map((d) => ({
    ...d,
    total: (d.i || 0) + (d.f || 0) + (d.t || 0),
    cap:   (d.capI || 0) + (d.capF || 0),
  })), [data]);

  if (!series.length) {
    return <div className="dash-chart-empty">Capacity timeline data unavailable.</div>;
  }

  const maxY = Math.max(1, ...series.map((d) => Math.max(d.total, d.cap)));
  const step = innerW / Math.max(1, series.length - 1);
  const xFor = (i) => PAD.l + i * step;
  const yFor = (v) => PAD.t + innerH - (v / maxY) * innerH;

  // Stacked baselines (cumulative).
  const xs       = series.map((_, i) => xFor(i));
  const baseI    = series.map(() => 0);
  const topI     = series.map((d) => d.i || 0);
  const baseF    = series.map((d) => d.i || 0);
  const topF     = series.map((d) => (d.i || 0) + (d.f || 0));
  const baseT    = series.map((d) => (d.i || 0) + (d.f || 0));
  const topT     = series.map((d) => (d.i || 0) + (d.f || 0) + (d.t || 0));

  const yArrI = topI.map(yFor);
  const yArrF = topF.map(yFor);
  const yArrT = topT.map(yFor);
  const yArrBaseline = baseI.map(yFor);

  const areaI = stackedAreaPath(xs, yArrI, yArrBaseline);
  const areaF = stackedAreaPath(xs, yArrF, yArrI);
  const areaT = stackedAreaPath(xs, yArrT, yArrF);

  // Capacity line.
  const capPath = smoothPath(series.map((d, i) => [xFor(i), yFor(d.cap)]));

  // Y-axis ticks (0 / mid / max).
  const ticks = [0, 0.5, 1].map((f) => ({
    y: PAD.t + innerH * (1 - f),
    v: Math.round(maxY * f),
  }));

  // X-axis labels — ~6 evenly spaced + every month boundary.
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
        <defs>
          <linearGradient id="dch-grad-i" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.internal} stopOpacity="0.55" />
            <stop offset="100%" stopColor={COLORS.internal} stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="dch-grad-f" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.freelancer} stopOpacity="0.55" />
            <stop offset="100%" stopColor={COLORS.freelancer} stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="dch-grad-t" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.ta} stopOpacity="0.45" />
            <stop offset="100%" stopColor={COLORS.ta} stopOpacity="0.04" />
          </linearGradient>
        </defs>

        {/* gridlines + y labels */}
        {ticks.map((t, i) => (
          <g key={`t${i}`}>
            <line x1={PAD.l} x2={W - PAD.r} y1={t.y} y2={t.y} stroke="rgba(255,255,255,0.05)" strokeDasharray="2 4" />
            <text x={PAD.l - 8} y={t.y + 3} fill="rgba(154,160,188,0.75)" fontSize="9.5" textAnchor="end" fontFamily="JetBrains Mono, monospace">{t.v}</text>
          </g>
        ))}

        {/* stacked areas (bottom up) */}
        <path d={areaI} fill="url(#dch-grad-i)" stroke={COLORS.internal}   strokeWidth="1.4" strokeOpacity="0.9" />
        <path d={areaF} fill="url(#dch-grad-f)" stroke={COLORS.freelancer} strokeWidth="1.4" strokeOpacity="0.9" />
        <path d={areaT} fill="url(#dch-grad-t)" stroke={COLORS.ta}         strokeWidth="1.4" strokeOpacity="0.9" />

        {/* capacity line */}
        <path d={capPath} fill="none" stroke={COLORS.capacity} strokeWidth="2" strokeLinecap="round" strokeDasharray="6 4" opacity="0.85" />

        {/* hover bands — full-height transparent rect per index */}
        {series.map((d, i) => {
          const bandX = i === 0 ? PAD.l : (xs[i] + xs[i - 1]) / 2;
          const bandRight = i === series.length - 1 ? W - PAD.r : (xs[i] + xs[i + 1]) / 2;
          const isHover = hover === i;
          return (
            <g
              key={d.date}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover((h) => (h === i ? null : h))}
              onClick={() => onPickDay?.(d.date)}
              style={{ cursor: onPickDay ? 'pointer' : 'default' }}
            >
              <rect x={bandX} y={PAD.t} width={Math.max(1, bandRight - bandX)} height={innerH} fill={isHover ? 'rgba(255,255,255,0.04)' : 'transparent'} />
              {isHover && (
                <line x1={xs[i]} x2={xs[i]} y1={PAD.t} y2={PAD.t + innerH} stroke="rgba(255,255,255,0.35)" strokeDasharray="2 3" />
              )}
              {isHover && (
                <>
                  <circle cx={xs[i]} cy={yArrI[i]} r="3.2" fill={COLORS.internal}   stroke="#0B0D12" strokeWidth="1.3" />
                  <circle cx={xs[i]} cy={yArrF[i]} r="3.2" fill={COLORS.freelancer} stroke="#0B0D12" strokeWidth="1.3" />
                  <circle cx={xs[i]} cy={yArrT[i]} r="3.2" fill={COLORS.ta}         stroke="#0B0D12" strokeWidth="1.3" />
                  <circle cx={xs[i]} cy={yFor(d.cap)} r="3.5" fill={COLORS.capacity} stroke="#0B0D12" strokeWidth="1.3" />
                </>
              )}
            </g>
          );
        })}

        {/* X-axis labels */}
        {labelIndexes.map((i) => (
          <text
            key={`x${i}`}
            x={xs[i]}
            y={H - 10}
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
