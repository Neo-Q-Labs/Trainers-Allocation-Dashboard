/* RiskDistribution — three boxes (HIGH / MEDIUM / LOW) derived from
   the percent column on each pending slot. Click a box to drill into
   the pipeline filtered by that risk band. */
export default function RiskDistribution({ pending = {}, onPick }) {
  const slots = pending?.slots || [];
  let high = 0, med = 0, low = 0;
  for (const p of slots) {
    const pct = Number(p.percent) || 0;
    if (pct < 33) high += 1;
    else if (pct < 67) med += 1;
    else low += 1;
  }
  return (
    <div className="dash-card dash-risk">
      <div className="dash-card-head">
        <div className="dash-card-title">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
          RISK DISTRIBUTION
        </div>
      </div>
      <div className="dash-risk-grid">
        <button type="button" className="dash-risk-box dash-risk-high" onClick={() => onPick?.('high')}>
          <span className="dash-risk-num">{high}</span>
          <span className="dash-risk-lab">HIGH</span>
        </button>
        <button type="button" className="dash-risk-box dash-risk-med" onClick={() => onPick?.('med')}>
          <span className="dash-risk-num">{med}</span>
          <span className="dash-risk-lab">MEDIUM</span>
        </button>
        <button type="button" className="dash-risk-box dash-risk-low" onClick={() => onPick?.('low')}>
          <span className="dash-risk-num">{low}</span>
          <span className="dash-risk-lab">LOW</span>
        </button>
      </div>
    </div>
  );
}
