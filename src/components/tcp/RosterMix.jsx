/* ============================================================
   Tile B · Roster Mix
   ------------------------------------------------------------
   Donut of the active roster split by trainer category. Each
   slice is clickable → orchestrator opens TypePoolModal for
   that category. Math lifted from the legacy RosterDonut in
   the old Overview, restyled inside the bento tile chrome.
   ============================================================ */
const CATEGORY_ORDER = ['FT', 'SME', 'WILP', 'FREELANCER'];
const TYPE_COLOR = {
  FT:         'var(--neon-red)',
  SME:        'var(--neon-purple)',
  WILP:       'var(--wilp)',
  FREELANCER: 'var(--neon-yellow)',
};

export default function RosterMix({ rosterByType = {}, onPickType }) {
  const total = CATEGORY_ORDER.reduce((s, c) => s + (rosterByType[c] || 0), 0);
  if (total === 0) {
    return <div className="tcp-empty-tile">No roster data yet.</div>;
  }

  const R = 52;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const arcs = CATEGORY_ORDER.map((c) => {
    const v = rosterByType[c] || 0;
    const frac = v / total;
    const arc = { c, v, len: C * frac, off: offset };
    offset += arc.len;
    return arc;
  });

  return (
    <div className="tcp-mix">
      <svg viewBox="0 0 130 130" className="tcp-mix-svg">
        <circle cx="65" cy="65" r={R} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="16" />
        {arcs.map((a) => (
          a.v > 0 ? (
            <circle
              key={a.c}
              cx="65" cy="65" r={R}
              fill="none"
              stroke={TYPE_COLOR[a.c]}
              strokeWidth="16"
              strokeDasharray={`${a.len} ${C - a.len}`}
              strokeDashoffset={-a.off}
              transform="rotate(-90 65 65)"
              style={{ cursor: 'pointer', filter: `drop-shadow(0 0 3px ${TYPE_COLOR[a.c]})` }}
              onClick={() => onPickType?.(a.c)}
            >
              <title>{`${a.c} — ${a.v} (${((a.v / total) * 100).toFixed(0)}%) · click for details`}</title>
            </circle>
          ) : null
        ))}
        <text x="65" y="63" textAnchor="middle" fill="var(--text-primary)" fontSize="22" fontWeight="800" fontFamily="var(--mono)">
          {total}
        </text>
        <text x="65" y="80" textAnchor="middle" fill="var(--text-muted)" fontSize="8.5" letterSpacing="2">
          ACTIVE
        </text>
      </svg>
      <div className="tcp-mix-legend">
        {arcs.map((a) => {
          const pct = ((a.v / total) * 100).toFixed(0);
          return (
            <button
              key={a.c}
              type="button"
              className="tcp-mix-row"
              style={{ '--cat-color': TYPE_COLOR[a.c] }}
              onClick={() => onPickType?.(a.c)}
              title={`Open ${a.c} roster`}
            >
              <span className="tcp-mix-swatch" />
              <span className="tcp-mix-name">{a.c}</span>
              <span className="tcp-mix-count">{a.v}</span>
              <span className="tcp-mix-pct">{pct}%</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
