import { useMemo, useState } from 'react';

/* ============================================================
   Tile A · Capacity Stream
   ------------------------------------------------------------
   Stacked-area SVG over the committed date range:
     • Deployed (red)
     • TAs (purple)
     • Backups (orange)
     • Free (teal)
   Each day is also a tall transparent hit-band — clicking
   bubbles `(iso)` up to the parent so the orchestrator can
   open the DayDetailModal.
   ============================================================ */
export default function CapacityStream({ days = [], onPickDay, skillFilter }) {
  const W = 1000;       // intrinsic width (SVG scales)
  const H = 220;
  const PAD = { l: 36, r: 12, t: 14, b: 22 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const [hover, setHover] = useState(null); // index | null

  const data = useMemo(() => days.map((d) => {
    const free    = d.available_total ?? 0;
    const deployed = d.deployed ?? 0;
    const tas     = d.tas ?? 0;
    const backups = d.backups ?? 0;
    return { iso: d.date, label: d.label, free, deployed, tas, backups,
             total: free + deployed + tas + backups };
  }), [days]);

  const maxTotal = useMemo(() => Math.max(1, ...data.map((d) => d.total)), [data]);

  if (!data.length) {
    return <div className="tcp-empty-tile">No date-blocking data for this range.</div>;
  }

  const step = data.length > 1 ? innerW / (data.length - 1) : 0;
  const yFor = (v) => PAD.t + innerH - (v / maxTotal) * innerH;
  const xFor = (i) => PAD.l + i * step;

  // Build stacked layer polygons bottom→up: deployed → tas → backups → free
  const layers = [
    { key: 'deployed', stroke: 'var(--neon-red)',    fill: 'rgba(239, 68, 68, 0.55)' },
    { key: 'tas',      stroke: 'var(--neon-purple)', fill: 'rgba(155, 92, 246, 0.55)' },
    { key: 'backups',  stroke: 'var(--neon-orange)', fill: 'rgba(251, 146, 60, 0.55)' },
    { key: 'free',     stroke: 'var(--neon-green)',  fill: 'rgba(16, 185, 129, 0.40)' },
  ];

  let cum = data.map(() => 0);
  const paths = layers.map((l) => {
    const top = data.map((d, i) => {
      const next = cum[i] + (d[l.key] || 0);
      return { x: xFor(i), y: yFor(next), prev: yFor(cum[i]) };
    });
    cum = data.map((d, i) => cum[i] + (d[l.key] || 0));
    // Forward over the top, backward along the previous bottom
    const fwd = top.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');
    const bwd = top.slice().reverse().map((p) => `L${p.x},${p.prev}`).join(' ');
    return { ...l, d: `${fwd} ${bwd} Z`, topLine: top.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') };
  });

  // Y-axis ticks
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: PAD.t + innerH * (1 - f),
    v: Math.round(maxTotal * f),
  }));

  // X-axis labels — show ~6 labels max so it stays readable
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));

  return (
    <div className="tcp-stream-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="tcp-stream-svg" preserveAspectRatio="none">
        {/* gridlines */}
        {ticks.map((t, i) => (
          <g key={`t${i}`}>
            <line x1={PAD.l} x2={W - PAD.r} y1={t.y} y2={t.y} stroke="rgba(255,255,255,0.05)" strokeDasharray="2 4" />
            <text x={PAD.l - 6} y={t.y + 3} fill="var(--text-muted)" fontSize="9" textAnchor="end" fontFamily="var(--mono)">{t.v}</text>
          </g>
        ))}
        {/* stacked areas */}
        {paths.map((l) => (
          <g key={l.key}>
            <path d={l.d} fill={l.fill} stroke="none" />
            <path d={l.topLine} fill="none" stroke={l.stroke} strokeWidth="1.2" strokeOpacity="0.7" />
          </g>
        ))}
        {/* hit bands — one transparent rect per day, captures hover + click */}
        {data.map((d, i) => {
          const cx = xFor(i);
          const bandW = step || 6;
          return (
            <rect
              key={d.iso}
              x={cx - bandW / 2}
              y={PAD.t}
              width={bandW}
              height={innerH}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover((h) => (h === i ? null : h))}
              onClick={() => onPickDay?.(d.iso)}
            />
          );
        })}
        {/* hover marker */}
        {hover != null && (
          <line
            x1={xFor(hover)} x2={xFor(hover)} y1={PAD.t} y2={PAD.t + innerH}
            stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="2 3"
          />
        )}
        {/* X labels */}
        {data.map((d, i) => (
          i % labelEvery === 0 ? (
            <text key={`x${i}`} x={xFor(i)} y={H - 6} fontSize="9.5" fill="var(--text-muted)" textAnchor="middle" fontFamily="var(--mono)">
              {d.label.replace(',', '')}
            </text>
          ) : null
        ))}
      </svg>

      {/* legend + hover tooltip card */}
      <div className="tcp-stream-foot">
        <div className="tcp-stream-legend">
          {layers.map((l) => (
            <span key={l.key} className="tcp-leg-item">
              <span className="tcp-leg-swatch" style={{ background: l.stroke }} />
              {l.key.charAt(0).toUpperCase() + l.key.slice(1)}
            </span>
          ))}
        </div>
        {hover != null && (() => {
          const d = data[hover];
          return (
            <div className="tcp-stream-tooltip">
              <span className="tcp-tt-day">{d.label}</span>
              <span className="tcp-tt-stat" style={{ color: 'var(--neon-green)' }}>Free {d.free}</span>
              <span className="tcp-tt-stat" style={{ color: 'var(--neon-red)' }}>Deployed {d.deployed}</span>
              <span className="tcp-tt-stat" style={{ color: 'var(--neon-purple)' }}>TAs {d.tas}</span>
              <span className="tcp-tt-stat" style={{ color: 'var(--neon-orange)' }}>Backups {d.backups}</span>
              <span className="tcp-tt-hint">Click for details</span>
            </div>
          );
        })()}
      </div>
      {skillFilter && (
        <div className="tcp-stream-filter-note">
          Filtered by <strong>{skillFilter.skill}</strong> · {skillFilter.type}
        </div>
      )}
    </div>
  );
}
