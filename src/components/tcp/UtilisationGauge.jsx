/* ============================================================
   Tile C · Today's Utilisation Gauge
   ------------------------------------------------------------
   Single arc, 270° sweep, showing today's utilisation %.
   Target band (70-85%) drawn behind as a subtle marker.
   Clicking scrolls to the Trainer Heatmap (no modal).
   ============================================================ */
export default function UtilisationGauge({ pct = 0, deployed = 0, total = 0, onClick }) {
  const safePct = Math.max(0, Math.min(100, pct));
  // Tone: under-util (low) blue, sweet-spot green, over-util red
  const tone = safePct >= 90 ? 'over' : safePct >= 70 ? 'good' : safePct >= 40 ? 'mid' : 'low';
  const stroke =
    tone === 'over' ? 'var(--neon-red)'    :
    tone === 'good' ? 'var(--neon-green)'  :
    tone === 'mid'  ? 'var(--neon-yellow)' :
                      'var(--cyan)';

  // 270° arc; start at -135°, end at +135°
  const R = 56;
  const CX = 75, CY = 80;
  const SWEEP = 270;
  const C = (2 * Math.PI * R) * (SWEEP / 360);

  const polar = (deg) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [CX + R * Math.cos(rad), CY + R * Math.sin(rad)];
  };
  const [sx, sy] = polar(225);   // -135 normalised
  const [ex, ey] = polar(135);    // +135 normalised

  // Target band: 70%-85% — drawn underneath in a muted hue
  const bandFrom = 0.70, bandTo = 0.85;
  const bandLen = (bandTo - bandFrom) * C;
  const bandOff = bandFrom * C;
  // Active arc length
  const valLen = (safePct / 100) * C;

  return (
    <button type="button" className={`tcp-gauge tcp-gauge-${tone}`} onClick={onClick} title="Scroll to trainer heatmap">
      <svg viewBox="0 0 150 150" className="tcp-gauge-svg">
        {/* outer track */}
        <path
          d={`M${sx},${sy} A${R},${R} 0 1 1 ${ex},${ey}`}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="11"
          strokeLinecap="round"
        />
        {/* target band */}
        <path
          d={`M${sx},${sy} A${R},${R} 0 1 1 ${ex},${ey}`}
          fill="none"
          stroke="rgba(16, 185, 129, 0.18)"
          strokeWidth="11"
          strokeLinecap="butt"
          strokeDasharray={`0 ${bandOff} ${bandLen} ${C}`}
        />
        {/* value arc */}
        <path
          d={`M${sx},${sy} A${R},${R} 0 1 1 ${ex},${ey}`}
          fill="none"
          stroke={stroke}
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={`${valLen} ${C}`}
          style={{ filter: `drop-shadow(0 0 5px ${stroke})` }}
        />
        {/* center text */}
        <text x={CX} y={CY - 4} textAnchor="middle" fontSize="32" fontWeight="800" fill="var(--text-primary)" fontFamily="var(--mono)">
          {Math.round(safePct)}%
        </text>
        <text x={CX} y={CY + 14} textAnchor="middle" fontSize="9" letterSpacing="2" fill="var(--text-muted)">
          UTILISED
        </text>
      </svg>
      <div className="tcp-gauge-foot">
        <span className="tcp-gauge-stat">
          <strong>{deployed}</strong> on ground
        </span>
        <span className="tcp-gauge-sep">·</span>
        <span className="tcp-gauge-stat">
          <strong>{total}</strong> roster
        </span>
      </div>
    </button>
  );
}
