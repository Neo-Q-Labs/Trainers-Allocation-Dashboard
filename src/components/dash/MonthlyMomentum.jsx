import { useMemo, useState } from 'react';

/* ============================================================
   MonthlyMomentum — Delivery momentum stacked-column chart
   ------------------------------------------------------------
   Shows how delivery volume splits between Completed (history),
   Ongoing (this month), and Upcoming (planned) across the
   rolling 9-month window. Sourced from /api/v1/kpis →
   monthly_activity.

   Click a column → highlights that month + shows the per-state
   breakdown in the readout strip beneath the chart.
   ============================================================ */

const COLORS = {
  completed: '#22D3A5', // green
  ongoing:   '#0325BD', // accent blue
  upcoming:  '#F5C542', // yellow
};

export default function MonthlyMomentum({ months = [] }) {
  const [pick, setPick] = useState(null);

  const series = useMemo(() => {
    return (months || []).map((m) => ({
      ...m,
      ongoing:   Number(m.ongoing)   || 0,
      upcoming:  Number(m.upcoming)  || 0,
      completed: Number(m.completed) || 0,
      total:     Number(m.total) ||
        (Number(m.ongoing) || 0) + (Number(m.upcoming) || 0) + (Number(m.completed) || 0),
    }));
  }, [months]);

  if (!series.length) {
    return <div className="dash-empty">No delivery activity data yet.</div>;
  }

  const W = 460, H = 200;
  const PAD = { l: 30, r: 12, t: 18, b: 28 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const max = Math.max(1, ...series.map((m) => m.total));
  const step = innerW / series.length;
  const barW = Math.min(28, step * 0.65);
  const yFor = (v) => PAD.t + innerH - (v / max) * innerH;
  const xFor = (i) => PAD.l + i * step + step / 2;

  const ticks = [0, 0.5, 1].map((f) => ({
    y: PAD.t + innerH * (1 - f),
    v: Math.round(max * f),
  }));

  const active = pick != null ? series[pick] : null;
  const totalDeliv = series.reduce((s, m) => s + m.total, 0);

  return (
    <div className="dash-card dash-mm">
      <div className="dash-card-head">
        <div>
          <div className="dash-card-title">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            DELIVERY MOMENTUM · 9-MONTH TREND
          </div>
          <div className="dash-card-sub">
            <strong>{totalDeliv.toLocaleString()}</strong> trainer-days across {series.length} months
          </div>
        </div>
        <div className="dash-mm-legend">
          <span className="dash-mm-leg"><span className="dash-mm-dot" style={{ background: COLORS.completed }} /> COMPLETED</span>
          <span className="dash-mm-leg"><span className="dash-mm-dot" style={{ background: COLORS.ongoing }} /> ONGOING</span>
          <span className="dash-mm-leg"><span className="dash-mm-dot" style={{ background: COLORS.upcoming }} /> UPCOMING</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="dash-mm-svg" preserveAspectRatio="none">
        {/* gridlines */}
        {ticks.map((t, i) => (
          <g key={`t${i}`}>
            <line x1={PAD.l} x2={W - PAD.r} y1={t.y} y2={t.y} stroke="rgba(255,255,255,0.05)" strokeDasharray="2 4" />
            <text x={PAD.l - 6} y={t.y + 3} fill="rgba(154,160,188,0.7)" fontSize="9" textAnchor="end" fontFamily="JetBrains Mono, monospace">{t.v}</text>
          </g>
        ))}

        {/* bars */}
        {series.map((m, i) => {
          const cx = xFor(i);
          const x = cx - barW / 2;
          let cursorY = PAD.t + innerH;
          const segs = [];
          const layer = (val, color, key) => {
            if (!val) return;
            const h = (val / max) * innerH;
            cursorY -= h;
            segs.push({ x, y: cursorY, w: barW, h, color, key });
          };
          layer(m.completed, COLORS.completed, 'c');
          layer(m.ongoing,   COLORS.ongoing,   'o');
          layer(m.upcoming,  COLORS.upcoming,  'u');
          const isActive = pick === i;

          return (
            <g
              key={m.month}
              onClick={() => setPick((p) => (p === i ? null : i))}
              onMouseEnter={() => setPick(i)}
              onMouseLeave={() => setPick((p) => (p === i ? null : p))}
              style={{ cursor: 'pointer' }}
            >
              {segs.map((s) => (
                <rect
                  key={s.key}
                  x={s.x}
                  y={s.y}
                  width={s.w}
                  height={s.h}
                  fill={s.color}
                  rx="2"
                  opacity={pick == null ? 0.95 : isActive ? 1 : 0.45}
                />
              ))}
              {/* invisible full-height hit area to make hover reliable */}
              <rect x={cx - step / 2} y={PAD.t} width={step} height={innerH} fill="transparent" />
              <text
                x={cx}
                y={H - 10}
                textAnchor="middle"
                fontSize="9.5"
                fill={isActive ? 'var(--text-primary)' : 'rgba(154,160,188,0.85)'}
                fontFamily="JetBrains Mono, monospace"
                fontWeight={isActive ? 700 : 500}
              >
                {m.month}
              </text>
              {isActive && (
                <line x1={cx} x2={cx} y1={PAD.t} y2={PAD.t + innerH} stroke="rgba(255,255,255,0.3)" strokeDasharray="2 3" />
              )}
            </g>
          );
        })}
      </svg>

      {/* Readout strip — shows hovered month split */}
      <div className="dash-mm-readout">
        {active ? (
          <>
            <span className="dash-mm-readout-month">{active.month}</span>
            <span className="dash-mm-readout-stat" style={{ color: COLORS.completed }}>
              <strong>{active.completed.toLocaleString()}</strong> completed
            </span>
            <span className="dash-mm-readout-stat" style={{ color: COLORS.ongoing }}>
              <strong>{active.ongoing.toLocaleString()}</strong> ongoing
            </span>
            <span className="dash-mm-readout-stat" style={{ color: COLORS.upcoming }}>
              <strong>{active.upcoming.toLocaleString()}</strong> upcoming
            </span>
          </>
        ) : (
          <span className="dash-mm-hint">Hover or tap a column for the per-state breakdown</span>
        )}
      </div>
    </div>
  );
}
