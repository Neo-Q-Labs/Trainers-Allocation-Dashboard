/* TrackCoverage — horizontal bars per skill track with a coverage %
   readout and filled/total counts. Sourced from /api/v1/kpis.track_coverages.
   Each bar is colour-graded by coverage ratio (red → yellow → green). */

const toneFor = (pct) => (pct >= 70 ? 'ok' : pct >= 40 ? 'mid' : 'low');

export default function TrackCoverage({ coverages = [] }) {
  const rows = (coverages || [])
    .filter((c) => c && c.track && c.track !== 'Other')
    .slice(0, 10);

  if (rows.length === 0) {
    return <div className="dash-empty">No track coverage data yet.</div>;
  }

  return (
    <div className="dash-card dash-cov">
      <div className="dash-card-head">
        <div className="dash-card-title">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2 2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          TRACK COVERAGE HEATMAP
        </div>
        <div className="dash-card-sub">Skill demand vs available trainer capacity</div>
      </div>
      <div className="dash-cov-list">
        {rows.map((c) => {
          const pct = Math.max(0, Math.min(100, Number(c.pct) || 0));
          const tone = toneFor(pct);
          return (
            <div key={c.track} className={`dash-cov-row dash-cov-${tone}`} title={`${c.track} — ${pct}% coverage`}>
              <span className="dash-cov-name">{c.track}</span>
              <span className="dash-cov-bar">
                <span className={`dash-cov-fill dash-cov-fill-${tone}`} style={{ width: `${pct}%` }} />
              </span>
              <span className="dash-cov-num">
                <strong>{c.pct}</strong>
                <span className="dash-cov-total">%</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
